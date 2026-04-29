import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Play, MousePointer, Type, Navigation, ChevronsDown, Keyboard } from 'lucide-react';
import logo from '../assets/HawkTrace-Logo.png';

import { BACKEND, authFetch } from '../api';

interface FlowMeta {
  flow_id: string;
  name?: string;
  frame_count: number;
  event_count: number;
  has_tests: boolean;
  started_at: number;
}

interface FlowDetail {
  flow_id: string;
  started_at: number;
  fps: number;
  frame_count: number;
  event_count: number;
  events: FlowEvent[];
}

interface FlowEvent {
  type: string;
  t: number;
  video_t: number;
  wall: number;
  url?: string;
  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
}

interface Observation {
  event_id: number;
  action_taken: string;
  visual_outcome: string;
}

type GenerationStage = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

interface TestSuitesProps {
  onBack: () => void;
  initialFlowId?: string | null;
}

export const TestSuites: React.FC<TestSuitesProps> = ({ onBack, initialFlowId }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [flows, setFlows] = useState<FlowMeta[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(initialFlowId ?? null);
  const [flowDetail, setFlowDetail] = useState<FlowDetail | null>(null);
  const [observations, setObservations] = useState<Observation[] | null>(null);
  const [goal, setGoal] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [storedGoal, setStoredGoal] = useState<string | null>(null);
  const [storedSuccessCriteria, setStoredSuccessCriteria] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFlows = useCallback(async () => {
    try {
      const res = await authFetch(`${BACKEND}/flows/all`);
      const data = await res.json();
      setFlows(data);
    } catch { }
  }, []);

  useEffect(() => { loadFlows(); }, [loadFlows]);
  useEffect(() => { if (initialFlowId) setSelectedFlowId(initialFlowId); }, [initialFlowId]);

  const pollVideoReady = useCallback((flowId: string) => {
    if (videoPollRef.current) clearTimeout(videoPollRef.current);
    setVideoReady(false);
    const check = async () => {
      try {
        const res = await authFetch(`${BACKEND}/flows/${flowId}/video`, { method: 'HEAD' });
        if (res.ok) { setVideoReady(true); return; }
      } catch {}
      videoPollRef.current = setTimeout(check, 2000);
    };
    check();
  }, []);

  useEffect(() => () => { if (videoPollRef.current) clearTimeout(videoPollRef.current); }, []);

  useEffect(() => {
    if (!videoReady || !selectedFlowId) return;
    let cancelled = false;
    let objectUrl = '';
    authFetch(`${BACKEND}/flows/${selectedFlowId}/video`)
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoBlobUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoReady, selectedFlowId]);

  const loadFlow = useCallback(async (flowId: string) => {
    setFlowDetail(null);
    setObservations(null);
    setGoal('');
    setSuccessCriteria('');
    setStoredGoal(null);
    setStoredSuccessCriteria(null);
    setGenerationStage('idle');
    setCurrentVideoTime(0);
    setVideoDuration(0);
    setVideoBlobUrl(null);
    pollVideoReady(flowId);

    try {
      const eventsRes = await authFetch(`${BACKEND}/flows/${flowId}/events`);
      if (!eventsRes.ok) return;
      const detail: FlowDetail = await eventsRes.json();
      setFlowDetail(detail);

      const testsRes = await authFetch(`${BACKEND}/flows/${flowId}/tests`);
      if (testsRes.ok) {
        const data = await testsRes.json();
        if (data.observations?.length > 0) {
          console.log('[HawkTrace] flow analysis (loaded):', data);
          setObservations(data.observations);
          setStoredGoal(data.goal ?? null);
          setStoredSuccessCriteria(data.success_criteria ?? null);
          setGenerationStage('done');
        }
      }
    } catch { }
  }, [pollVideoReady]);

  useEffect(() => {
    if (selectedFlowId) loadFlow(selectedFlowId);
  }, [selectedFlowId, loadFlow]);

  const handleAnalyze = async () => {
    if (!selectedFlowId) return;
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);

    setGenerationStage('uploading');
    stageTimerRef.current = setTimeout(() => setGenerationStage('analyzing'), 18000);

    try {
      const res = await authFetch(`${BACKEND}/flows/${selectedFlowId}/generate_tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal || null, success_criteria: successCriteria || null }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      console.log('[HawkTrace] flow analysis (fresh):', data);
      setObservations(data.observations);
      setStoredGoal(data.goal ?? null);
      setStoredSuccessCriteria(data.success_criteria ?? null);
      setGenerationStage('done');
      loadFlows();
    } catch {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      setGenerationStage('error');
    }
  };

  useEffect(() => () => { if (stageTimerRef.current) clearTimeout(stageTimerRef.current); }, []);

  const groupedFlows = flows.reduce<Record<string, FlowMeta[]>>((acc, flow) => {
    const date = new Date(flow.started_at * 1000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(flow);
    return acc;
  }, {});

  const stageLabel: Record<string, string> = {
    uploading: 'Uploading recording to Gemini...',
    analyzing: 'Analyzing your flow...',
  };

  const eventColor = (type: string) => {
    if (type === 'click' || type === 'dblclick') return '#E5622A';
    if (type === 'keydown' || type === 'fill') return '#2DD4BF';
    if (type === 'navigate') return '#60A5FA';
    return '#A8A29E';
  };

  const eventIcon = (type: string) => {
    if (type === 'click' || type === 'dblclick') return <MousePointer size={12} />;
    if (type === 'fill') return <Type size={12} />;
    if (type === 'navigate') return <Navigation size={12} />;
    if (type === 'scroll') return <ChevronsDown size={12} />;
    if (type === 'keydown') return <Keyboard size={12} />;
    return null;
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] font-sans">

      {/* ── Mobile flow picker ───────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-[#F0EDE8] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] font-black text-mid uppercase tracking-widest hover:text-ink shrink-0">
          <ArrowLeft size={12} /> Back
        </button>
        <select
          value={selectedFlowId ?? ''}
          onChange={e => setSelectedFlowId(e.target.value || null)}
          className="flex-1 bg-[#FAF9F6] border border-sand rounded-xl px-3 py-2 text-[13px] font-mono text-ink focus:outline-none focus:border-burnt"
        >
          <option value="">Select a flow…</option>
          {flows.map(f => (
            <option key={f.flow_id} value={f.flow_id}>
              {f.name ?? f.flow_id} · {f.event_count} events
            </option>
          ))}
        </select>
      </div>

      {/* ── Sidebar — desktop only ───────────────────────────── */}
      <aside className="hidden md:flex w-[280px] bg-white border-r border-[#F0EDE8] flex-col fixed h-screen z-20">
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
            Back
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] font-sans font-black text-dim uppercase tracking-widest mb-3 px-2">
            Recorded Flows
          </p>
          {Object.keys(groupedFlows).length === 0 ? (
            <p className="text-[13px] text-dim font-sans px-2 py-4 leading-relaxed">No flows recorded yet.</p>
          ) : (
            Object.entries(groupedFlows).map(([date, dateFlows]) => (
              <div key={date} className="mb-5">
                <p className="text-[10px] font-sans font-bold text-dim uppercase tracking-wider px-2 mb-1.5">{date}</p>
                <div className="space-y-0.5">
                  {dateFlows.map((flow) => (
                    <button
                      key={flow.flow_id}
                      onClick={() => setSelectedFlowId(flow.flow_id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                        selectedFlowId === flow.flow_id
                          ? 'bg-[#FAF9F6] border border-sand'
                          : 'hover:bg-[#FAF9F6] border border-transparent hover:border-sand'
                      }`}
                    >
                      <div>
                        <p className={`text-[11px] font-mono font-bold transition-colors ${
                          selectedFlowId === flow.flow_id ? 'text-burnt' : 'text-ink group-hover:text-burnt'
                        }`}>
                          {flow.name ?? flow.flow_id}
                        </p>
                        <p className="text-[10px] font-sans text-dim mt-0.5">
                          {flow.name ? flow.flow_id + ' · ' : ''}{flow.event_count} events
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${flow.has_tests ? 'bg-green-500' : 'bg-burnt'}`} />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 ml-0 md:ml-[280px] overflow-y-auto pt-[60px] md:pt-0">
        {!flowDetail ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <img src={logo} alt="" className="h-16 w-16 object-contain mx-auto mb-4 opacity-20" />
              <p className="text-[15px] font-sans text-dim">Select a flow from the sidebar</p>
            </div>
          </div>
        ) : (
          <motion.div
            key={flowDetail.flow_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 md:p-10 space-y-8 max-w-5xl"
          >
            {/* Flow metadata */}
            <div>
              <h2 className="text-3xl font-serif font-bold text-ink mb-1">
                {flows.find(f => f.flow_id === flowDetail.flow_id)?.name ?? flowDetail.flow_id}
              </h2>
              {flows.find(f => f.flow_id === flowDetail.flow_id)?.name && (
                <p className="text-[12px] font-mono text-dim mb-2">{flowDetail.flow_id}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-mid bg-[#FAF9F6] border border-sand px-3 py-1 rounded-full">
                  {flowDetail.frame_count} frames
                </span>
                <span className="text-[11px] font-mono font-bold text-mid bg-[#FAF9F6] border border-sand px-3 py-1 rounded-full">
                  {flowDetail.event_count} events
                </span>
                <span className="text-[11px] font-mono font-bold text-mid bg-[#FAF9F6] border border-sand px-3 py-1 rounded-full">
                  {new Date(flowDetail.started_at * 1000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Video + event timeline */}
            <div className="bg-white border border-sand rounded-2xl overflow-hidden shadow-sm">
              {!videoBlobUrl ? (
                <div className="w-full bg-[#1A1A1A] flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 size={28} className="text-burnt animate-spin" />
                  <p className="text-[13px] font-sans text-[#888]">Loading recording…</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={videoBlobUrl}
                  controls
                  className="w-full bg-black"
                  onTimeUpdate={(e) => setCurrentVideoTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                />
              )}

              {flowDetail.events.length > 0 && (
                <div className="p-5 border-t border-sand">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-sans font-black text-mid uppercase tracking-widest">Event Timeline</p>
                    <div className="flex items-center gap-4">
                      {[
                        { label: 'click', color: '#E5622A' },
                        { label: 'fill', color: '#2DD4BF' },
                        { label: 'navigate', color: '#60A5FA' },
                        { label: 'scroll', color: '#A8A29E' },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[10px] font-sans text-dim">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative h-9 bg-[#FAF9F6] rounded-lg border border-sand overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-burnt/8 transition-all duration-100 pointer-events-none"
                      style={{ width: videoDuration > 0 ? `${(currentVideoTime / videoDuration) * 100}%` : '0%' }}
                    />
                    {videoDuration > 0 && flowDetail.events.map((ev, i) => {
                      const pct = (ev.video_t / videoDuration) * 100;
                      const isActive = Math.abs(ev.video_t - currentVideoTime) < 0.5;
                      return (
                        <button
                          key={i}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-150 hover:scale-125"
                          style={{ left: `${pct}%` }}
                          onClick={() => { if (videoRef.current) videoRef.current.currentTime = ev.video_t; }}
                          title={`${ev.type}${ev.url ? ': ' + ev.url : ev.key ? ': ' + ev.key : ''}`}
                        >
                          <div
                            className="rounded-full transition-all duration-150"
                            style={{
                              backgroundColor: eventColor(ev.type),
                              width: isActive ? 14 : 9,
                              height: isActive ? 14 : 9,
                              opacity: isActive ? 1 : 0.65,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Analysis section */}
            <div>
              {generationStage === 'idle' && (
                <div className="bg-white border border-sand rounded-2xl p-10 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-burnt/10 border border-burnt/20 flex items-center justify-center shrink-0">
                      <Play size={20} className="text-burnt ml-0.5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-ink">Analyze Flow</h3>
                      <p className="text-[13px] font-sans text-mid mt-0.5">
                        Gemini will walk through the recording and describe what visually happened at each action.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-sans font-bold text-mid uppercase tracking-wider">
                        Flow Goal <span className="text-dim font-normal normal-case tracking-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                        placeholder="e.g. Verify newsletter signup works"
                        className="w-full bg-[#FAF9F6] border border-sand rounded-xl px-4 py-2.5 text-[14px] text-ink placeholder:text-dim/50 focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-sans font-bold text-mid uppercase tracking-wider">
                        Success Criteria <span className="text-dim font-normal normal-case tracking-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={successCriteria}
                        onChange={e => setSuccessCriteria(e.target.value)}
                        placeholder="e.g. Confirmation message appears after submit"
                        className="w-full bg-[#FAF9F6] border border-sand rounded-xl px-4 py-2.5 text-[14px] text-ink placeholder:text-dim/50 focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    className="bg-burnt/10 border border-burnt/20 text-burnt font-sans font-bold px-8 py-3 rounded-full hover:bg-burnt/20 transition-all text-[14px]"
                  >
                    Analyze with Gemini
                  </button>
                </div>
              )}

              {(generationStage === 'uploading' || generationStage === 'analyzing') && (
                <div className="bg-white border border-sand rounded-2xl p-14 flex flex-col items-center text-center shadow-sm">
                  <Loader2 size={36} className="text-burnt animate-spin mb-6" />
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={generationStage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-[16px] font-sans font-semibold text-ink mb-2"
                    >
                      {stageLabel[generationStage]}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-[13px] font-sans text-dim">This usually takes about 30–60 seconds</p>
                </div>
              )}

              {generationStage === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-10 flex flex-col items-center text-center">
                  <p className="text-[15px] font-sans font-medium text-red-700 mb-3">Something went wrong.</p>
                  <button
                    onClick={() => setGenerationStage('idle')}
                    className="text-[12px] font-sans font-bold text-red-600 underline underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              )}

              {generationStage === 'done' && observations && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-serif font-bold text-ink">Visual Analysis</h3>
                    <span className="text-[11px] font-mono text-dim">{observations.length} observations</span>
                  </div>

                  {(storedGoal || storedSuccessCriteria) && (
                    <div className="bg-[#FAF9F6] border border-sand rounded-2xl p-5 mb-2 space-y-2">
                      {storedGoal && (
                        <div>
                          <p className="text-[10px] font-sans font-bold text-mid uppercase tracking-wider mb-0.5">Goal</p>
                          <p className="text-[13px] font-sans text-ink">{storedGoal}</p>
                        </div>
                      )}
                      {storedSuccessCriteria && (
                        <div>
                          <p className="text-[10px] font-sans font-bold text-mid uppercase tracking-wider mb-0.5">Success Criteria</p>
                          <p className="text-[13px] font-sans text-ink">{storedSuccessCriteria}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {observations.map((obs, i) => {
                    const ev = flowDetail.events[obs.event_id];
                    return (
                      <motion.div
                        key={obs.event_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.04 }}
                        className="bg-white border border-sand rounded-2xl p-5 flex gap-4 shadow-sm"
                      >
                        {/* Left: event type indicator */}
                        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              background: ev ? eventColor(ev.type) + '18' : '#F0EDE8',
                              color: ev ? eventColor(ev.type) : '#A8A29E',
                              border: `1px solid ${ev ? eventColor(ev.type) + '40' : '#E8E4DF'}`,
                            }}
                          >
                            {ev ? eventIcon(ev.type) : null}
                          </div>
                          {i < observations.length - 1 && (
                            <div className="w-px flex-1 min-h-[16px] bg-[#F0EDE8]" />
                          )}
                        </div>

                        {/* Right: content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-mono font-bold text-dim">#{obs.event_id}</span>
                            {ev && (
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                                style={{
                                  background: eventColor(ev.type) + '14',
                                  color: eventColor(ev.type),
                                }}
                              >
                                {ev.type}
                              </span>
                            )}
                            {ev && (
                              <span className="text-[10px] font-mono text-dim">
                                t={ev.video_t.toFixed(2)}s
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-sans font-semibold text-ink mb-1">{obs.action_taken}</p>
                          <p className="text-[13px] font-sans text-mid leading-relaxed">{obs.visual_outcome}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            <div className="h-8" />
          </motion.div>
        )}
      </div>
    </div>
  );
};
