import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure the app directory is on the path when running inside a container
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://hawktrace_cache:6379/0")

celery_app = Celery(
    "hawktrace",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Poll for due scheduled runs every 60 seconds
    beat_schedule={
        "poll-scheduled-runs": {
            "task": "tasks.poll_scheduled_runs",
            "schedule": 60.0,
        }
    },
)


@celery_app.task(name="tasks.run_qa_agent")
def run_qa_agent(flow_id: str, triggered_by: str = "scheduled"):
    """
    Run the QA agent for a single flow.
    Dispatched manually (run now) or by poll_scheduled_runs.
    """
    from pipeline.agent_pipeline import run_qa_check
    result = run_qa_check(flow_id=flow_id, triggered_by=triggered_by)
    return {"status": "ok", "run_id": result["run_id"], "overall": result["report"].get("overall")}


@celery_app.task(name="tasks.poll_scheduled_runs")
def poll_scheduled_runs():
    """
    Runs every 60 seconds via Celery Beat.
    Finds all active scheduled flows whose next_run_at is due and dispatches them.
    """
    from database.ht_flows import db, upsert_agent_schedule
    from database.ht_postgres import AgentScheduleTable, ScheduleType

    now = datetime.now(timezone.utc)
    dispatched = []

    with db.get_session() as session:
        due = (
            session.query(AgentScheduleTable)
            .filter(
                AgentScheduleTable.is_active == True,
                AgentScheduleTable.next_run_at <= now,
            )
            .all()
        )

        for schedule in due:
            flow_id = schedule.flow_id

            # Dispatch the run task
            run_qa_agent.delay(flow_id=flow_id, triggered_by="scheduled")
            dispatched.append(flow_id)

            # Advance next_run_at
            if schedule.schedule_type == ScheduleType.DAILY:
                next_run = now + timedelta(days=1)
            elif schedule.schedule_type == ScheduleType.WEEKLY:
                next_run = now + timedelta(weeks=1)
            else:
                next_run = None

            upsert_agent_schedule(
                session=session,
                flow_id=flow_id,
                schedule_type=schedule.schedule_type,
                next_run_at=next_run,
            )

    if dispatched:
        print(f"[beat] dispatched QA runs for flows: {dispatched}")

    return {"dispatched": dispatched}
