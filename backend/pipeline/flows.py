import asyncio
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from database.mongodb import flows_col


class RenameBody(BaseModel):
    name: str

router = APIRouter(prefix="/flows")
FLOWS_DIR = Path("flows")


@router.get("/")
def list_flows():
    result = []
    for doc in flows_col().find({}, {"_id": 0, "events": 0}, sort=[("started_at", -1)]):
        result.append({
            "flow_id":     doc["flow_id"],
            "name":        doc.get("name"),
            "started_at":  doc["started_at"],
            "frame_count": doc["frame_count"],
            "event_count": doc.get("event_count", 0),
            "has_tests":   doc.get("tests") is not None,
        })
    return result


@router.api_route("/{flow_id}/video", methods=["GET", "HEAD"])
def get_video(flow_id: str, request: Request):
    mp4 = FLOWS_DIR / flow_id / f"{flow_id}.mp4"
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


@router.patch("/{flow_id}/rename")
def rename_flow(flow_id: str, body: RenameBody):
    result = flows_col().update_one({"flow_id": flow_id}, {"$set": {"name": body.name.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    return {"flow_id": flow_id, "name": body.name.strip()}


@router.delete("/{flow_id}")
def delete_flow(flow_id: str):
    import shutil
    result = flows_col().delete_one({"flow_id": flow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flow not found")
    flow_dir = FLOWS_DIR / flow_id
    if flow_dir.exists():
        shutil.rmtree(flow_dir)
    return {"deleted": flow_id}


@router.post("/{flow_id}/generate_tests")
async def generate_tests(flow_id: str):
    import traceback
    from .test_generator import generate_tests_for_flow
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
