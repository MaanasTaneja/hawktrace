import base64
import json
import time
import uuid
from pathlib import Path
from typing import Optional

from database.ht_flows import db, upsert_recorded_flow

VIEWPORT_W = 1280
VIEWPORT_H = 720
FLOWS_DIR = Path("flows")


class FlowRecorder:
    def __init__(self):
        self.recording = False
        self.user_id: Optional[int] = None
        self.flow_id: Optional[str] = None
        self.flow_dir: Optional[Path] = None
        self.frame_count = 0
        self.events: list[dict] = []
        self.frame_timestamps: list[float] = []  # perf_counter ts for each saved frame
        self._start_perf: float = 0.0
        self._start_wall: float = 0.0

    def start(self, user_id: int) -> str:
        #create new flow id.. uuid
        self.user_id = user_id
        self.flow_id = str(uuid.uuid4())
        #create new firectry (setup directory path)
        self.flow_dir = FLOWS_DIR / self.flow_id
        (self.flow_dir / "frames").mkdir(parents=True, exist_ok=True)
        self.frame_count = 0
        self.events = []
        self.frame_timestamps = []
        self._start_perf = time.perf_counter()
        self._start_wall = time.time()
        self.recording = True
        #start recording.
        return self.flow_id

    def save_frame(self, jpeg_b64: str):
        #we only save frame if we are in recording mode, even if we run this funciton
        #at each display webscoket send, we will not store until we are recoridng.
        if not self.recording or self.flow_dir is None:
            return
        #simmilar to how we record event ts, this records frame ts.
        ts = time.perf_counter() - self._start_perf
        frame_bytes = base64.b64decode(jpeg_b64)
        path = self.flow_dir / "frames" / f"{self.frame_count:07d}.jpg"
        path.write_bytes(frame_bytes)
        self.frame_timestamps.append(ts)
        self.frame_count += 1

    def record_event(self, event: dict):
        if not self.recording:
            return
        entry = dict(event)
        entry["t"] = time.perf_counter() - self._start_perf
        #proper timestamp, both frames and input are recorded based on this timestamp only
        entry["wall"] = time.time()
        self.events.append(entry)

    def _assign_video_times(self, events: list[dict]) -> list[dict]:
        """
        For each event, find the first frame captured at or after event.t and
        store video_t = frame_index / fps.  This corrects for variable CDP frame
        delivery latency so the viewer seeks to the frame that actually shows the
        visual result of the action.
        """
        ts = self.frame_timestamps
        fps = 20
        if not ts:
            return events
        result = []
        for ev in events:
            # binary search for first frame_ts >= ev["t"]
            lo, hi, idx = 0, len(ts) - 1, len(ts) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if ts[mid] >= ev["t"]:
                    idx = mid
                    hi = mid - 1
                else:
                    lo = mid + 1
            entry = dict(ev)
            entry["video_t"] = round(idx / fps, 4)
            result.append(entry)
        return result

    @staticmethod
    def _compress_scrolls(events: list[dict], threshold: float = 0.15) -> list[dict]:
        """Collapse consecutive scroll events within threshold seconds into one."""
        result = []
        i = 0
        while i < len(events):
            ev = events[i]
            if ev["type"] != "scroll":
                result.append(ev)
                i += 1
                continue
            # accumulate this scroll group
            acc_x = ev["deltaX"]
            acc_y = ev["deltaY"]
            j = i + 1
            while j < len(events):
                nxt = events[j]
                if nxt["type"] != "scroll":
                    break
                if nxt["t"] - events[j - 1]["t"] > threshold:
                    break
                acc_x += nxt["deltaX"]
                acc_y += nxt["deltaY"]
                j += 1
            merged = dict(ev)
            merged["deltaX"] = acc_x
            merged["deltaY"] = acc_y
            result.append(merged)
            i = j
        return result

    def stop_fast(self) -> dict:
        """Stop recording and persist events to DB. Returns immediately."""
        self.recording = False
        assert self.flow_dir is not None
        assert self.user_id is not None

        processed_events = self._assign_video_times(self._compress_scrolls(self.events))
        events_path = self.flow_dir / "events.json"
        events_path.write_text(json.dumps(processed_events, ensure_ascii=True), encoding="utf-8")

        video_path = self.flow_dir / f"{self.flow_id}.mp4"
        with db.get_session() as session:
            upsert_recorded_flow(
                session=session,
                flow_id=self.flow_id,
                user_id=self.user_id,
                started_at_epoch=self._start_wall,
                fps=20,
                frame_count=self.frame_count,
                event_count=len(processed_events),
                events_path=str(events_path),
                video_path=str(video_path),
                flow_name=self.flow_id,
            )

        return {
            "flow_id": self.flow_id,
            "frame_count": self.frame_count,
        }

    def encode_and_cleanup(self):
        """Encode MP4 and delete raw frames. Run in a background thread."""
        try:
            self._encode_mp4()
        except Exception as e:
            print(f"[flow] mp4 encode error: {e}")
        finally:
            import shutil
            if self.flow_dir and (self.flow_dir / "frames").exists():
                shutil.rmtree(self.flow_dir / "frames")

    def _encode_mp4(self) -> Path:
        import av
        import numpy as np
        from PIL import Image

        frames_dir = self.flow_dir / "frames"
        frame_files = sorted(frames_dir.glob("*.jpg"))

        if not frame_files:
            raise ValueError("No frames recorded in this flow")

        first = Image.open(frame_files[0]).convert("RGB")
        width, height = first.size

        mp4_path = self.flow_dir / f"{self.flow_id}.mp4"
        container = av.open(str(mp4_path), mode="w")
        stream = container.add_stream(codec_name="h264", rate=20)
        stream.width = width
        stream.height = height
        stream.pix_fmt = "yuv420p"

        for f in frame_files:
            img = Image.open(f).convert("RGB")
            frame = av.VideoFrame.from_ndarray(np.array(img), format="rgb24")
            for packet in stream.encode(frame):
                container.mux(packet)

        for packet in stream.encode():
            container.mux(packet)

        container.close()
        print(f"[flow] saved {mp4_path}")
        return mp4_path
