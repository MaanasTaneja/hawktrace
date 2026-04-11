import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface Flow {
  flow_id: string;
  name: string | null;
  started_at: number;
  frame_count: number;
  event_count: number;
  has_tests: boolean;
}

interface RecentTestRunsProps {
  flows: Flow[];
  onViewTests: (flowId: string) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const RecentTestRuns: React.FC<RecentTestRunsProps> = ({ flows, onViewTests }) => {
  if (flows.length === 0) {
    return (
      <div className="text-center py-16 text-muted text-sm font-sans opacity-60">
        No flows recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-transparent">
            <th className="px-6 py-4 text-[11px] font-sans font-black text-muted uppercase tracking-widest">Flow</th>
            <th className="px-6 py-4 text-[11px] font-sans font-black text-muted uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[11px] font-sans font-black text-muted uppercase tracking-widest">Events</th>
            <th className="px-6 py-4 text-[11px] font-sans font-black text-muted uppercase tracking-widest">Recorded</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody>
          {flows.map((flow, idx) => (
            <motion.tr
              key={flow.flow_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`group transition-colors ${idx % 2 === 0 ? 'bg-cream' : 'bg-sand/30'} hover:bg-sand/50`}
            >
              <td className="px-6 py-4">
                <div>
                  <p className="text-sm font-sans font-bold text-ink">
                    {flow.name || <span className="font-mono text-muted">{flow.flow_id.slice(0, 10)}</span>}
                  </p>
                  {flow.name && (
                    <p className="text-[10px] font-mono text-muted/60 mt-0.5">{flow.flow_id.slice(0, 10)}</p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <StatusBadge hasTests={flow.has_tests} />
              </td>
              <td className="px-6 py-4 text-sm font-mono font-bold text-ink/70">{flow.event_count}</td>
              <td className="px-6 py-4 text-sm font-mono font-bold text-ink/70">{timeAgo(flow.started_at)}</td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onViewTests(flow.flow_id)}
                  className="text-muted group-hover:text-burnt transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StatusBadge: React.FC<{ hasTests: boolean }> = ({ hasTests }) => (
  <span className={`
    px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest
    ${hasTests ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
  `}>
    {hasTests ? 'READY' : 'PENDING'}
  </span>
);
