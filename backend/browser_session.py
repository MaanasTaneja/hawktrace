import asyncio
import base64
import json
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from playwright.async_api import async_playwright

router = APIRouter()

VIEWPORT_W = 1280
VIEWPORT_H = 720
FLOWS_DIR = Path("flows")


class FlowRecorder:
    def __init__(self):
        self.recording = False
        self.flow_id: str | None = None
        self.flow_dir: Path | None = None
        self.frame_count = 0
        self.events: list[dict] = []
        self.frame_timestamps: list[float] = []  # perf_counter ts for each saved frame
        self._start_perf: float = 0.0
        self._start_wall: float = 0.0

    def start(self) -> str:
        #create new flow id.. uuid
        self.flow_id = uuid.uuid4().hex[:10]
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

    def stop(self) -> dict:
        self.recording = False
        assert self.flow_dir is not None

        from db import flows_col
        processed_events = self._assign_video_times(self._compress_scrolls(self.events))
        flows_col().insert_one({
            "flow_id":     self.flow_id,
            "started_at":  self._start_wall,
            "fps":         20,
            "frame_count": self.frame_count,
            "event_count": len(processed_events),
            "events":      processed_events,
            "tests":       None,
        })

        mp4_path = self._encode_mp4()

        import shutil
        shutil.rmtree(self.flow_dir / "frames")

        return {
            "flow_id": self.flow_id,
            "frame_count": self.frame_count,
            "mp4": str(mp4_path),
            "events": str(events_path),
        }

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


#main browser session endpoint sets up plyarwritgha nd displays pictures on the frotnend 
@router.websocket("/ws/browser")
async def browser_session(websocket: WebSocket):
    await websocket.accept()
    recorder = FlowRecorder()

    #init flow recorder.

    #initalize new playwritght session.

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H}
        )
        page = await context.new_page()
        client = await context.new_cdp_session(page)

        frame_queue: asyncio.Queue = asyncio.Queue(maxsize=8)


        #this queue is for diplay only.
        async def on_frame(params):
            #display and also save frame. 
            recorder.save_frame(params["data"])
            if not frame_queue.full():
                await frame_queue.put(params)

        #screen shot frame. (on frame we check if queu is ful, if it is unload the oldest frames)
        client.on("Page.screencastFrame", on_frame)
        await client.send(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 75,
                "maxWidth": VIEWPORT_W,
                "maxHeight": VIEWPORT_H,
                "everyNthFrame": 1,
            },
        )

        #async funciton to send frames to frontend via webscoket.
        async def send_frames():
            while True:
                params = await frame_queue.get()
                try:
                    await websocket.send_json(
                        {"type": "frame", "data": params["data"]}
                    )
                    await client.send(
                        "Page.screencastFrameAck",
                        {"sessionId": params["sessionId"]},
                    )
                except Exception:
                    return

        #handle any user events from the frtonoend.
        async def handle_events():
            loop = asyncio.get_event_loop()
            while True:
                try:
                    #frontned will keep sptting out texts via websocket for events and input.
                    raw = await websocket.receive_text()
                except (WebSocketDisconnect, Exception):
                    return

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                t = msg.get("type")

                # flow control
                #if we are in crecord flow mode then we must record as well.
                if t == "start_flow":
                    flow_id = recorder.start()
                    await websocket.send_json(
                        {"type": "flow_started", "flow_id": flow_id}
                    )
                    continue

                if t == "end_flow":
                    if recorder.recording:
                        result = await loop.run_in_executor(None, recorder.stop)
                        await websocket.send_json({"type": "flow_ended", **result})
                    continue

                # record the event before executing it
                recorder.record_event(msg)

                #after recording the events, we can run it in our paywrigtn. seession.
                try:
                    if t == "navigate":
                        url = msg["url"]
                        if not url.startswith("http"):
                            url = "https://" + url
                        await page.goto(
                            url, wait_until="domcontentloaded", timeout=15000
                        )
                    elif t == "click":
                        await page.mouse.click(msg["x"], msg["y"])
                    elif t == "dblclick":
                        await page.mouse.dblclick(msg["x"], msg["y"])
                    elif t == "scroll":
                        await page.mouse.wheel(msg["deltaX"], msg["deltaY"])
                    elif t == "keydown":
                        key = msg["key"]
                        if len(key) == 1:
                            await page.keyboard.type(key)
                        else:
                            await page.keyboard.press(key)
                except Exception as e:
                    print(f"[browser] event error: {e}")

        #our multi threaded taks.
        send_task = asyncio.create_task(send_frames())
        recv_task = asyncio.create_task(handle_events())

        try:
            await asyncio.wait(
                [send_task, recv_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
        finally:
            send_task.cancel()
            recv_task.cancel()
            await browser.close()
