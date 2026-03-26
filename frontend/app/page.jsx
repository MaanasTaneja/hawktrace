"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const WS_URL = API_URL.replace(/^http/, "ws");

const BROWSER_W = 1280;
const BROWSER_H = 720;

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

const EVENT_LABEL = {
  navigate: (e) => `→ ${e.url}`,
  click:    (e) => `Click (${Math.round(e.x)}, ${Math.round(e.y)})`,
  dblclick: (e) => `Dbl-click (${Math.round(e.x)}, ${Math.round(e.y)})`,
  scroll:   (e) => `Scroll Δ${e.deltaY}`,
  keydown:  (e) => `Key: ${e.key}`,
};

const EVENT_COLOR = {
  navigate: "#4a90d9",
  click:    "#fbbf24",
  dblclick: "#f97316",
  scroll:   "#a78bfa",
  keydown:  "#34d399",
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function FlowSidebar({ flows, selectedId, onSelect, onRefresh }) {
  return (
    <div style={s.sidebar}>
      <div style={s.sidebarHeader}>
        <span style={s.sidebarTitle}>FLOWS</span>
        <button onClick={onRefresh} title="Refresh" style={s.refreshBtn}>↻</button>
      </div>
      <div style={s.sidebarList}>
        {flows.length === 0 && (
          <div style={s.sidebarEmpty}>No flows recorded yet</div>
        )}
        {flows.map((f) => (
          <div
            key={f.flow_id}
            onClick={() => onSelect(f.flow_id === selectedId ? null : f.flow_id)}
            style={{
              ...s.flowItem,
              background: f.flow_id === selectedId ? "#252525" : "transparent",
              borderLeft: `2px solid ${f.flow_id === selectedId ? "#4a90d9" : "transparent"}`,
            }}
          >
            <div style={s.flowId}>{f.flow_id}</div>
            <div style={s.flowMeta}>
              {f.frame_count} frames · {f.event_count} events
            </div>
            <div style={s.flowTime}>
              {new Date(f.started_at * 1000).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Flow Viewer ─────────────────────────────────────────────────────────────
function FlowViewer({ flowId }) {
  const videoRef     = useRef(null);
  const eventListRef = useRef(null);
  const [eventsData, setEventsData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);

  const videoUrl = `${API_URL}/flows/${flowId}/video`;

  useEffect(() => {
    setEventsData(null);
    setCurrentTime(0);
    fetch(`${API_URL}/flows/${flowId}/events`)
      .then((r) => r.json())
      .then(setEventsData)
      .catch(console.error);
  }, [flowId]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf;
    const tick = () => {
      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const seekTo = (t) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const evList = eventsData?.events ?? [];

  const currentEventIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < evList.length; i++) {
      if ((evList[i].video_t ?? evList[i].t) <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [evList, currentTime]);

  // auto-scroll event list to current event
  useEffect(() => {
    if (!eventListRef.current || currentEventIdx < 0) return;
    const el = eventListRef.current.querySelector(`[data-idx="${currentEventIdx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentEventIdx]);

  return (
    <div style={s.viewer}>
      {/* left: video + timeline */}
      <div style={s.viewerLeft}>
        <div style={s.videoBox}>
          <video
            ref={videoRef}
            src={videoUrl}
            onClick={() => (isPlaying ? videoRef.current.pause() : videoRef.current.play())}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.target.duration)}
            style={{ maxWidth: "100%", maxHeight: "100%", cursor: "pointer", borderRadius: 4 }}
          />
        </div>

        {/* scrubber */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo(Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration)));
          }}
          style={s.scrubber}
        >
          {/* played */}
          <div style={{ ...s.scrubberFill, width: duration ? `${(currentTime / duration) * 100}%` : 0 }} />
          {/* event markers */}
          {evList.map((ev, i) => (
            <div
              key={i}
              title={EVENT_LABEL[ev.type]?.(ev) ?? ev.type}
              style={{
                position: "absolute",
                left: duration ? `${((ev.video_t ?? ev.t) / duration) * 100}%` : 0,
                top: 4, bottom: 4,
                width: 2,
                borderRadius: 1,
                background: EVENT_COLOR[ev.type] ?? "#888",
                opacity: i === currentEventIdx ? 1 : 0.5,
              }}
            />
          ))}
          {/* playhead */}
          <div style={{ position: "absolute", left: duration ? `${(currentTime / duration) * 100}%` : 0, top: 0, bottom: 0, width: 2, background: "#ef4444", transform: "translateX(-1px)" }} />
          <span style={s.scrubberTime}>{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
      </div>

      {/* right: event list */}
      <div style={s.viewerRight}>
        <div style={s.viewerRightHeader}>
          EVENTS · {evList.length}
        </div>
        <div ref={eventListRef} style={s.eventList}>
          {evList.map((ev, i) => {
            const active = i === currentEventIdx;
            const label  = EVENT_LABEL[ev.type]?.(ev) ?? ev.type;
            const color  = EVENT_COLOR[ev.type] ?? "#888";
            return (
              <div
                key={i}
                data-idx={i}
                onClick={() => seekTo(ev.video_t ?? ev.t)}
                style={{
                  ...s.eventItem,
                  background: active ? "#252525" : "transparent",
                  borderLeft: `2px solid ${active ? color : "transparent"}`,
                }}
              >
                <span style={s.eventTime}>{fmt(ev.t)}</span>
                <span style={{ ...s.eventLabel, color: active ? "#ddd" : "#888" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [url, setUrl]           = useState("");
  const [connected, setConnected] = useState(false);
  const [frame, setFrame]       = useState(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus]     = useState(null);
  const [flows, setFlows]       = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(null);

  const wsRef      = useRef(null);
  const displayRef = useRef(null);
  const statusTimer = useRef(null);

  const showStatus = (msg) => {
    setStatus(msg);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 3000);
  };

  const fetchFlows = () =>
    fetch(`${API_URL}/flows`)
      .then((r) => r.json())
      .then(setFlows)
      .catch(() => {});

  useEffect(() => { fetchFlows(); }, []);

  // wheel listener — passive:false so preventDefault works
  useEffect(() => {
    const el = displayRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      send({ type: "scroll", deltaX: e.deltaX, deltaY: e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/browser`);
    ws.onopen  = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setRecording(false); };
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "frame") {
        setFrame(`data:image/jpeg;base64,${msg.data}`);
      } else if (msg.type === "flow_started") {
        setRecording(true);
        showStatus(`Recording ${msg.flow_id}`);
      } else if (msg.type === "flow_ended") {
        setRecording(false);
        showStatus(`Saved — ${msg.frame_count} frames`);
        fetchFlows();
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const send = (msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(msg));
  };

  const handleNavigate = (e) => {
    e.preventDefault();
    if (url.trim()) send({ type: "navigate", url: url.trim() });
  };

  const getCoords = (e) => {
    const rect = displayRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * BROWSER_W,
      y: ((e.clientY - rect.top) / rect.height) * BROWSER_H,
    };
  };

  const handleClick = (e) => {
    displayRef.current?.focus();
    send({ type: "click", ...getCoords(e) });
  };

  const handleDoubleClick = (e) => send({ type: "dblclick", ...getCoords(e) });

  const handleKeyDown = (e) => {
    if (e.target !== displayRef.current) return;
    e.preventDefault();
    send({ type: "keydown", key: e.key });
  };

  return (
    <div style={s.root}>
      <FlowSidebar
        flows={flows}
        selectedId={selectedFlowId}
        onSelect={setSelectedFlowId}
        onRefresh={fetchFlows}
      />

      <div style={s.main}>
        {/* top bar */}
        <div style={s.bar}>
          <span style={{ fontSize: 12, color: connected ? "#4caf50" : "#f44336" }}>●</span>
          <form onSubmit={handleNavigate} style={{ display: "flex", flex: 1, gap: 8 }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              style={s.input}
            />
            <button type="submit" style={s.goBtn}>Go</button>
          </form>
          {!recording ? (
            <button onClick={() => send({ type: "start_flow" })} disabled={!connected} style={s.markBtn}>
              ● Mark Flow
            </button>
          ) : (
            <button onClick={() => send({ type: "end_flow" })} style={s.endBtn}>
              ■ End Flow
            </button>
          )}
        </div>

        {recording && <div style={s.recBanner}>● RECORDING</div>}
        {status    && <div style={s.toast}>{status}</div>}

        {/* browser display */}
        <div style={s.viewport}>
          <div
            ref={displayRef}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            style={{
              aspectRatio: `${BROWSER_W} / ${BROWSER_H}`,
              height: "100%", maxHeight: "100%", maxWidth: "100%",
              cursor: "default", outline: recording ? "3px solid #e53e3e" : "none",
              borderRadius: 8, overflow: "hidden",
              boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
              background: "#000",
            }}
          >
            {frame ? (
              <img src={frame} draggable={false} style={{ width: "100%", height: "100%", display: "block" }} />
            ) : (
              <div style={s.placeholder}>
                {connected ? "Enter a URL above and press Go" : "Connecting to backend..."}
              </div>
            )}
          </div>
        </div>

        {/* flow viewer — shown when a flow is selected */}
        {selectedFlowId && <FlowViewer key={selectedFlowId} flowId={selectedFlowId} />}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "sans-serif", background: "#111" },

  // sidebar
  sidebar: { width: 220, background: "#181818", borderRight: "1px solid #252525", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarHeader: { padding: "12px 14px", borderBottom: "1px solid #252525", display: "flex", alignItems: "center", justifyContent: "space-between" },
  sidebarTitle: { color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 1 },
  refreshBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1 },
  sidebarList: { flex: 1, overflowY: "auto" },
  sidebarEmpty: { padding: 16, color: "#333", fontSize: 12, textAlign: "center" },
  flowItem: { padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #202020" },
  flowId: { color: "#ccc", fontSize: 12, fontFamily: "monospace", marginBottom: 3 },
  flowMeta: { color: "#555", fontSize: 11 },
  flowTime: { color: "#3a3a3a", fontSize: 10, marginTop: 2 },

  // main area
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  bar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1e1e1e", borderBottom: "1px solid #2a2a2a", flexShrink: 0 },
  input: { flex: 1, padding: "6px 12px", borderRadius: 6, border: "1px solid #444", background: "#2a2a2a", color: "#fff", fontSize: 14, outline: "none" },
  goBtn: { padding: "6px 18px", borderRadius: 6, background: "#4a90d9", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  markBtn: { padding: "6px 14px", borderRadius: 6, background: "#2d2d2d", color: "#e53e3e", border: "1px solid #e53e3e", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 },
  endBtn: { padding: "6px 14px", borderRadius: 6, background: "#e53e3e", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 },
  recBanner: { background: "#e53e3e", color: "#fff", textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: "3px 0", flexShrink: 0 },
  toast: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#2a2a2a", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 13, border: "1px solid #444", zIndex: 999, pointerEvents: "none" },
  viewport: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: 12, overflow: "hidden", minHeight: 0 },
  placeholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 15, background: "#181818" },

  // viewer
  viewer: { height: 320, display: "flex", borderTop: "1px solid #252525", background: "#141414", flexShrink: 0 },
  viewerLeft: { width: "42%", display: "flex", flexDirection: "column", borderRight: "1px solid #252525" },
  videoBox: { flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 8 },
  scrubber: { height: 36, background: "#1a1a1a", position: "relative", cursor: "pointer", flexShrink: 0, borderTop: "1px solid #252525" },
  scrubberFill: { position: "absolute", left: 0, top: 0, bottom: 0, background: "rgba(74,144,217,0.25)" },
  scrubberTime: { position: "absolute", bottom: 4, right: 8, fontSize: 9, color: "#444", fontFamily: "monospace", pointerEvents: "none" },
  viewerRight: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  viewerRightHeader: { padding: "8px 12px", borderBottom: "1px solid #252525", color: "#444", fontSize: 11, fontWeight: 700, letterSpacing: 1, flexShrink: 0 },
  eventList: { flex: 1, overflowY: "auto" },
  eventItem: { padding: "5px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "baseline" },
  eventTime: { color: "#444", fontSize: 10, fontFamily: "monospace", flexShrink: 0 },
  eventLabel: { fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};
