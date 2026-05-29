import json
import os
import uuid
from secrets_crypto import encrypt_secret, decrypt_secret
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from database.ht_postgres import (
    AgentRecipeTable,
    AgentRunTable,
    AgentRunStatus,
    AgentScheduleTable,
    FlowSecretTable,
    FlowStatus,
    FlowsTable,
    GeneratedTestsTable,
    PostgresDB,
    ScheduleType,
    UserTable,
)

#if not prod then load local
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/hawktrace")
db = PostgresDB(DATABASE_URL)


def get_flow_by_id(session: Session, flow_id: str) -> FlowsTable | None:
    return session.get(FlowsTable, flow_id)

#get all flows
def get_flows(session: Session, limit: int = 200) -> list[FlowsTable]:
    return (
        session.query(FlowsTable)
        .order_by(desc(FlowsTable.started_at))
        .limit(limit)
        .all()
    )

#get flows for a particular user. 
def get_flows_for_user(session: Session, user_id: int, limit: int = 200) -> list[FlowsTable]:
    return (
        session.query(FlowsTable)
        .filter(FlowsTable.user_id == user_id)
        .order_by(desc(FlowsTable.started_at))
        .limit(limit)
        .all()
    )

#get flows absed on flow idf 
def get_tests_by_flow_id(session: Session, flow_id: str) -> GeneratedTestsTable | None:
    return (
        session.query(GeneratedTestsTable)
        .filter(GeneratedTestsTable.flow_id == flow_id)
        .first()
    )

#rename flow self explanatory
def rename_flow(session: Session, flow_id: str, name: str) -> FlowsTable | None:
    flow = get_flow_by_id(session, flow_id)
    if not flow:
        return None
    flow.flow_name = name
    session.commit()
    session.refresh(flow)
    return flow


#delete flow for a user same shit
def delete_flow(session: Session, flow_id: str) -> bool:
    flow = get_flow_by_id(session, flow_id)
    if not flow:
        return False
    session.delete(flow)
    session.commit()
    return True



#main logic where we uspert generated text need to change this to upsert flow information (json of flow desciprtin and agent receipe)
def upsert_generated_tests(
    session: Session,
    flow_id: str,
    bdd_text: str,
    playwright_text: str,
    model_name: str | None = None,
) -> GeneratedTestsTable | None:
    flow = get_flow_by_id(session, flow_id)
    if not flow:
        return None

    tests = get_tests_by_flow_id(session, flow_id)
    if tests is None:
        tests = GeneratedTestsTable(
            flow_id=flow_id,
            bdd_text=bdd_text,
            playwright_text=playwright_text,
            model_name=model_name,
        )
        session.add(tests)
    else:
        tests.bdd_text = bdd_text
        tests.playwright_text = playwright_text
        tests.model_name = model_name

    flow.status = FlowStatus.TESTS_GENERATED
    session.commit()
    session.refresh(tests)
    return tests


def load_flow_events(events_path: str) -> list[dict]:
    #load json flow events path from s3 or otherwise.
    path = Path(events_path)
    if not path.exists():
        raise FileNotFoundError(f"Events file not found: {events_path}")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("events_path must point to a JSON list")
    return data


#main upsert flow record into table, the uperset genertets test is an async operation that happens when user wants us to generatethe agent
#keep tehm sperate. upsert agent repcie later.
def upsert_recorded_flow(
    session: Session,
    flow_id: str,
    user_id: int,
    started_at_epoch: float,
    fps: int,
    frame_count: int,
    event_count: int,
    events_path: str,
    video_path: str,
    flow_name: str | None = None,
) -> FlowsTable:
    flow = get_flow_by_id(session, flow_id)
    started_at = datetime.fromtimestamp(started_at_epoch, tz=timezone.utc)
    owner = session.get(UserTable, user_id)
    if owner is None:
        raise ValueError(f"User {user_id} does not exist")

    if flow is None:
        flow = FlowsTable(
            id=flow_id,
            user_id=user_id,
            flow_name=flow_name,
            started_at=started_at,
            fps=fps,
            frame_count=frame_count,
            event_count=event_count,
            events_path=events_path,
            video_path=video_path,
            status=FlowStatus.TESTS_NOT_GENERATED,
        )
        session.add(flow)
    else:
        flow.user_id = user_id
        flow.flow_name = flow_name or flow.flow_name
        flow.started_at = started_at
        flow.fps = fps
        flow.frame_count = frame_count
        flow.event_count = event_count
        flow.events_path = events_path
        flow.video_path = video_path
        flow.status = FlowStatus.TESTS_NOT_GENERATED

    session.commit()
    session.refresh(flow)
    return flow


