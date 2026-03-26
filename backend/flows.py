import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/flows")
FLOWS_DIR = Path("flows")


@router.get("/")
def list_flows():
    if not FLOWS_DIR.exists():
        return []
    result = []
    for flow_dir in sorted(FLOWS_DIR.iterdir(), reverse=True):
        if not flow_dir.is_dir():
            continue
        events_file = flow_dir / "events.json"
        if not events_file.exists():
            continue
        try:
            data = json.loads(events_file.read_text())
            result.append(
                {
                    "flow_id": data["flow_id"],
                    "started_at": data["started_at"],
                    "frame_count": data["frame_count"],
                    "event_count": len(data["events"]),
                }
            )
        except Exception:
            continue
    return result


@router.get("/{flow_id}/video")
def get_video(flow_id: str):
    mp4 = FLOWS_DIR / flow_id / f"{flow_id}.mp4"
    if not mp4.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(str(mp4), media_type="video/mp4")


@router.get("/{flow_id}/events")
def get_events(flow_id: str):
    events_file = FLOWS_DIR / flow_id / "events.json"
    if not events_file.exists():
        raise HTTPException(status_code=404, detail="Events not found")
    return json.loads(events_file.read_text())
