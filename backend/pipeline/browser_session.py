import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from playwright.async_api import async_playwright

from auth import get_user_from_token
from pipeline.flows_recorder import FlowRecorder, VIEWPORT_H, VIEWPORT_W

router = APIRouter()

# ---------------------------------------------------------------------------
# DOM enrichment helpers — run in the page via page.evaluate
# ---------------------------------------------------------------------------

_GET_ELEMENT_AT_JS = """
([x, y]) => {
    let el = document.elementFromPoint(x, y);
    if (!el) return null;

    // Step 1: bubble up to the nearest interactive ancestor so we never
    // target an svg/path/span that is just decorating a button or link.
    const INTERACTIVE = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [tabindex]';
    const interactive = el.closest(INTERACTIVE);
    if (interactive) el = interactive;

    // Step 2: build the best own-selector for this element.
    // Priority: id > data-testid > aria-label > name > placeholder > type > visible text > tag
    const ownSelector = (el) => {
        const tag = el.tagName.toLowerCase();
        if (el.id) return '#' + el.id;
        if (el.getAttribute('data-testid')) return tag + '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.getAttribute('aria-label')) return tag + '[aria-label="' + el.getAttribute('aria-label') + '"]';
        if (el.name) return tag + '[name="' + el.name + '"]';
        if (el.placeholder) return tag + '[placeholder="' + el.placeholder + '"]';
        if (el.type && el.type !== 'text') return tag + '[type="' + el.type + '"]';
        const text = (el.innerText || '').trim().slice(0, 40);
        if (text) return tag + ':text("' + text.replace(/"/g, '\\"') + '")';
        return tag;
    };

    // Step 3: scope with nearest identified ancestor (has id or data-testid)
    // so ambiguous selectors like "button[type=submit]" become "#form button[type=submit]".
    const scopeEl = el.parentElement && el.parentElement.closest('[id], [data-testid]');
    const scope = scopeEl
        ? (scopeEl.id ? '#' + scopeEl.id : '[data-testid="' + scopeEl.getAttribute('data-testid') + '"]')
        : null;

    const own = ownSelector(el);
    const tag = el.tagName.toLowerCase();
    return {
        tag: tag,
        text: (el.innerText || '').trim().slice(0, 80) || null,
        placeholder: el.placeholder || null,
        name: el.name || null,
        id: el.id || null,
        input_type: el.type || null,
        aria_label: el.getAttribute('aria-label') || null,
        title: el.getAttribute('title') || el.title || null,
        selector: scope ? scope + ' ' + own : own,
        page_url: window.location.href
    };
}
"""

_GET_ACTIVE_ELEMENT_JS = """
() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    const tag = el.tagName.toLowerCase();
    if (!['input', 'textarea', 'select'].includes(tag) && !el.isContentEditable) return null;
    const getSelector = (el) => {
        const tag = el.tagName.toLowerCase();
        if (el.id) return '#' + el.id;
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.name) return tag + '[name="' + el.name + '"]';
        if (el.placeholder) return tag + '[placeholder="' + el.placeholder + '"]';
        if (el.type && el.type !== 'text') return tag + '[type="' + el.type + '"]';
        return tag;
    };
    const value = el.value !== undefined ? el.value : (el.innerText || '');
    return {
        tag: tag,
        value: value,
        placeholder: el.placeholder || null,
        name: el.name || null,
        id: el.id || null,
        input_type: el.type || null,
        selector: getSelector(el),
        page_url: window.location.href
    };
}
"""


async def _get_element_at(page, x: int, y: int) -> dict | None:
    try:
        return await page.evaluate(_GET_ELEMENT_AT_JS, [x, y])
    except Exception:
        return None


async def _get_active_element(page) -> dict | None:
    try:
        return await page.evaluate(_GET_ACTIVE_ELEMENT_JS)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _extract_ws_token(websocket: WebSocket) -> str | None:
    qp_token = websocket.query_params.get("token")
    if qp_token:
        return qp_token
    auth_header = websocket.headers.get("authorization", "")
    prefix = "bearer "
    if auth_header.lower().startswith(prefix):
        return auth_header[len(prefix):].strip()
    return None


