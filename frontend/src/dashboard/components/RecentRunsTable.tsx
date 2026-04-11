import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Activity, Clock, Timer, CheckCircle2, AlertCircle } from 'lucide-react';

interface RunData {
  product: string;
  status: 'passing' | 'failing';
  duration: string;
  time: string;
  type: string;
}

export const RecentRunsTable: React.FC = () => {
  const runs: RunData[] = [
    { product: 'HawkTrace Landing', status: 'passing', duration: '12.4s', time: '2h ago', type: 'Production Check' },
    { product: 'Dashboard App', status: 'failing', duration: '45.1s', time: '45m ago', type: 'End-to-End' },
    { product: 'API Service', status: 'passing', duration: '0.8s', time: '10m ago', type: 'Health Check' }
  ];

  return (
    <div className="space-y-4">
      {runs.map((run, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="glass-premium rounded-3xl p-6 flex items-center justify-between group hover:border-burnt/30 transition-all duration-500 cursor-pointer"
        >
          <div className="flex items-center gap-8 flex-1">
            {/* Status Icon */}
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center
              ${run.status === 'passing' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}
            `}>
              {run.status === 'passing' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>

            {/* Product & Type */}
            <div className="min-w-[240px]">
              <h4 className="text-xl font-serif font-bold text-ink group-hover:text-burnt transition-colors">
                {run.product}
              </h4>
              <p className="text-[11px] font-mono font-black text-muted uppercase tracking-[0.1em] flex items-center gap-1.5">
                <Activity size={10} />
                {run.type}
              </p>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-12">
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-black text-muted uppercase tracking-[0.15em] opacity-60">Duration</p>
                <div className="flex items-center gap-2 text-ink">
                  <Timer size={14} className="text-muted" strokeWidth={3} />
                  <span className="text-sm font-mono font-black leading-none">{run.duration}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-black text-muted uppercase tracking-[0.15em] opacity-60">Timestamp</p>
                <div className="flex items-center gap-2 text-ink">
                  <Clock size={14} className="text-muted" strokeWidth={3} />
                  <span className="text-sm font-mono font-black leading-none">{run.time}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center gap-4">
            <div className={`
              hidden group-hover:flex items-center gap-1 px-4 py-1.5 rounded-full border border-burnt/20 text-burnt text-[10px] font-bold uppercase tracking-widest
              bg-burnt/10 backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-300
            `}>
              View Details <ArrowUpRight size={12} strokeWidth={3} />
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-muted group-hover:text-burnt transition-colors">
              <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
