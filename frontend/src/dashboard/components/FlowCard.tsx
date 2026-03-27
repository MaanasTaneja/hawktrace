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
      whileHover={{ y: -4 }}
      className="bg-white border border-sand rounded-[2rem] p-8 flex flex-col justify-between group transition-all duration-300 shadow-sm"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <h4 className="text-2xl font-serif font-semibold text-ink leading-tight group-hover:text-burnt transition-colors">
            {displayName}
          </h4>
          <StatusBadge hasTests={hasTests} />
        </div>

        <p className="text-xs font-mono text-muted">
          {flowId}
        </p>

        <div className="flex gap-10">
          <div className="space-y-1">
            <p className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest opacity-60">Events</p>
            <p className="text-xl font-mono font-bold text-ink">{eventCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest opacity-60">Frames</p>
            <p className="text-xl font-mono font-bold text-ink">{frameCount}</p>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-sand/50 flex items-center justify-between">
        <div className="flex gap-6">
          <button
            onClick={onRecordFlow}
            className="text-[11px] font-sans font-black text-burnt uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Record New Flow
          </button>
          <button
            onClick={() => onViewTests(flowId)}
            className="text-[11px] font-sans font-black text-muted uppercase tracking-widest hover:text-ink transition-colors"
          >
            {hasTests ? 'View Tests' : 'Generate Tests'}
          </button>
        </div>
        <p className="text-[11px] font-mono font-bold text-muted uppercase tracking-tight opacity-60">
          {timeAgo(startedAt)}
        </p>
      </div>
    </motion.div>
  );
};

const StatusBadge: React.FC<{ hasTests: boolean }> = ({ hasTests }) => (
  <span className={`
    px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest
    ${hasTests ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}
  `}>
    {hasTests ? 'READY' : 'PENDING'}
  </span>
);
