import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Circle, Square, Monitor, Trash2, Pencil, Check, X } from 'lucide-react';
import logo from '../assets/HawkTrace-Logo.png';

const BACKEND_WS = 'ws://localhost:8001/ws/browser';
const BACKEND_HTTP = 'http://localhost:8001';

type ConnStatus = 'connecting' | 'connected' | 'disconnected';
type RecordingState = 'idle' | 'recording';

interface FlowMeta {
  flow_id: string;
  name?: string;
  frame_count: number;
  event_count: number;
  has_tests: boolean;
  started_at: number;
}

interface BrowserSessionProps {
  onBack: () => void;
  onViewTests: (flowId: string) => void;
}

export const BrowserSession: React.FC<BrowserSessionProps> = ({ onBack, onViewTests }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting');
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [flows, setFlows] = useState<FlowMeta[]>([]);
  const [newFlowId, setNewFlowId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [encodingIds, setEncodingIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadFlows = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_HTTP}/flows/`);
      const data = await res.json();
      if (mountedRef.current) setFlows(data);
    } catch {}
  }, []);

  const handleDeleteFlow = useCallback(async (flowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${BACKEND_HTTP}/flows/${flowId}`, { method: 'DELETE' });
      setFlows(prev => prev.filter(f => f.flow_id !== flowId));
    } catch {}
  }, []);

  const startRename = useCallback((flow: FlowMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(flow.flow_id);
    setRenameValue(flow.name ?? flow.flow_id);
  }, []);

  const commitRename = useCallback(async (flowId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      try {
        await fetch(`${BACKEND_HTTP}/flows/${flowId}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        setFlows(prev => prev.map(f => f.flow_id === flowId ? { ...f, name: trimmed } : f));
      } catch {}
    }
    setRenamingId(null);
  }, [renameValue]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  useEffect(() => {
    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;
      setConnStatus('connecting');
      const ws = new WebSocket(BACKEND_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) setConnStatus('connected');
      };
      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnStatus('disconnected');
        reconnectRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        if (mountedRef.current) setConnStatus('disconnected');
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'frame') {
            setCurrentFrame(msg.data);
          } else if (msg.type === 'flow_started') {
            // flow_id confirmed
          } else if (msg.type === 'flow_ended') {
            if (!mountedRef.current) return;
            if (msg.flow_id) {
              setNewFlowId(msg.flow_id);
              setEncodingIds(prev => new Set(prev).add(msg.flow_id));
            }
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            loadFlows();
          } else if (msg.type === 'mp4_ready') {
            if (!mountedRef.current) return;
            setEncodingIds(prev => { const s = new Set(prev); s.delete(msg.flow_id); return s; });
          }
        } catch {}
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      wsRef.current?.close();
    };
  }, [loadFlows]);

  const sendWs = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleNavigate = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const url = trimmed.startsWith('http') ? trimmed : 'https://' + trimmed;
    sendWs({ type: 'navigate', url });
    setCurrentUrl(url);
  };

  const handleStartFlow = () => {
    sendWs({ type: 'start_flow' });
    setRecordingState('recording');
    setRecordingSeconds(0);
    setEventCount(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1);
    }, 1000);
  };

  const handleEndFlow = () => {
    sendWs({ type: 'end_flow' });
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState('idle');
    setRecordingSeconds(0);
    setEventCount(0);
  };

  const handleStreamClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!streamRef.current) return;
    const rect = streamRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 720);
    sendWs({ type: 'click', x, y });
    if (recordingState === 'recording') setEventCount(c => c + 1);
    streamRef.current.focus();
  };

  const handleStreamWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    sendWs({ type: 'scroll', deltaX: Math.round(e.deltaX), deltaY: Math.round(e.deltaY) });
    if (recordingState === 'recording') setEventCount(c => c + 1);
  };

  const handleStreamKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return;
    e.preventDefault();
    sendWs({ type: 'keydown', key: e.key });
    if (recordingState === 'recording') setEventCount(c => c + 1);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const statusColor = connStatus === 'connected' ? 'bg-green-500'
    : connStatus === 'connecting' ? 'bg-yellow-400'
    : 'bg-red-400';
  const statusLabel = connStatus === 'connected' ? 'Connected'
    : connStatus === 'connecting' ? 'Connecting...'
    : 'Disconnected';

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] font-sans">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-[280px] bg-white border-r border-[#F0EDE8] flex flex-col fixed h-screen z-20">
        <div className="p-8 pb-6 border-b border-[#F0EDE8]">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={logo} alt="HawkTrace" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-serif font-black text-ink tracking-tight">HawkTrace</h1>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[11px] font-sans font-black text-mid uppercase tracking-widest hover:text-ink transition-colors"
          >
            <ArrowLeft size={12} />
            Back to Dashboard
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] font-sans font-black text-dim uppercase tracking-widest mb-3 px-2">
            Saved Flows
          </p>
          {flows.length === 0 ? (
            <p className="text-[13px] text-dim font-sans px-2 py-4 leading-relaxed">
              No flows yet. Record your first flow.
            </p>
          ) : (
            <div className="space-y-1">
              {flows.map((flow) => (
                <motion.div
                  key={flow.flow_id}
                  initial={flow.flow_id === newFlowId ? { opacity: 0, x: -12, backgroundColor: 'rgba(229,98,42,0.08)' } : false}
                  animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                  transition={{ duration: 0.4 }}
                  onClick={() => renamingId !== flow.flow_id && onViewTests(flow.flow_id)}
                  className="w-full text-left px-3 py-3 rounded-xl hover:bg-[#FAF9F6] transition-all border border-transparent hover:border-sand group cursor-pointer"
                >
                  {/* Name row */}
                  <div className="flex items-center justify-between mb-1 gap-1">
                    {renamingId === flow.flow_id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(flow.flow_id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => commitRename(flow.flow_id)}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-[11px] font-mono font-bold text-ink bg-transparent border-b border-burnt/40 outline-none min-w-0"
                      />
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-ink group-hover:text-burnt transition-colors truncate">
                        {flow.name ?? flow.flow_id}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {encodingIds.has(flow.flow_id) ? (
                        <span className="text-[9px] font-mono text-dim animate-pulse">encoding…</span>
                      ) : (
                        <span className={`w-2 h-2 rounded-full ${flow.has_tests ? 'bg-green-500' : 'bg-burnt'}`} />
                      )}
                      <button
                        onClick={e => startRename(flow, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-ink"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={e => handleDeleteFlow(flow.flow_id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-dim hover:text-red-500"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  {/* Sub-row */}
                  {flow.name && (
                    <p className="text-[9px] font-mono text-dim truncate mb-1">{flow.flow_id}</p>
                  )}
                  <div className="flex gap-3">
                    <span className="text-[10px] font-sans text-dim">{flow.frame_count} frames</span>
                    <span className="text-[10px] font-sans text-dim">{flow.event_count} events</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 ml-[280px] flex flex-col h-screen overflow-hidden">

        {/* Top bar */}
        <div className="h-14 bg-white border-b border-[#F0EDE8] flex items-center px-6 gap-4 shrink-0 z-10">
          {/* Connection status */}
          <div className="flex items-center gap-2 w-36 shrink-0">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${connStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            <span className="text-[11px] font-mono font-bold text-mid uppercase tracking-widest">{statusLabel}</span>
          </div>

          {/* URL bar */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex items-center bg-[#FAF9F6] border border-sand rounded-full px-4 py-1.5 gap-2 focus-within:border-burnt/40 transition-colors">
              <Monitor size={13} className="text-dim shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                placeholder="Enter URL and press Go"
                className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-dim outline-none font-sans"
              />
            </div>
            <button
              onClick={handleNavigate}
              disabled={connStatus !== 'connected'}
              className="bg-burnt/10 border border-burnt/20 text-burnt text-[12px] font-sans font-bold px-4 py-1.5 rounded-full hover:bg-burnt/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>

          {/* Flow controls */}
          <div className="flex items-center gap-3 shrink-0">
            {recordingState === 'recording' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[12px] font-mono font-bold text-ink tabular-nums">{formatTimer(recordingSeconds)}</span>
                <span className="text-[10px] font-mono text-mid bg-[#FAF9F6] border border-sand px-2 py-0.5 rounded-full">
                  {eventCount} events
                </span>
              </div>
            )}
            {recordingState === 'idle' ? (
              <button
                onClick={handleStartFlow}
                disabled={connStatus !== 'connected'}
                className="bg-burnt/10 border border-burnt/20 text-burnt text-[12px] font-sans font-bold px-4 py-1.5 rounded-full hover:bg-burnt/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Circle size={9} fill="currentColor" />
                Start Flow
              </button>
            ) : (
              <button
                onClick={handleEndFlow}
                className="bg-red-50 border border-red-200 text-red-600 text-[12px] font-sans font-bold px-4 py-1.5 rounded-full hover:bg-red-100 transition-all flex items-center gap-1.5"
              >
                <Square size={9} fill="currentColor" />
                End Flow
              </button>
            )}
          </div>
        </div>

        {/* Recording banner */}
        <AnimatePresence>
          {recordingState === 'recording' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 32, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-burnt/10 border-b border-burnt/20 flex items-center justify-center shrink-0 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-burnt animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-burnt uppercase tracking-widest">
                  Recording — go through your flow naturally
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browser stream area */}
        <div className="flex-1 bg-[#EDEAE4] flex items-center justify-center p-8 overflow-hidden">
          <div
            className={`relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
              recordingState === 'recording' ? 'recording-glow' : 'shadow-black/10'
            }`}
          >
            {/* Browser chrome */}
            <div className="bg-[#2B2B2B] px-4 py-3 flex items-center gap-3">
              {/* Mac dots */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              {/* URL bar */}
              <div className="flex-1 bg-[#1A1A1A] rounded-md px-3 py-1.5 flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-green-400 opacity-60 shrink-0" />
                <span className="text-[12px] font-mono text-[#888] truncate">
                  {currentUrl || 'about:blank'}
                </span>
              </div>
              {/* REC badge */}
              {recordingState === 'recording' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/20 shrink-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">REC</span>
                </motion.div>
              )}
            </div>

            {/* Stream */}
            <div
              ref={streamRef}
              tabIndex={0}
              className="relative bg-white cursor-crosshair select-none outline-none focus:ring-0"
              style={{ aspectRatio: '16/9' }}
              onClick={handleStreamClick}
              onWheel={handleStreamWheel}
              onKeyDown={handleStreamKeyDown}
            >
              {currentFrame ? (
                <img
                  src={`data:image/jpeg;base64,${currentFrame}`}
                  alt="Live browser stream"
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8F7F4] gap-4">
                  <img src={logo} alt="" className="h-14 w-14 object-contain opacity-20" />
                  <p className="text-[13px] font-sans text-dim">Enter a URL above to start browsing</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom instruction bar */}
        <div className="h-14 bg-white border-t border-[#F0EDE8] flex items-center justify-between px-8 shrink-0">
          <p className="text-[13px] font-sans text-mid">
            {recordingState === 'idle'
              ? 'Navigate to the flow you want to test, then click Start Flow.'
              : 'Go through your flow naturally. Click End Flow when done.'}
          </p>
          {recordingState === 'idle' ? (
            <button
              onClick={handleStartFlow}
              disabled={connStatus !== 'connected'}
              className="bg-burnt/10 border border-burnt/20 text-burnt text-[12px] font-sans font-bold px-5 py-2 rounded-full hover:bg-burnt/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Circle size={9} fill="currentColor" />
              Start Flow
            </button>
          ) : (
            <button
              onClick={handleEndFlow}
              className="bg-red-50 border border-red-200 text-red-600 text-[12px] font-sans font-bold px-5 py-2 rounded-full hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <Square size={9} fill="currentColor" />
              End Flow · {formatTimer(recordingSeconds)}
            </button>
          )}
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-ink text-cream text-[13px] font-sans font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50"
          >
            <div className="w-2 h-2 rounded-full bg-green-400" />
            Flow saved — click it in the sidebar to generate tests.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
