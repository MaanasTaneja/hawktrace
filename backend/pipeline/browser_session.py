import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from playwright.async_api import async_playwright

from auth import get_user_from_token
from pipeline.flows_recorder import FlowRecorder, VIEWPORT_H, VIEWPORT_W

router = APIRouter()


def _extract_ws_token(websocket: WebSocket) -> str | None:
    qp_token = websocket.query_params.get("token")
    if qp_token:
        return qp_token
    auth_header = websocket.headers.get("authorization", "")
    prefix = "bearer "
    if auth_header.lower().startswith(prefix):
        return auth_header[len(prefix):].strip()
    return None


@router.websocket("/ws/browser")
async def browser_session(websocket: WebSocket):
    await websocket.accept()

    token = _extract_ws_token(websocket)
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return

    try:
        current_user = get_user_from_token(token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid auth token")
        return

    recorder = FlowRecorder()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H}
        )
        page = await context.new_page()
        client = await context.new_cdp_session(page)

        frame_queue: asyncio.Queue = asyncio.Queue(maxsize=8)

        async def on_frame(params):
            recorder.save_frame(params["data"])
            if not frame_queue.full():
                await frame_queue.put(params)

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

        async def send_frames():
            while True:
                params = await frame_queue.get()
                try:
                    await websocket.send_json({"type": "frame", "data": params["data"]})
                    await client.send(
                        "Page.screencastFrameAck",
                        {"sessionId": params["sessionId"]},
                    )
                except Exception:
                    return

        async def handle_events():
            loop = asyncio.get_event_loop()
            while True:
                try:
                    raw = await websocket.receive_text()
                except (WebSocketDisconnect, Exception):
                    return

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                t = msg.get("type")

                if t == "start_flow":
                    flow_id = recorder.start(current_user.id)
                    await websocket.send_json({"type": "flow_started", "flow_id": flow_id})
                    continue

                if t == "end_flow":
                    if recorder.recording:
                        try:
                            result = await loop.run_in_executor(None, recorder.stop_fast)
                            await websocket.send_json({"type": "flow_ended", **result})
                            fid = result["flow_id"]

                            async def _encode_then_notify(flow_id=fid):
                                await loop.run_in_executor(None, recorder.encode_and_cleanup)
                                try:
                                    await websocket.send_json({"type": "mp4_ready", "flow_id": flow_id})
                                except Exception:
                                    pass

                            asyncio.create_task(_encode_then_notify())
                        except Exception as e:
                            print(f"[flow] stop error: {e}")
                            await websocket.send_json(
                                {"type": "flow_ended", "flow_id": recorder.flow_id, "error": str(e)}
                            )
                    continue

                recorder.record_event(msg)

                try:
                    if t == "navigate":
                        url = msg["url"]
                        if not url.startswith("http"):
                            url = "https://" + url
                        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
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

        send_task = asyncio.create_task(send_frames())
        recv_task = asyncio.create_task(handle_events())

        try:
            await asyncio.wait([send_task, recv_task], return_when=asyncio.FIRST_COMPLETED)
        finally:
            send_task.cancel()
            recv_task.cancel()
            await browser.close()
