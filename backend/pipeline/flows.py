import asyncio
import re
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from auth import get_current_user
from database.ht_flows import (
    db,
    delete_flow as db_delete_flow,
    get_flow_by_id,
    get_flows_for_user,
    get_latest_run_for_flow,
    get_runs_for_flow,
    get_tests_by_flow_id,
    load_flow_events,
    rename_flow as db_rename_flow,
)
from models import (
    AnalyzeBody,
    FlowAnalysisRead,
    FlowDeleteRead,
    FlowEventsRead,
    FlowListItem,
    FlowRenameRead,
    RenameBody,
    UserRead,
)

import logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/flows")


def _flow_video_path(flow_id: str, video_path: str | None) -> Path:
    if video_path:
        return Path(video_path)
    return Path("flows") / flow_id / f"{flow_id}.mp4"


@router.get("/all", response_model=list[FlowListItem])
def list_flows(current_user: UserRead = Depends(get_current_user)):
    with db.get_session() as session:
        rows = get_flows_for_user(session, current_user.id)
        result = []
        for row in rows:
            latest_run = get_latest_run_for_flow(session, row.id)
            result.append(FlowListItem(
                flow_id=row.id,
                name=row.flow_name,
                started_at=row.started_at.timestamp(),
                frame_count=row.frame_count,
                event_count=row.event_count,
                has_tests=row.generated_test is not None,
                has_agent=row.agent_recipe is not None,
                agent_active=row.agent_recipe.is_active if row.agent_recipe else True,
                last_run_status=latest_run.status.value if latest_run else None,
            ))
        return result


@router.api_route("/{flow_id}/video", methods=["GET", "HEAD"])
#get pecific video form a flow
def get_video(
    flow_id: str,
    request: Request,
    current_user: UserRead = Depends(get_current_user),
):
    with db.get_session() as session:
        #retirve flow record and then get the flow video path.
        flow = get_flow_by_id(session, flow_id)
        #if current user id is not the flow user id then we wil lnot show this one
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        mp4 = _flow_video_path(flow_id, flow.video_path)

    #video doesnt exist in s3 or local
    if not mp4.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    file_size = mp4.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            content_length = end - start + 1

            def iter_file():
                with open(mp4, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        chunk = f.read(min(65536, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            #stremaing reposne back to frontend
            return StreamingResponse(
                iter_file(),
                status_code=206,
                media_type="video/mp4",
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(content_length),
                },
            )

    return FileResponse(
        str(mp4),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes", "Content-Length": str(file_size)},
    )


@router.get("/{flow_id}/events", response_model=FlowEventsRead)
def get_events(flow_id: str, current_user: UserRead = Depends(get_current_user)):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        try:
            events = load_flow_events(flow.events_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        logger.info(events) #log events for debugging

        #return the flow events from our 
        return FlowEventsRead(
            flow_id=flow.id,
            started_at=flow.started_at.timestamp(),
            fps=flow.fps,
            frame_count=flow.frame_count,
            event_count=flow.event_count,
            events=events,
        )

#return the visual analysis observations for this flow
#returns the flow anlaysis read model
@router.get("/{flow_id}/tests", response_model=FlowAnalysisRead)
def get_tests(flow_id: str, current_user: UserRead = Depends(get_current_user)):
    import json as _json

    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        #need to rename this shit? get_video_analysis or recipe.
        tests = get_tests_by_flow_id(session, flow_id)
        #fetch the tests?

        if not tests:
            raise HTTPException(status_code=404, detail="Analysis not generated yet")
        try:
            stored = _json.loads(tests.bdd_text)
            if isinstance(stored, dict) and "steps" in stored:
                from database.ht_flows import get_agent_recipe
                recipe = get_agent_recipe(session, flow_id)
                return FlowAnalysisRead(
                    flow_id=flow_id,
                    goal=stored.get("goal"),
                    success_criteria=stored.get("success_criteria"),
                    observations=[],
                    steps=stored.get("steps"),
                    agent_active=recipe.is_active if recipe else True,
                )
            elif isinstance(stored, dict):
                # Old format: {goal, success_criteria, observations}
                return FlowAnalysisRead(
                    flow_id=flow_id,
                    goal=stored.get("goal"),
                    success_criteria=stored.get("success_criteria"),
                    observations=stored.get("observations", []),
                )
            else:
                # Legacy: bare observations array
                return FlowAnalysisRead(flow_id=flow_id, observations=stored)
        except (TypeError, ValueError):
            raise HTTPException(status_code=500, detail="Failed to parse stored analysis")


@router.patch("/{flow_id}/rename", response_model=FlowRenameRead)
def rename_flow(
    flow_id: str,
    body: RenameBody,
    current_user: UserRead = Depends(get_current_user),
):
    with db.get_session() as session:
        existing = get_flow_by_id(session, flow_id)
        if not existing or existing.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        updated = db_rename_flow(session, flow_id, body.name.strip())
        if not updated:
            raise HTTPException(status_code=404, detail="Flow not found")
        return FlowRenameRead(flow_id=updated.id, name=updated.flow_name or "")


@router.delete("/{flow_id}", response_model=FlowDeleteRead)
def delete_flow(flow_id: str, current_user: UserRead = Depends(get_current_user)):
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")
        flow_video_path = _flow_video_path(flow_id, flow.video_path)
        flow_dir = flow_video_path.parent

        # Collect run video dirs before the DB rows are deleted
        runs = get_runs_for_flow(session, flow_id)
        run_dirs = [Path(f"runs/{r.id}") for r in runs]

        deleted = db_delete_flow(session, flow_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Flow not found")

    if flow_dir.exists():
        shutil.rmtree(flow_dir, ignore_errors=True)
    for run_dir in run_dirs:
        if run_dir.exists():
            shutil.rmtree(run_dir, ignore_errors=True)
    return FlowDeleteRead(deleted=flow_id)


#analyze flow video with Gemini — returns visual observations per event
#this is th eone that reecieves the analyze button call.

@router.post("/{flow_id}/generate_tests")
async def generate_tests(
    flow_id: str,
    body: AnalyzeBody = AnalyzeBody(),
    current_user: UserRead = Depends(get_current_user),
):
    import traceback
    #here we call the analyze flow video witht he long running task, and use asyncio to call it.
    #so basically need to make the test generator function into a celery task, and we launch
    #celery task here
    #provide another route to poll reuslts. but thats it.
    #insde the cleery task we will also update redis to store the progress of the agent recipie creation.

    from .test_generator import generate_agent_recipe

    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow or flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Flow not found")

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None, generate_agent_recipe, flow_id
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[analyze_flow] ERROR for flow {flow_id}:\n{tb}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
