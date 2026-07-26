import json
import subprocess
from pathlib import Path

from agent.qa_agent import QAAgent
from agent.playwright_tools import PlaywrightSession
from database.ht_agents import create_agent_run, update_agent_run
from database.ht_flows import (
    db,
    get_generated_recipe_by_flow_id,
    get_flow_by_id,
    get_secrets_for_flow,
    load_flow_events,
    resolve_secrets,
)
from database.ht_postgres import AgentRunStatus


def run_qa_check(flow_id: str, triggered_by: str = "manual") -> dict:
    """
    Load the stored recipe for a flow and run the QA agent against it.
    Saves the run result to AgentRunTable.
    Returns the run report dict.
    """

    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow:
            raise FileNotFoundError(f"Flow {flow_id} not found")

        recipe_row = get_generated_recipe_by_flow_id(session, flow_id)
        #retrieve the agent recipie.

        if not recipe_row:
            raise FileNotFoundError(f"No generated recipe found for flow {flow_id}. Analyze the flow first.")

        recipe = json.loads(recipe_row.agent_recipe)
        if not isinstance(recipe, dict) or not recipe.get("steps"):
            #if no steps defined in the recipe then its non functinal.
            raise ValueError(f"Generated recipe for flow {flow_id} is invalid")

        steps = recipe["steps"]
        user_id = flow.user_id

        # Prepend a navigate step if the recipe doesn't start with one
        if steps and steps[0].get("action_type") != "navigate":
            events = load_flow_events(flow.events_path)
            start_url = next(
                (e.get("url") for e in events if e.get("type") == "navigate" and e.get("url")),
                None,
            )

            #if there is no start url navigate, then? try to find one?
            if not start_url:
                start_url = next(
                    (e.get("element", {}).get("page_url") for e in events
                     if e.get("element", {}).get("page_url")),
                    None,
                )

            if not start_url:
                # Last resort: check tier1 url_contains assertions in the recipe steps
                for s in steps:
                    hint = s.get("assertions", {}).get("tier1", {}).get("url_contains")
                    if hint and "." in hint:
                        start_url = f"https://{hint}" if not hint.startswith("http") else hint
                        break

                    
            print(f"[pipeline] start_url resolved: {start_url}")
            if start_url:
                navigate_step = {
                    "step_id": 0,
                    "description": f"Navigate to {start_url}",
                    "action_type": "navigate",
                    "url": start_url,
                    "target": {},
                    "assertions": {
                        "tier1": {"url_contains": start_url.split("//")[-1].split("/")[0]},
                        "tier3_expected_visual": "The target website is loaded and visible",
                    },
                    "on_failure": "stop",
                }
                steps = [navigate_step] + [
                    {**s, "step_id": s["step_id"] + 1} for s in steps
                ]

        #we store secrets seprataley in another table? and then we resolve secrets in the backend itself
        #to make sure no one can interectp the agent recipe and get secrets.
        secrets = get_secrets_for_flow(session, flow_id)
        steps = resolve_secrets(steps, secrets)

        recipe = {**recipe, "steps": steps}

    with db.get_session() as session:
        #create new agent run entry in teh database
        run = create_agent_run(session, flow_id=flow_id, triggered_by=triggered_by)
        run_id = run.id

    #now we can run the agent.

    print(f"[pipeline] starting run {run_id} for flow {flow_id}")

    video_dir = f"runs/{run_id}"
    session_pw = PlaywrightSession()
    try:
        session_pw.start(headless=True, video_dir=video_dir)

        agent = QAAgent(session=session_pw)
        #run the actual agent here. but this does not use autopnpmy or my framework to do it.
        report = agent.run(recipe)

    except Exception as e:
        report = {
            "overall": "failed",
            "goal": recipe.get("goal"),
            "error": str(e),
            "step_results": [],
        }
        print(f"[pipeline] run {run_id} crashed: {e}")
    finally:
        session_pw.stop()

    if session_pw.video_path:
        report["video_path"] = _remux_video(session_pw.video_path)

    final_status = AgentRunStatus.PASSED if report.get("overall") == "passed" else AgentRunStatus.FAILED

    #update agent run in the database based on agenrt report that it egnerates.
    with db.get_session() as session:
        update_agent_run(session, run_id=run_id, status=final_status, report=report)

    print(f"[pipeline] run {run_id} complete — {final_status.value}")

    if final_status == AgentRunStatus.FAILED:
        with db.get_session() as session:
            flow_row = get_flow_by_id(session, flow_id)
            flow_name = flow_row.flow_name if flow_row else None
        _notify_on_failure(flow_id=flow_id, user_id=user_id, report=report, flow_name=flow_name)

    return {"run_id": run_id, "flow_id": flow_id, "report": report}


def _remux_video(raw_path: str) -> str:
    """Re-encode the Playwright WebM to MP4 so browsers get correct duration."""
    src = Path(raw_path)
    if not src.exists():
        return raw_path
    dst = src.with_suffix(".mp4")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(src),
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-movflags", "+faststart",
                str(dst),
            ],
            capture_output=True, timeout=300,
        )
        if dst.exists() and dst.stat().st_size > 0:
            src.unlink(missing_ok=True)
            return str(dst)
    except Exception as e:
        print(f"[pipeline] ffmpeg encode failed: {e}")
    return raw_path


def _notify_on_failure(flow_id: str, user_id: int | None, report: dict, flow_name: str | None = None) -> None:
    """Trigger failure notification — wired to notifications.py in Phase 7."""
    if user_id is None:
        return
    try:
        from notifications import send_failure_report
        from database.ht_user import get_user
        with db.get_session() as session:
            user = get_user(session, user_id)
            if user:
                send_failure_report(
                    user_email=user.email,
                    flow_id=flow_id,
                    report=report,
                    flow_name=flow_name,
                )
    except ImportError:
        print(f"[pipeline] notifications.py not yet implemented — skipping email for run on flow {flow_id}")
    except Exception as e:
        print(f"[pipeline] notification failed: {e}")
