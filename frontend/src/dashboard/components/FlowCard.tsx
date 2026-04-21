import React from 'react';
import { motion } from 'framer-motion';

interface FlowCardProps {
  flowId: string;
  name: string | null;
  startedAt: number;
  eventCount: number;
  frameCount: number;
  hasTests: boolean;
  onRecordFlow: () => void;
  onViewTests: (flowId: string) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const FlowCard: React.FC<FlowCardProps> = ({
  flowId, name, startedAt, eventCount, frameCount, hasTests,
  onRecordFlow, onViewTests
}) => {
  const displayName = name || `Flow ${flowId.slice(0, 6)}`;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={() => onViewTests(flowId)}
      className="flex flex-col justify-between p-7 rounded-2xl transition-all duration-300 cursor-pointer"
      style={{ border: '1px solid rgba(229,98,42,0.25)', background: '#F5F4F1' }}
    >
      <div className="space-y-5">
        <div className="flex justify-between items-start">
          <h4 className="text-xl font-serif font-semibold text-ink leading-tight">
            {displayName}
          </h4>
          <StatusBadge hasTests={hasTests} />
        </div>

        <p className="text-[11px] font-mono text-mid">
          {flowId}
        </p>

        <div className="flex gap-8">
          <div className="space-y-0.5">
            <p className="text-[10px] font-mono text-mid uppercase tracking-widest">Events</p>
            <p className="text-lg font-mono font-bold text-ink">{eventCount}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-mono text-mid uppercase tracking-widest">Frames</p>
            <p className="text-lg font-mono font-bold text-ink">{frameCount}</p>
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(229,98,42,0.15)' }}>
        <div className="flex gap-5">
          <button
            onClick={e => { e.stopPropagation(); onRecordFlow(); }}
            className="text-[11px] font-mono text-mid uppercase tracking-widest hover:text-ink transition-colors"
          >
            New Recording
          </button>
          <button
            onClick={e => { e.stopPropagation(); onViewTests(flowId); }}
            className="text-[11px] font-mono text-burnt uppercase tracking-widest hover:opacity-70 transition-opacity"
          >
            View Test Results
          </button>
        </div>
        <p className="text-[11px] font-mono text-mid">
          {timeAgo(startedAt)}
        </p>
      </div>
    </motion.div>
  );
};

const StatusBadge: React.FC<{ hasTests: boolean }> = ({ hasTests }) => (
  <span
    className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest"
    style={hasTests
      ? { background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }
      : { background: 'rgba(229,98,42,0.08)', color: '#E5622A', border: '1px solid rgba(229,98,42,0.25)' }
    }
  >
    {hasTests ? 'READY' : 'PENDING'}
  </span>
);
