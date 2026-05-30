import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from auth import get_current_user
from database.ht_agents import get_runs_for_flow, upsert_agent_schedule
from database.ht_flows import (
    db,
    get_flow_by_id,
    get_generated_recipe_by_flow_id,
    get_secrets_for_flow,
    upsert_secret,
)
from database.ht_postgres import AgentRunTable, ScheduleType
from models import (
    AgentRunReportRead,
    AgentRunSummary,
    AgentRunTriggerRead,
    AgentScheduleRead,
    ScheduleBody,
    SecretItem,
    SecretsRead,
    UserRead,
)
from tasks import run_qa_agent

router = APIRouter(prefix="/agents")


# ------------------------------------------------------------------ #
#  Run now                                                            #
# ------------------------------------------------------------------ #

@router.post("/{flow_id}/run", response_model=AgentRunTriggerRead)
def run_agent_now(flow_id: str, current_user: UserRead = Depends(get_current_user)):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")

        recipe = get_generated_recipe_by_flow_id(session, flow_id)
        if not recipe:
            raise HTTPException(
                status_code=400,
                detail="No generated recipe found. Analyze the flow first."
            )

    task = run_qa_agent.delay(flow_id=flow_id, triggered_by="manual")

    return AgentRunTriggerRead(
        run_id=task.id,
        flow_id=flow_id,
        status="queued",
    )


# ------------------------------------------------------------------ #
#  Schedule                                                           #
# ------------------------------------------------------------------ #

@router.post("/{flow_id}/schedule", response_model=AgentScheduleRead)
def set_schedule(
    flow_id: str,
    body: ScheduleBody,
    current_user: UserRead = Depends(get_current_user),
):
    valid = {"daily", "weekly", "none"}
    if body.schedule_type not in valid:
        raise HTTPException(status_code=400, detail=f"schedule_type must be one of {valid}")

    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")

        recipe = get_generated_recipe_by_flow_id(session, flow_id)
        if not recipe:
            raise HTTPException(
                status_code=400,
                detail="No generated recipe found. Analyze the flow first."
            )

        schedule_type = ScheduleType(body.schedule_type)

        from datetime import datetime, timedelta, timezone
        if schedule_type == ScheduleType.DAILY:
            next_run_at = datetime.now(timezone.utc) + timedelta(days=1)
        elif schedule_type == ScheduleType.WEEKLY:
            next_run_at = datetime.now(timezone.utc) + timedelta(weeks=1)
        else:
            next_run_at = None

        schedule = upsert_agent_schedule(
            session=session,
            flow_id=flow_id,
            schedule_type=schedule_type,
            next_run_at=next_run_at,
        )

    return AgentScheduleRead(
        flow_id=flow_id,
        schedule_type=schedule.schedule_type.value,
        is_active=schedule.is_active,
    )


# ------------------------------------------------------------------ #
#  Run history                                                        #
# ------------------------------------------------------------------ #

@router.get("/{flow_id}/runs", response_model=list[AgentRunSummary])
def get_runs(flow_id: str, current_user: UserRead = Depends(get_current_user)):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")

        runs: list[AgentRunTable] = get_runs_for_flow(session, flow_id)

        result = []
        for run in runs:
            report = json.loads(run.report) if run.report else {}
            result.append(AgentRunSummary(
                run_id=run.id,
                triggered_by=run.triggered_by,
                status=run.status.value,
                overall=report.get("overall"),
                summary=report.get("summary"),
                ran_at=run.ran_at.timestamp(),
            ))
        return result


# ------------------------------------------------------------------ #
#  Full run report                                                    #
# ------------------------------------------------------------------ #

@router.get("/{flow_id}/runs/{run_id}", response_model=AgentRunReportRead)
def get_run_report(
    flow_id: str,
    run_id: str,
    current_user: UserRead = Depends(get_current_user),
):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")

        run = session.get(AgentRunTable, run_id)
        if not run or run.flow_id != flow_id:
            raise HTTPException(status_code=404, detail="Run not found")

        report = json.loads(run.report) if run.report else None

        return AgentRunReportRead(
            run_id=run.id,
            flow_id=run.flow_id,
            triggered_by=run.triggered_by,
            status=run.status.value,
            report=report,
            ran_at=run.ran_at.timestamp(),
        )


# ------------------------------------------------------------------ #
#  Run video                                                          #
# ------------------------------------------------------------------ #

@router.get("/{flow_id}/runs/{run_id}/video")
def get_run_video(
    flow_id: str,
    run_id: str,
    current_user: UserRead = Depends(get_current_user),
):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")

        run = session.get(AgentRunTable, run_id)
        if not run or run.flow_id != flow_id:
            raise HTTPException(status_code=404, detail="Run not found")

        report = json.loads(run.report) if run.report else {}
        video_path = report.get("video_path")

        if not video_path and Path(f"runs/{run_id}").exists():
            run_dir = Path(f"runs/{run_id}")
            video_path = next(run_dir.glob("*.mp4"), None) or next(run_dir.glob("*.webm"), None)

        if not video_path or not Path(str(video_path)).exists():
            raise HTTPException(status_code=404, detail="Video not found")

        p = Path(str(video_path))
        media_type = "video/mp4" if p.suffix == ".mp4" else "video/webm"
        return FileResponse(str(p), media_type=media_type)


# ------------------------------------------------------------------ #
#  Secrets                                                            #
# ------------------------------------------------------------------ #

@router.get("/{flow_id}/secrets", response_model=SecretsRead)
def get_secrets(flow_id: str, current_user: UserRead = Depends(get_current_user)):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        secrets = get_secrets_for_flow(session, flow_id)
        return SecretsRead(
            flow_id=flow_id,
            secrets=[SecretItem(key=s.key, value=s.value) for s in secrets],
        )


@router.post("/{flow_id}/secrets", response_model=SecretsRead)
def set_secrets(
    flow_id: str,
    body: SecretsRead,
    current_user: UserRead = Depends(get_current_user),
):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        for item in body.secrets:
            upsert_secret(session, flow_id=flow_id, key=item.key, value=item.value)
        secrets = get_secrets_for_flow(session, flow_id)
        return SecretsRead(
            flow_id=flow_id,
            secrets=[SecretItem(key=s.key, value=s.value) for s in secrets],
        )
