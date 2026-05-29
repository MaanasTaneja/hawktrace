import json
import re
from pathlib import Path
from dotenv import load_dotenv
from prompts import AGENT_RECIPE_PROMPT
from clients.gemini import upload_clip, _call_gemini
from database.ht_flows import db, get_flow_by_id, load_flow_events, upsert_generated_tests

load_dotenv()

FLOWS_DIR = Path("flows")

SEMANTIC_KEYS = {"Enter", "Tab", "Escape"}
EDITING_KEYS = {
    "Backspace", "Delete",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End", "PageUp", "PageDown",
}

def _format_events_for_analysis(events: list[dict]) -> list[dict]:
    """Add event_id, strip internal fields, and drop noise for the analysis prompt.

    Editing keystrokes (Backspace, arrows, etc.) are dropped because fill events
    already capture the final typed value. Only semantically meaningful keys
    (Enter, Tab, Escape) are kept.
    """
    result = []
    event_id = 0
    for ev in events:
        t = ev.get("type")

        # Drop editing keystrokes — fill events capture the final value
        if t == "keydown" and ev.get("key") not in SEMANTIC_KEYS:
            continue

        entry = {
            "event_id": event_id,
            "time": round(ev.get("video_t", ev.get("t", 0)), 3),
            "action": t,
        }
        el = ev.get("element")
        if el:
            elem_info = {}
            for field in ("selector", "tag", "text", "placeholder", "aria_label"):
                if el.get(field):
                    elem_info[field] = el[field]
            if elem_info:
                entry["element"] = elem_info

        if t == "navigate":
            entry["url"] = ev.get("url", "")
        elif t in ("click", "dblclick"):
            entry["x"] = round(ev.get("x", 0))
            entry["y"] = round(ev.get("y", 0))
        elif t == "fill":
            entry["value"] = ev.get("value", "")
        elif t == "scroll":
            entry["deltaY"] = ev.get("deltaY", 0)
        elif t == "keydown":
            entry["key"] = ev.get("key", "")

        result.append(entry)
        event_id += 1
    return result


def _parse_recipe(raw: str) -> dict:
    """Extract and validate the JSON recipe from Gemini's response."""
    # Strip markdown fences if Gemini ignored the instruction
    text = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text.strip(), flags=re.MULTILINE)

    try:
        recipe = json.loads(text.strip())
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}\n\nRaw response:\n{raw[:500]}")

    required = {"goal", "success_criteria", "steps"}
    missing = required - set(recipe.keys())
    if missing:
        raise ValueError(f"Recipe missing required fields: {missing}")

    if not isinstance(recipe["steps"], list) or len(recipe["steps"]) == 0:
        raise ValueError("Recipe steps must be a non-empty list")

    valid_action_types = {"navigate", "click", "fill", "scroll", "select"}
    for step in recipe["steps"]:
        if step.get("action_type") not in valid_action_types:
            raise ValueError(
                f"Step {step.get('step_id')} has invalid action_type: '{step.get('action_type')}'"
            )
        if "assertions" not in step or "tier3_expected_visual" not in step.get("assertions", {}):
            raise ValueError(f"Step {step.get('step_id')} missing assertions.tier3_expected_visual")

    return recipe


def generate_agent_recipe(flow_id: str) -> dict:
    """Analyze a recorded flow and return a structured agent recipe."""
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow:
            raise FileNotFoundError(f"Flow {flow_id} not found")
        events = load_flow_events(flow.events_path)
        fps = flow.fps
        mp4_path = Path(flow.video_path) if flow.video_path else (FLOWS_DIR / flow_id / f"{flow_id}.mp4")

    if not mp4_path.exists():
        raise FileNotFoundError(f"MP4 not found for flow {flow_id}")

    clean_events = _format_events_for_analysis(events)
    events_json = json.dumps(clean_events, indent=2)

    print(f"[recipe] uploading {mp4_path} to Gemini...")
    file_uri = upload_clip(str(mp4_path))

    print(f"[recipe] calling Gemini for flow {flow_id}...")
    prompt = AGENT_RECIPE_PROMPT.replace("{events_json}", events_json)
    raw = _call_gemini(file_uri, prompt, fps=fps)

    print(f"[recipe] parsing response for flow {flow_id}...")
    recipe = _parse_recipe(raw)

    with db.get_session() as session:
        saved = upsert_generated_tests(
            session=session,
            flow_id=flow_id,
            bdd_text=json.dumps(recipe),
            playwright_text="",
            model_name="gemini-3.1-pro-preview",
        )
        if not saved:
            raise FileNotFoundError(f"Flow {flow_id} not found in database")

    print(f"[recipe] saved {len(recipe['steps'])} steps for flow {flow_id}")
    return recipe
