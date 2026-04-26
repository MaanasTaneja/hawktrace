import json
import mimetypes
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from prompts import VIDEO_ANALYSIS_PROMPT
from database.ht_flows import db, get_flow_by_id, load_flow_events, upsert_generated_tests

load_dotenv()

FLOWS_DIR = Path("flows")

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client


def upload_clip(clip_path: str) -> str:
    """Upload a video clip to the Gemini Files API and wait until ACTIVE."""
    client = _get_client()
    mime_type, _ = mimetypes.guess_type(clip_path)
    if not mime_type or not mime_type.startswith("video/"):
        mime_type = "video/mp4"

    with open(clip_path, "rb") as f:
        uploaded = client.files.upload(file=f, config={"mime_type": mime_type})

    while True:
        info = client.files.get(name=uploaded.name)
        if info.state.name == "ACTIVE":
            return uploaded.uri
        if info.state.name == "FAILED":
            raise RuntimeError(f"Gemini file upload failed: {info.error}")
        time.sleep(2)


def _call_gemini(file_uri: str, prompt: str, fps: int = 20) -> str:
    client = _get_client()
    parts = [
        types.Part(
            file_data=types.FileData(file_uri=file_uri),
            video_metadata=types.VideoMetadata(fps=fps),
        ),
        types.Part(text=prompt),
    ]
    response = client.models.generate_content(
        model="gemini-3.1-pro-preview",
        contents=types.Content(parts=parts),
        config=types.GenerateContentConfig(
            max_output_tokens=32768,
            temperature=0.2,
            media_resolution="MEDIA_RESOLUTION_HIGH",
            thinking_config=types.ThinkingConfig(thinking_budget=32768),
        ),
    )
    return response.text


SEMANTIC_KEYS = {"Enter", "Tab", "Escape"}
EDITING_KEYS = {
    "Backspace", "Delete",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End", "PageUp", "PageDown",
}

def _format_events_for_analysis(events: list[dict]) -> list[dict]:
    """Add event_id, strip internal fields, and drop noise for the analysis prompt.

    Editing keystrokes (Backspace, arrows, etc.) are dropped because fill events
    already capture the final typed value. Only semantically meaningful keys
    (Enter, Tab, Escape) are kept.
    """
    result = []
    event_id = 0
    for ev in events:
        t = ev.get("type")

        # Drop editing keystrokes — fill events capture the final value
        if t == "keydown" and ev.get("key") not in SEMANTIC_KEYS:
            continue

        entry = {
            "event_id": event_id,
            "time": round(ev.get("video_t", ev.get("t", 0)), 3),
            "action": t,
        }
        el = ev.get("element")
        if el:
            elem_info = {}
            for field in ("selector", "tag", "text", "placeholder", "aria_label"):
                if el.get(field):
                    elem_info[field] = el[field]
            if elem_info:
                entry["element"] = elem_info

        if t == "navigate":
            entry["url"] = ev.get("url", "")
        elif t in ("click", "dblclick"):
            entry["x"] = round(ev.get("x", 0))
            entry["y"] = round(ev.get("y", 0))
        elif t == "fill":
            entry["value"] = ev.get("value", "")
        elif t == "scroll":
            entry["deltaY"] = ev.get("deltaY", 0)
        elif t == "keydown":
            entry["key"] = ev.get("key", "")

        result.append(entry)
        event_id += 1
    return result


def _parse_observations(raw: str) -> list[dict]:
    """Extract JSON array from Gemini response."""
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(raw)


def analyze_flow_video(flow_id: str, goal: str | None = None, success_criteria: str | None = None) -> dict:
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow:
            raise FileNotFoundError(f"Flow {flow_id} not found")
        events = load_flow_events(flow.events_path)
        fps = flow.fps
        mp4_path = Path(flow.video_path) if flow.video_path else (FLOWS_DIR / flow_id / f"{flow_id}.mp4")

    if not mp4_path.exists():
        raise FileNotFoundError(f"MP4 not found for flow {flow_id}")

    clean_events = _format_events_for_analysis(events)
    events_json = json.dumps(clean_events, indent=2)

    goal_context = ""
    if goal:
        goal_context = f"\nFlow goal: {goal}\n"
    if success_criteria:
        goal_context += f"Success criteria: {success_criteria}\n"

    print(f"[analysis] uploading {mp4_path} to Gemini...")
    file_uri = upload_clip(str(mp4_path))

    print(f"[analysis] calling Gemini for flow {flow_id}...")
    prompt = VIDEO_ANALYSIS_PROMPT.format(goal_context=goal_context, events_json=events_json)
    raw = _call_gemini(file_uri, prompt, fps=fps)

    observations = _parse_observations(raw)

    stored = {"goal": goal, "success_criteria": success_criteria, "observations": observations}
    with db.get_session() as session:
        saved = upsert_generated_tests(
            session=session,
            flow_id=flow_id,
            bdd_text=json.dumps(stored),
            playwright_text="",
            model_name="gemini-3.1-pro-preview",
        )
        if not saved:
            raise FileNotFoundError(f"Flow {flow_id} not found in database")

    print(f"[analysis] saved {len(observations)} observations for flow {flow_id}")
    return {"flow_id": flow_id, "goal": goal, "success_criteria": success_criteria, "observations": observations}