# ---------------------------------------------------------------------------
# WebSocket handler
# ---------------------------------------------------------------------------

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

            # pending_fill tracks a partially-typed input field.
            # Flushed (recorded) when focus moves away, Enter is pressed,
            # or the flow ends — giving us one clean "fill" event per field
            # instead of a stream of raw keydowns.
            pending_fill: dict | None = None

            async def flush_fill():
                nonlocal pending_fill
                if pending_fill:
                    recorder.record_event(pending_fill)
                    pending_fill = None

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

                # ── flow control ────────────────────────────────────────────
                if t == "start_flow":
                    flow_id = recorder.start(current_user.id)
                    # Inject the current page URL as the first event so the
                    # agent knows where to navigate before replaying steps
                    current_url = page.url
                    if current_url and current_url not in ("about:blank", ""):
                        recorder.record_event({"type": "navigate", "url": current_url})
                    await websocket.send_json({"type": "flow_started", "flow_id": flow_id})
                    continue

                if t == "end_flow":
                    if recorder.recording:
                        try:
                            await flush_fill()
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

                # ── browser actions with enrichment ─────────────────────────
                try:
                    if t in ("click", "dblclick"):
                        x, y = msg["x"], msg["y"]

                        # flush typed text before moving focus
                        await flush_fill()

                        if t == "click":
                            await page.mouse.click(x, y)
                        else:
                            await page.mouse.dblclick(x, y)

                        # enrich with DOM element at click coords
                        element = await _get_element_at(page, x, y)
                        enriched = {"type": t, "x": x, "y": y}
                        if element:
                            enriched["element"] = element
                        recorder.record_event(enriched)

                    elif t == "keydown":
                        key = msg["key"]
                        is_printable = len(key) == 1

                        if is_printable:
                            await page.keyboard.type(key)
                        else:
                            await page.keyboard.press(key)

                        # after keystroke, read the active element's current value
                        active = await _get_active_element(page)

                        if active:
                            # update pending fill with latest value
                            el_meta = {k: v for k, v in active.items() if k != "value"}
                            is_password = active.get("input_type") == "password"
                            pending_fill = {
                                "type": "fill",
                                "value": "{{secret:PASSWORD}}" if is_password else active["value"],
                                "element": el_meta,
                            }
                        else:
                            pending_fill = None

                        # Enter / Tab — flush fill, then record the key separately
                        # so we know a form was submitted or focus moved
                        if key in ("Enter", "Tab"):
                            await flush_fill()
                            recorder.record_event({"type": "keydown", "key": key})

                        # Escape — just flush, don't record separately
                        elif key == "Escape":
                            await flush_fill()

                        # all other non-printable specials (arrows, etc.) — record as-is
                        elif not is_printable:
                            recorder.record_event({"type": "keydown", "key": key})

                        # printable keys are NOT recorded individually —
                        # they accumulate into pending_fill above

                    elif t == "navigate":
                        # flush any typed text before navigation
                        await flush_fill()
                        url = msg["url"]
                        if not url.startswith("http"):
                            url = "https://" + url
                        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                        recorder.record_event({"type": "navigate", "url": url})

                    elif t == "scroll":
                        await page.mouse.wheel(msg["deltaX"], msg["deltaY"])
                        recorder.record_event({
                            "type": "scroll",
                            "deltaX": msg["deltaX"],
                            "deltaY": msg["deltaY"],
                        })

                except Exception as e:
                    print(f"[browser] event error ({t}): {e}")

        send_task = asyncio.create_task(send_frames())
        recv_task = asyncio.create_task(handle_events())

        try:
            await asyncio.wait([send_task, recv_task], return_when=asyncio.FIRST_COMPLETED)
        finally:
            send_task.cancel()
            recv_task.cancel()
            await browser.close()
