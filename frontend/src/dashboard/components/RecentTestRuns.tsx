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
      <div className="text-center py-16 font-mono text-sm text-mid">
        No flows recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: '1px solid rgba(229,98,42,0.2)' }}>
      <table className="w-full min-w-[500px] text-left border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(229,98,42,0.15)' }}>
            <th className="px-6 py-3.5 text-[10px] font-mono text-mid uppercase tracking-widest">Flow</th>
            <th className="px-6 py-3.5 text-[10px] font-mono text-mid uppercase tracking-widest">Status</th>
            <th className="px-6 py-3.5 text-[10px] font-mono text-mid uppercase tracking-widest">Events</th>
            <th className="px-6 py-3.5 text-[10px] font-mono text-mid uppercase tracking-widest">Recorded</th>
            <th className="px-6 py-3.5" />
          </tr>
        </thead>
        <tbody>
          {flows.map((flow, idx) => (
            <motion.tr
              key={flow.flow_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group transition-colors cursor-pointer"
              style={{
                borderBottom: idx < flows.length - 1 ? '1px solid rgba(229,98,42,0.1)' : 'none',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(229,98,42,0.02)',
              }}
              onClick={() => onViewTests(flow.flow_id)}
            >
              <td className="px-6 py-4">
                <div>
                  <p className="text-sm font-sans font-medium text-ink">
                    {flow.name || <span className="font-mono text-mid">{flow.flow_id.slice(0, 10)}</span>}
                  </p>
                  {flow.name && (
                    <p className="text-[10px] font-mono text-mid mt-0.5">{flow.flow_id.slice(0, 10)}</p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <StatusBadge hasTests={flow.has_tests} />
              </td>
              <td className="px-6 py-4 text-sm font-mono text-mid">{flow.event_count}</td>
              <td className="px-6 py-4 text-sm font-mono text-mid">{timeAgo(flow.started_at)}</td>
              <td className="px-6 py-4 text-right">
                <ChevronRight size={16} className="text-mid group-hover:text-burnt transition-colors ml-auto" />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
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