# --- Agent recipe ---

def upsert_agent_recipe(
    session: Session,
    flow_id: str,
    goal: str,
    success_criteria: str,
    steps: list,
) -> AgentRecipeTable | None:
    flow = get_flow_by_id(session, flow_id)
    if not flow:
        return None

    recipe = session.query(AgentRecipeTable).filter_by(flow_id=flow_id).first()
    steps_json = json.dumps(steps)

    if recipe is None:
        recipe = AgentRecipeTable(
            flow_id=flow_id,
            goal=goal,
            success_criteria=success_criteria,
            steps=steps_json,
        )
        session.add(recipe)
    else:
        recipe.goal = goal
        recipe.success_criteria = success_criteria
        recipe.steps = steps_json

    flow.status = FlowStatus.AGENT_READY
    session.commit()
    session.refresh(recipe)
    return recipe


def get_agent_recipe(session: Session, flow_id: str) -> AgentRecipeTable | None:
    return session.query(AgentRecipeTable).filter_by(flow_id=flow_id).first()


def set_agent_active(session: Session, flow_id: str, is_active: bool) -> AgentRecipeTable | None:
    recipe = get_agent_recipe(session, flow_id)
    if not recipe:
        return None
    recipe.is_active = is_active
    session.commit()
    session.refresh(recipe)
    return recipe


# --- Agent runs ---

def create_agent_run(
    session: Session,
    flow_id: str,
    triggered_by: str,
) -> AgentRunTable:
    run = AgentRunTable(
        id=str(uuid.uuid4()),
        flow_id=flow_id,
        triggered_by=triggered_by,
        status=AgentRunStatus.RUNNING,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def update_agent_run(
    session: Session,
    run_id: str,
    status: AgentRunStatus,
    report: dict,
) -> AgentRunTable | None:
    run = session.get(AgentRunTable, run_id)
    if not run:
        return None
    run.status = status
    run.report = json.dumps(report)
    session.commit()
    session.refresh(run)
    return run


def get_latest_run_for_flow(session: Session, flow_id: str) -> AgentRunTable | None:
    return (
        session.query(AgentRunTable)
        .filter_by(flow_id=flow_id)
        .order_by(AgentRunTable.ran_at.desc())
        .first()
    )


def get_runs_for_flow(session: Session, flow_id: str) -> list[AgentRunTable]:
    return (
        session.query(AgentRunTable)
        .filter_by(flow_id=flow_id)
        .order_by(AgentRunTable.ran_at.desc())
        .all()
    )


# --- Agent schedule ---

def upsert_agent_schedule(
    session: Session,
    flow_id: str,
    schedule_type: ScheduleType,
    next_run_at: datetime | None = None,
) -> AgentScheduleTable | None:
    recipe = get_agent_recipe(session, flow_id)
    if not recipe:
        return None

    schedule = session.query(AgentScheduleTable).filter_by(flow_id=flow_id).first()
    is_active = schedule_type != ScheduleType.NONE

    if schedule is None:
        schedule = AgentScheduleTable(
            flow_id=flow_id,
            schedule_type=schedule_type,
            next_run_at=next_run_at,
            is_active=is_active,
        )
        session.add(schedule)
    else:
        schedule.schedule_type = schedule_type
        schedule.next_run_at = next_run_at
        schedule.is_active = is_active

    session.commit()
    session.refresh(schedule)
    return schedule


# --- Flow secrets ---

def get_secrets_for_flow(session: Session, flow_id: str) -> list[FlowSecretTable]:
    return session.query(FlowSecretTable).filter_by(flow_id=flow_id).all()


def upsert_secret(session: Session, flow_id: str, key: str, value: str) -> FlowSecretTable:
    encrypted = encrypt_secret(value)
    secret = (
        session.query(FlowSecretTable)
        .filter_by(flow_id=flow_id, key=key)
        .first()
    )
    if secret is None:
        secret = FlowSecretTable(flow_id=flow_id, key=key, value=encrypted)
        session.add(secret)
    else:
        secret.value = encrypted
    session.commit()
    session.refresh(secret)
    return secret


def resolve_secrets(steps: list[dict], secrets: list[FlowSecretTable]) -> list[dict]:
    """Substitute {{secret:KEY}} placeholders in step values with stored secrets."""
    secret_map = {s.key: decrypt_secret(s.value) for s in secrets}
    resolved = []
    for step in steps:
        s = dict(step)
        if s.get("value") and isinstance(s["value"], str):
            for key, val in secret_map.items():
                s["value"] = s["value"].replace(f"{{{{secret:{key}}}}}", val)
        resolved.append(s)
    return resolved
