import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure the app directory is on the path when running inside a container
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://hawktrace_cache:6379/0")
_schema_ready = False

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
    task_track_started=True,
    # Poll for due scheduled runs every 60 seconds
    beat_schedule={
        "poll-scheduled-runs": {
            "task": "tasks.poll_scheduled_runs",
            "schedule": 60.0,
        }
    },
)


def _ensure_schema() -> None:
    global _schema_ready
    if _schema_ready:
        return
    from database.ht_flows import db
    db.ensure_schema()
    _schema_ready = True


#this generates the test async.
@celery_app.task(name="tasks.generate_agent_recipe")
def generate_agent_recipe_task(flow_id: str):
    """
    Analyze a recorded flow and persist its generated agent recipe.
    Dispatched by /flows/{flow_id}/generate_tests.
    """
    _ensure_schema()
    from pipeline.recipe_generator import generate_agent_recipe
    recipe = generate_agent_recipe(flow_id)
    return {"status": "ok", "flow_id": flow_id, "recipe": recipe}


@celery_app.task(name="tasks.encode_flow_video")
def encode_flow_video_task(flow_id: str):
    """
    Encode a recorded flow's captured JPEG frames into MP4.
    Dispatched when a WebSocket recording ends.
    """
    _ensure_schema()
    from pipeline.flows_recorder import encode_flow_video
    video_path = encode_flow_video(flow_id)
    return {"status": "ok", "flow_id": flow_id, "video_path": video_path}


@celery_app.task(name="tasks.run_qa_agent")
def run_qa_agent(flow_id: str, triggered_by: str = "scheduled"):
    """
    Run the QA agent for a single flow.
    Dispatched manually (run now) or by poll_scheduled_runs.
    """
    _ensure_schema()
    #get run qa check from the pipeline and run this as an async celery task.
    from pipeline.agent_pipeline import run_qa_check
    result = run_qa_check(flow_id=flow_id, triggered_by=triggered_by)
    return {"status": "ok", "run_id": result["run_id"], "overall": result["report"].get("overall")}


@celery_app.task(name="tasks.poll_scheduled_runs")
def poll_scheduled_runs():
    """
    Runs every 60 seconds via Celery Beat.
    Finds all active scheduled flows whose next_run_at is due and dispatches them.
    """
    _ensure_schema()
    from database.ht_agents import upsert_agent_schedule
    from database.ht_flows import db
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
