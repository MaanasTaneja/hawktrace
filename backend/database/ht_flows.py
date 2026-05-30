import json
import os
from secrets_crypto import encrypt_secret, decrypt_secret
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from database.ht_postgres import (
    FlowSecretTable,
    FlowStatus,
    FlowsTable,
    GeneratedRecipeTable,
    PostgresDB,
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
def get_generated_recipe_by_flow_id(session: Session, flow_id: str) -> GeneratedRecipeTable | None:
    #why is therre no security measures for this?
    return (
        session.query(GeneratedRecipeTable)
        .filter(GeneratedRecipeTable.flow_id == flow_id)
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



#main logic where we upsert the generated agent recipe JSON for a recorded flow.
def upsert_generated_recipe(
    session: Session,
    flow_id: str,
    agent_recipe: str,
) -> GeneratedRecipeTable | None:
    flow = get_flow_by_id(session, flow_id)
    if not flow:
        return None

    recipe = get_generated_recipe_by_flow_id(session, flow_id)
    if recipe is None:
        recipe = GeneratedRecipeTable(
            flow_id=flow_id,
            agent_recipe=agent_recipe,
        )
        session.add(recipe)
    else:
        recipe.agent_recipe = agent_recipe

    flow.status = FlowStatus.TESTS_GENERATED
    session.commit()
    session.refresh(recipe)
    return recipe


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


#main upsert flow record into table. Recipe generation is a separate async operation.
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
