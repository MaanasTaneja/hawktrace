from google import genai
from google.genai import types
import json
import mimetypes
import os
import re
import time
from dotenv import load_dotenv

load_dotenv()

_gemini_client = None

def _get_client() -> genai.Client:
    global _gemini_client

    if not _gemini_client:
        #then create client
        _gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _gemini_client

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



