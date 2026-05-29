import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Play, MousePointer, Type, Navigation, ChevronsDown, Keyboard, Bot, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import logo from '../assets/HawkTrace-Logo.png';

import { BACKEND, authFetch } from '../api';

interface FlowMeta {
  flow_id: string;
  name?: string;
  frame_count: number;
  event_count: number;
  has_tests: boolean;
  has_agent: boolean;
  agent_active: boolean;
  last_run_status?: string | null;
  started_at: number;
}

interface AgentRecipe {
  flow_id: string;
  goal: string;
  success_criteria: string;
  steps: Array<{
    step_id: number;
    description: string;
    action_type: string;
    value?: string | null;
  }>;
}

interface AgentRun {
  run_id: string;
  triggered_by: string;
  status: string;
  overall?: string;
  summary?: string;
  ran_at: number;
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
  const [agentStage, setAgentStage] = useState<'idle' | 'launching' | 'ready' | 'running' | 'error'>('idle');
  const [agentRecipe, setAgentRecipe] = useState<AgentRecipe | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runReports, setRunReports] = useState<Record<string, any>>({});
  const [runVideos, setRunVideos] = useState<Record<string, string>>({});
  const [secretsDraft, setSecretsDraft] = useState<Record<string, string>>({});
  const [secretsSaved, setSecretsSaved] = useState(false);
  const [agentActive, setAgentActive] = useState(true);
  const [schedule, setSchedule] = useState<'none' | 'daily' | 'weekly'>('none');
  const [savedSchedule, setSavedSchedule] = useState<'none' | 'daily' | 'weekly'>('none');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFlows = useCallback(async () => {
    try {
      const res = await authFetch(`${BACKEND}/flows/all`);
      const data = await res.json();
      setFlows(data);
    } catch { }
  }, []);

  const handleDeleteFlow = useCallback(async (flowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await authFetch(`${BACKEND}/flows/${flowId}`, { method: 'DELETE' });
      setFlows(prev => prev.filter(f => f.flow_id !== flowId));
      if (selectedFlowId === flowId) setSelectedFlowId(null);
    } catch {}
  }, [selectedFlowId]);

  const startRename = useCallback((flow: FlowMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(flow.flow_id);
    setRenameValue(flow.name ?? flow.flow_id);
  }, []);

  const commitRename = useCallback(async (flowId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      try {
        await authFetch(`${BACKEND}/flows/${flowId}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        setFlows(prev => prev.map(f => f.flow_id === flowId ? { ...f, name: trimmed } : f));
      } catch {}
    }
    setRenamingId(null);
  }, [renameValue]);

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

  const loadAgentRuns = useCallback(async (flowId: string) => {
    try {
      const res = await authFetch(`${BACKEND}/agents/${flowId}/runs`);
      if (res.ok) {
        const runs: AgentRun[] = await res.json();
        setAgentRuns(runs);
        if (runs[0]?.status === 'running') setAgentStage('running');
      }
    } catch {}
  }, []);

  const loadSecrets = useCallback(async (flowId: string) => {
    try {
      const res = await authFetch(`${BACKEND}/agents/${flowId}/secrets`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const s of data.secrets) map[s.key] = s.value;
        setSecretsDraft(map);
      }
    } catch {}
  }, []);

  const handleSaveSecrets = async () => {
    if (!selectedFlowId) return;
    try {
      const res = await authFetch(`${BACKEND}/agents/${selectedFlowId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow_id: selectedFlowId,
          secrets: Object.entries(secretsDraft).map(([key, value]) => ({ key, value })),
        }),
      });
      if (res.ok) {
        setSecretsSaved(true);
      }
    } catch {}
  };

  const loadFlow = useCallback(async (flowId: string) => {
    setFlowDetail(null);
    setObservations(null);
    setGoal('');
    setSuccessCriteria('');
    setStoredGoal(null);
    setStoredSuccessCriteria(null);
    setGenerationStage('idle');
    setAgentStage('idle');
    setAgentActive(true);
    setAgentRecipe(null);
    setAgentRuns([]);
    setSecretsDraft({});
    setSecretsSaved(false);
    setSchedule('none');
    setSavedSchedule('none');
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
        if (data.steps?.length > 0) {
          setAgentRecipe(data);
          setAgentStage('ready');
          setGenerationStage('done');
          setAgentActive(data.agent_active ?? true);
        } else if (data.observations?.length > 0) {
          // Legacy format: visual observations
          setObservations(data.observations);
          setStoredGoal(data.goal ?? null);
          setStoredSuccessCriteria(data.success_criteria ?? null);
          setGenerationStage('done');
        }
      }

      const runsRes = await authFetch(`${BACKEND}/agents/${flowId}/runs`);
      if (runsRes.ok) {
        const runs = await runsRes.json();
        setAgentRuns(runs);
      }

      await loadSecrets(flowId);
    } catch { }
  }, [pollVideoReady, loadSecrets]);

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
      setAgentRecipe(data);
      setGenerationStage('done');
      loadFlows();
    } catch {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      setGenerationStage('error');
    }
  };

  useEffect(() => () => { if (stageTimerRef.current) clearTimeout(stageTimerRef.current); }, []);

  const handleLaunchAgent = async () => {
    if (!selectedFlowId) return;
    setAgentStage('launching');
    try {
      const res = await authFetch(`${BACKEND}/agents/flows/${selectedFlowId}/launch`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const recipe: AgentRecipe = await res.json();
      setAgentRecipe(recipe);
      setAgentStage('ready');
      loadFlows();
    } catch {
      setAgentStage('error');
    }
  };

  const handleRunNow = async () => {
    if (!selectedFlowId) return;
    setAgentStage('running');
    try {
      const res = await authFetch(`${BACKEND}/agents/${selectedFlowId}/run`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      // Poll every 5s for up to 3 minutes until the run completes
      const flowId = selectedFlowId;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        await loadAgentRuns(flowId);
        setAgentRuns(prev => {
          const latest = prev[0];
          if (latest && latest.status !== 'running') {
            setAgentStage('ready');
            return prev;
          }
          if (attempts < 36) setTimeout(poll, 5000);
          else setAgentStage('ready');
          return prev;
        });
      };
      setTimeout(poll, 5000);
    } catch {
      setAgentStage('ready');
    }
  };

  const handleSetSchedule = async (type: 'none' | 'daily' | 'weekly') => {
    if (!selectedFlowId) return;
    try {
      const res = await authFetch(`${BACKEND}/agents/${selectedFlowId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_type: type }),
      });
      if (res.ok) setSavedSchedule(type);
    } catch {}
    setSchedule(type);
  };

  const handleExpandRun = async (runId: string) => {
    if (expandedRunId === runId) { setExpandedRunId(null); return; }
    setExpandedRunId(runId);
    if (!selectedFlowId) return;
    if (!runReports[runId]) {
      try {
        const res = await authFetch(`${BACKEND}/agents/${selectedFlowId}/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          setRunReports(prev => ({ ...prev, [runId]: data.report }));
        }
      } catch {}
    }
    if (!runVideos[runId]) {
      try {
        const res = await authFetch(`${BACKEND}/agents/${selectedFlowId}/runs/${runId}/video`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setRunVideos(prev => ({ ...prev, [runId]: url }));
        }
      } catch {}
    }
  };

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
                    <motion.div
                      key={flow.flow_id}
                      onClick={() => renamingId !== flow.flow_id && setSelectedFlowId(flow.flow_id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group cursor-pointer ${
                        selectedFlowId === flow.flow_id
                          ? 'bg-[#FAF9F6] border border-sand'
                          : 'hover:bg-[#FAF9F6] border border-transparent hover:border-sand'
                      }`}
                    >
                      {/* Name row */}
                      <div className="flex items-center justify-between gap-1">
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
                          <span className={`text-[11px] font-mono font-bold transition-colors truncate ${
                            selectedFlowId === flow.flow_id ? 'text-burnt' : 'text-ink group-hover:text-burnt'
                          }`}>
                            {flow.name ?? flow.flow_id}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`w-2 h-2 rounded-full ${flow.has_tests ? 'bg-green-500' : 'bg-burnt'}`} />
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
                        <p className="text-[9px] font-mono text-dim truncate mt-0.5">{flow.flow_id}</p>
                      )}
                      <p className="text-[10px] font-sans text-dim mt-0.5">
                        {flow.event_count} events
                      </p>
                    </motion.div>
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
            className="p-4 md:p-10 space-y-8"
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

              {generationStage === 'done' && (agentRecipe || observations) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  {/* Launch Agent banner */}
                  {agentStage === 'idle' && (
                    <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-burnt/10 border border-burnt/20 flex items-center justify-center shrink-0">
                          <Bot size={18} className="text-burnt" />
                        </div>
                        <div>
                          <p className="text-[14px] font-serif font-bold text-ink">Launch QA Agent</p>
                          <p className="text-[12px] font-sans text-mid mt-0.5">Turn this recording into an autonomous test that runs on a schedule</p>
                        </div>
                      </div>
                      <button
                        onClick={handleLaunchAgent}
                        className="shrink-0 bg-burnt/10 border border-burnt/20 text-burnt font-sans font-bold px-5 py-2.5 rounded-full hover:bg-burnt/20 transition-all text-[13px]"
                      >
                        Launch Agent
                      </button>
                    </div>
                  )}

                  {agentStage === 'launching' && (
                    <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex items-center gap-4 mb-2">
                      <Loader2 size={18} className="text-burnt animate-spin shrink-0" />
                      <p className="text-[13px] font-sans text-mid">Generating agent recipe from your recording…</p>
                    </div>
                  )}

                  {agentStage === 'error' && (
                    <div className="bg-white border border-sand rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4 mb-2">
                      <p className="text-[13px] font-sans text-mid">Agent launch failed.</p>
                      <button onClick={() => setAgentStage('idle')} className="text-[12px] font-sans font-bold text-burnt underline underline-offset-4">Retry</button>
                    </div>
                  )}

                  {(agentStage === 'ready' || agentStage === 'running') && (
                    <div className="bg-white border border-sand rounded-2xl shadow-sm mb-2 overflow-hidden">

                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(229,98,42,0.12)' }}>
                        {/* Left — identity */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${agentActive ? 'bg-burnt/10 border border-burnt/20' : 'bg-[#FAF9F6] border border-sand'}`}>
                            <Bot size={14} className={agentActive ? 'text-burnt' : 'text-dim'} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-serif font-bold text-ink leading-tight">QA Agent</p>
                              {agentActive ? (
                                <span className="text-[9px] font-sans font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20">active</span>
                              ) : (
                                <span className="text-[9px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#FAF9F6] text-dim border border-sand">inactive</span>
                              )}
                            </div>
                            <p className="text-[12px] font-sans text-dim truncate">
                              {agentStage === 'running' ? 'Running check…' : `${agentRecipe?.steps?.length ?? 0} steps`}
                            </p>
                          </div>
                        </div>

                        {/* Right — actions */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-4">
                          <button
                            onClick={handleRunNow}
                            disabled={agentStage === 'running' || !agentActive}
                            className="flex items-center gap-1 bg-burnt/10 border border-burnt/20 text-burnt font-sans font-bold px-3 py-1.5 rounded-full hover:bg-burnt/20 transition-all text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {agentStage === 'running' ? <><Loader2 size={10} className="animate-spin" /> Running…</> : <><Play size={10} /> Run Now</>}
                          </button>
                          <button
                            onClick={async () => {
                              const next = !agentActive;
                              setAgentActive(next);
                              if (!next) handleSetSchedule('none');
                              if (selectedFlowId) {
                                await authFetch(`${BACKEND}/agents/${selectedFlowId}/active`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ is_active: next }),
                                });
                                loadFlows();
                              }
                            }}
                            disabled={agentStage === 'running'}
                            className="text-[11px] font-sans font-bold px-3 py-1.5 rounded-full border border-sand text-mid hover:border-burnt/30 hover:text-burnt transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {agentActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <div className="w-px h-4 bg-sand mx-0.5" />
                          <button
                            onClick={() => { setGenerationStage('idle'); setAgentStage('idle'); setAgentRecipe(null); }}
                            disabled={agentStage === 'running'}
                            className="text-[11px] font-sans text-dim hover:text-burnt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Re-analyse
                          </button>
                        </div>
                      </div>

                      <div className="px-6 py-5 space-y-5">

                        {/* Recipe */}
                        {agentRecipe && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider">Goal</p>
                            <p className="text-[14px] font-sans text-ink">{agentRecipe.goal}</p>
                            <p className="text-[13px] font-sans text-mid">{agentRecipe.success_criteria}</p>
                          </div>
                        )}

                        {/* Secrets */}
                        {agentRecipe?.steps?.some(s => typeof s.value === 'string' && s.value.includes('{{secret:')) && (
                          <div className="bg-[#FAF9F6] border border-sand rounded-xl p-4 space-y-3">
                            <div>
                              <p className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider mb-0.5">Credentials required</p>
                              <p className="text-[13px] font-sans text-mid">Enter password used during flow recording.</p>
                            </div>
                            {Array.from(new Set(
                              agentRecipe.steps
                                .filter(s => typeof s.value === 'string' && s.value.includes('{{secret:'))
                                .map(s => (s.value as string).match(/\{\{secret:([^}]+)\}\}/g) ?? [])
                                .flat()
                                .map(m => m.replace('{{secret:', '').replace('}}', ''))
                            )).map(key => (
                              <div key={key} className="space-y-1">
                                <label className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider">{key}</label>
                                <input
                                  type="password"
                                  value={secretsDraft[key] ?? ''}
                                  onChange={e => { setSecretsDraft(prev => ({ ...prev, [key]: e.target.value })); setSecretsSaved(false); }}
                                  placeholder={`Enter ${key.toLowerCase()}`}
                                  className="w-full bg-white border border-sand rounded-xl px-4 py-2.5 text-[13px] font-sans text-ink placeholder:text-dim/50 focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20 transition-all"
                                />
                              </div>
                            ))}
                            <button
                              onClick={handleSaveSecrets}
                              disabled={secretsSaved}
                              className="flex items-center gap-1.5 text-[12px] font-sans font-bold px-4 py-2 rounded-full bg-burnt/10 border border-burnt/20 text-burnt hover:bg-burnt/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {secretsSaved ? <><CheckCircle2 size={12} /> Saved</> : 'Save credentials'}
                            </button>
                          </div>
                        )}

                        {/* Schedule */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider">Schedule</p>
                          <div className="flex gap-2">
                            {(['none', 'daily', 'weekly'] as const).map(type => (
                              <button
                                key={type}
                                onClick={() => handleSetSchedule(type)}
                                className={`px-3 py-1.5 rounded-full text-[12px] font-sans font-bold transition-all ${
                                  schedule === type
                                    ? 'bg-burnt/10 border border-burnt/30 text-burnt'
                                    : 'bg-[#FAF9F6] border border-sand text-mid hover:border-burnt/30 hover:text-burnt'
                                }`}
                              >
                                {type === 'none' ? 'Off' : type.charAt(0).toUpperCase() + type.slice(1)}
                              </button>
                            ))}
                          </div>
                          {savedSchedule !== 'none' && (
                            <p className="text-[12px] font-sans text-mid">Runs <span className="text-burnt font-bold">{savedSchedule}</span></p>
                          )}
                        </div>

                        {/* Recent runs */}
                        {agentRuns.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider">Recent Runs</p>
                            {agentRuns.slice(0, 5).map(run => {
                              const isExpanded = expandedRunId === run.run_id;
                              const report = runReports[run.run_id];
                              const passed = run.overall === 'passed';
                              const failed = run.overall === 'failed';
                              const running = run.status === 'running';
                              return (
                                <div key={run.run_id} className="border border-sand rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => handleExpandRun(run.run_id)}
                                    className="w-full flex items-center justify-between bg-[#FAF9F6] px-4 py-3 hover:bg-[#F5F4F0] transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {running ? (
                                        <Loader2 size={13} className="text-burnt animate-spin shrink-0" />
                                      ) : passed ? (
                                        <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                                      ) : failed ? (
                                        <XCircle size={13} className="text-red-500 shrink-0" />
                                      ) : (
                                        <Clock size={13} className="text-mid shrink-0" />
                                      )}
                                      <span className="text-[13px] font-sans text-ink">{run.summary ?? run.status}</span>
                                      <span className="text-[11px] font-mono text-dim">{run.triggered_by}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono text-dim">
                                        {new Date(run.ran_at * 1000).toLocaleString()}
                                      </span>
                                      {isExpanded ? <ChevronUp size={12} className="text-dim" /> : <ChevronDown size={12} className="text-dim" />}
                                    </div>
                                  </button>

                                  {isExpanded && (
                                    <div className="bg-white px-4 py-4 space-y-4" style={{ borderTop: '1px solid rgba(229,98,42,0.12)' }}>
                                      {/* Video */}
                                      <div>
                                        <p className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider mb-2">Recording</p>
                                        {runVideos[run.run_id] ? (
                                          <video
                                            src={runVideos[run.run_id]}
                                            controls
                                            playsInline
                                            className="w-full rounded-xl border border-sand bg-black"
                                            style={{ maxHeight: 200 }}
                                          >
                                            <source src={runVideos[run.run_id]} type="video/webm; codecs=vp8" />
                                          </video>
                                        ) : (
                                          <div className="flex items-center gap-2 text-[11px] font-sans text-dim py-1">
                                            <Loader2 size={11} className="animate-spin" /> Loading recording…
                                          </div>
                                        )}
                                      </div>

                                      {/* Steps */}
                                      {report?.step_results?.length > 0 && (
                                        <div>
                                          <p className="text-[11px] font-sans font-bold text-mid uppercase tracking-wider mb-2">Steps</p>
                                          <div className="space-y-2">
                                            {report.step_results.map((step: any, i: number) => (
                                              <div key={i} className="flex items-start gap-2.5">
                                                {step.status === 'passed' ? (
                                                  <CheckCircle2 size={13} className="text-green-600 shrink-0 mt-0.5" />
                                                ) : step.status === 'skipped' ? (
                                                  <Clock size={13} className="text-mid shrink-0 mt-0.5" />
                                                ) : (
                                                  <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-[12px] font-sans text-ink">{step.description ?? `Step ${i + 1}`}</p>
                                                  {step.failure_reason && (
                                                    <p className="text-[11px] font-sans text-red-500 mt-0.5">{step.failure_reason}</p>
                                                  )}
                                                </div>
                                                {step.tier_used && (
                                                  <span className="text-[9px] font-mono text-dim shrink-0 mt-0.5">T{step.tier_used}</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {!report && (
                                        <p className="text-[12px] font-sans text-dim">Loading details…</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {observations && (
                  <>
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
                  </>
                  )}
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
