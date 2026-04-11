import json
import mimetypes
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from prompts import TEST_GENERATION_PROMPT
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


def _format_events(events: list[dict]) -> list[dict]:
    """Strip internal fields, return a clean readable trace for the prompt."""
    cleaned = []
    for ev in events:
        entry = {"time": round(ev.get("video_t", ev.get("t", 0)), 3)}
        t = ev.get("type")
        entry["action"] = t
        if t == "navigate":
            entry["url"] = ev.get("url", "")
        elif t in ("click", "dblclick"):
            entry["x"] = round(ev.get("x", 0))
            entry["y"] = round(ev.get("y", 0))
        elif t == "scroll":
            entry["deltaX"] = ev.get("deltaX", 0)
            entry["deltaY"] = ev.get("deltaY", 0)
        elif t == "keydown":
            entry["key"] = ev.get("key", "")
        cleaned.append(entry)
    return cleaned


def _parse_response(raw: str) -> tuple[str, str]:
    """Extract gherkin and typescript blocks from Gemini response."""
    gherkin_match = re.search(r"```(?:gherkin|feature)\n(.*?)```", raw, re.DOTALL)
    ts_match      = re.search(r"```(?:typescript|ts)\n(.*?)```",    raw, re.DOTALL)

    bdd        = gherkin_match.group(1).strip() if gherkin_match else raw
    playwright = ts_match.group(1).strip()      if ts_match      else raw

    return bdd, playwright


def generate_tests_for_flow(flow_id: str) -> dict:
    with db.get_session() as session:
        flow = get_flow_by_id(session, flow_id)
        if not flow:
            raise FileNotFoundError(f"Flow {flow_id} not found in database")
        events = load_flow_events(flow.events_path)
        fps = flow.fps
        mp4_path = Path(flow.video_path) if flow.video_path else (FLOWS_DIR / flow_id / f"{flow_id}.mp4")

    if not mp4_path.exists():
        raise FileNotFoundError(f"MP4 not found for flow {flow_id}")

    clean_events = _format_events(events)
    events_json  = json.dumps(clean_events, indent=2)

    print(f"[tests] uploading {mp4_path} to Gemini...")
    file_uri = upload_clip(str(mp4_path))

    print(f"[tests] calling Gemini for flow {flow_id}...")
    prompt = TEST_GENERATION_PROMPT.format(events_json=events_json)
    raw    = _call_gemini(file_uri, prompt, fps=fps)

    bdd, playwright = _parse_response(raw)

    with db.get_session() as session:
        saved = upsert_generated_tests(
            session=session,
            flow_id=flow_id,
            bdd_text=bdd,
            playwright_text=playwright,
            model_name="gemini-3.1-pro-preview",
        )
        if not saved:
            raise FileNotFoundError(f"Flow {flow_id} not found in database")
    print(f"[tests] saved tests to Postgres for flow {flow_id}")

    return {"flow_id": flow_id, "bdd": bdd, "playwright": playwright}
