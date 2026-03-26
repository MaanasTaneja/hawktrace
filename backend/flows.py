import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from db import flows_col

router = APIRouter(prefix="/flows")
FLOWS_DIR = Path("flows")


@router.get("/")
def list_flows():
    result = []
    for doc in flows_col().find({}, {"_id": 0, "events": 0}, sort=[("started_at", -1)]):
        result.append({
            "flow_id":     doc["flow_id"],
            "started_at":  doc["started_at"],
            "frame_count": doc["frame_count"],
            "event_count": doc.get("event_count", 0),
            "has_tests":   doc.get("tests") is not None,
        })
    return result


@router.get("/{flow_id}/video")
def get_video(flow_id: str):
    mp4 = FLOWS_DIR / flow_id / f"{flow_id}.mp4"
    if not mp4.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(str(mp4), media_type="video/mp4")


@router.get("/{flow_id}/events")
def get_events(flow_id: str):
    doc = flows_col().find_one({"flow_id": flow_id}, {"_id": 0, "tests": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Flow not found")
    return doc


@router.get("/{flow_id}/tests")
def get_tests(flow_id: str):
    doc = flows_col().find_one({"flow_id": flow_id}, {"_id": 0, "tests": 1})
    if not doc or not doc.get("tests"):
        raise HTTPException(status_code=404, detail="Tests not generated yet")
    return {"flow_id": flow_id, **doc["tests"]}


@router.post("/{flow_id}/generate_tests")
async def generate_tests(flow_id: str):
    import traceback
    from test_generator import generate_tests_for_flow
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, generate_tests_for_flow, flow_id)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[generate_tests] ERROR for flow {flow_id}:\n{tb}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
