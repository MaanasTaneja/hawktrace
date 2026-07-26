import json
import os
import uuid
from secrets_crypto import encrypt_secret, decrypt_secret
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

import uuid

from database.ht_postgres import (
    AgentRunTable,
    AgentRunStatus,
    AgentScheduleTable,
    FlowSecretTable,
    FlowStatus,
    FlowsTable,
    GeneratedRecipeTable,
    PostgresDB,
    ScheduleType,
    UserTable,
)

DATABASE_URL = os.getenv("DATABASE_URL",  "postgresql+psycopg://postgres:postgres@localhost:5432/hawktrace")
db = PostgresDB(database_url=DATABASE_URL)
#get db insatnce.


#agent run table crud.
def create_agent_run(session : Session, flow_id : str, triggered_by : str) -> AgentRunTable | None:
    agent_run = AgentRunTable(
        id = str(uuid.uuid4()),
        flow_id = flow_id,
        triggered_by = triggered_by,
        status = AgentRunStatus.RUNNING
    )
    try:
        session.add(agent_run) #add this modelling of a row into our db -> it auto adds to correct table.
        session.commit()
        session.refresh(agent_run)
    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error inserting agent run into Run Table: {e}")
        return None
    
    return agent_run  #object of agent run gets returned so van access table fields this way.
#agent_run.id etc.

def update_agent_run(session :  Session, run_id : str, status : AgentRunStatus, report : dict) -> AgentRunTable | None:
    try:
        run = session.get(AgentRunTable, run_id) #run id is a uuid
        if not run:
            return None
        run.status = status
        run.report = json.dumps(report)
        session.commit()
        session.refresh(run)

    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error updating agent run: {e}")

    return run


def get_latest_run_for_flow(session: Session, flow_id: str) -> AgentRunTable | None:
    try:
        latest_run = session.query(AgentRunTable).filter_by(flow_id = flow_id).order_by(AgentRunTable.ran_at.desc()).first()
    except SQLAlchemyError as e:
        print(f"Error retrieving latest agent run: {e}")
        return None
    return latest_run


def get_runs_for_flow(session: Session, flow_id: str) -> list[AgentRunTable]:
    try:
        all_runs = session.query(AgentRunTable).filter_by(flow_id = flow_id).order_by(AgentRunTable.ran_at.desc()).all()
    except SQLAlchemyError as e:
        print(f"Error retrieving latest agent run: {e}")
        return []
    
    return all_runs


#agent schedule table crud
def upsert_agent_schedule(
    session : Session,
    flow_id : str,
    schedule_type : ScheduleType,
    next_run_at : datetime | None = None,
) -> AgentScheduleTable | None:
    try:
        recipe = session.query(GeneratedRecipeTable).filter_by(flow_id = flow_id).first()
        if not recipe:
            return None
        
        schedule = session.query(AgentScheduleTable).filter_by(flow_id = flow_id).first()
        is_active = schedule_type != ScheduleType.NONE

        if schedule is None:
            schedule = AgentScheduleTable(
                flow_id = flow_id,
                schedule_type = schedule_type,
                next_run_at = next_run_at,
                is_active = is_active,
            )
            session.add(schedule)
        else:
            schedule.schedule_type = schedule_type
            schedule.next_run_at = next_run_at
            schedule.is_active = is_active

        session.commit()
        session.refresh(schedule)

    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error upserting agent schedule: {e}")
        return None
    
    return schedule


def get_agent_schedule_for_flow(session : Session, flow_id : str) -> AgentScheduleTable | None:
    try:
        schedule = session.query(AgentScheduleTable).filter_by(flow_id = flow_id).first()
    except SQLAlchemyError as e:
        print(f"Error retrieving agent schedule: {e}")
        return None
    
    return schedule


def delete_agent_schedule(session : Session, flow_id : str) -> bool:
    try:
        schedule = session.query(AgentScheduleTable).filter_by(flow_id = flow_id).first()
        if not schedule:
            return False
        session.delete(schedule)
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error deleting agent schedule: {e}")
        return False
    
    return True


