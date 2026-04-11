import React from 'react';
import { motion } from 'framer-motion';

interface ProductCardProps {
  name: string;
  url: string;
  status: 'PASSING' | 'FAILING' | 'NONE';
  totalTests: number;
  healthIndex: number;
  lastRun: string;
  onRecordFlow: () => void;
  onViewTests: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  url,
  status,
  totalTests,
  healthIndex,
  lastRun,
  onRecordFlow,
  onViewTests,
}) => {
  const isPassing = status === 'PASSING';
  const isFailing = status === 'FAILING';
  const isNone = status === 'NONE';

  return (
    <motion.div 
      whileHover={{ y: -4, shadow: '0 12px 24px -10px rgba(0,0,0,0.05)' }}
      className="bg-white border border-sand rounded-[2rem] p-8 flex flex-col justify-between group transition-all duration-300 shadow-sm"
    >
      <div className="space-y-6">
        {/* Top Row: Name and Status */}
        <div className="flex justify-between items-start">
          <h4 className="text-2xl font-serif font-semibold text-ink leading-tight group-hover:text-burnt transition-colors">
            {isNone ? 'Your next product' : name}
          </h4>
          <StatusBadge status={status} />
        </div>

        {/* Second Row: URL */}
        <p className="text-sm font-sans text-muted font-medium">
          {isNone ? 'Add a URL to start recording' : (url || <span className="italic opacity-50 underline decoration-sand">No domain connected</span>)}
        </p>

        {/* Third Row: Stats */}
        {!isNone && (
          <div className="flex gap-10">
            <div className="space-y-1">
              <p className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest opacity-60">Total Tests</p>
              <p className="text-xl font-mono font-bold text-ink">{totalTests}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest opacity-60">Health Index</p>
              <p className={`text-xl font-mono font-bold ${healthIndex < 80 ? 'text-[#E5622A]' : 'text-green-600'}`}>
                {healthIndex}%
              </p>
            </div>
          </div>
        )}

        {/* Fourth Row: Progress Bar */}
        {!isNone && (
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-sand rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${healthIndex}%` }}
                 transition={{ duration: 1, ease: "easeOut" }}
                 className={`h-full ${healthIndex < 80 ? 'bg-[#E5622A]' : 'bg-green-600/80'}`}
               />
            </div>
          </div>
        )}

        {/* Empty State */}
        {isNone && (
          <div className="py-8 flex justify-center">
            <button
              onClick={onRecordFlow}
              className="bg-burnt/10 backdrop-blur-md border border-burnt/20 text-burnt px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:bg-burnt/20 shadow-lg shadow-burnt/5 text-sm uppercase tracking-widest"
            >
              Start Recording
            </button>
          </div>
        )}
      </div>

      {/* Bottom Row: Actions */}
      {!isNone && (
        <div className="pt-8 border-t border-sand/50 flex items-center justify-between">
          <div className="flex gap-6">
             <button
               onClick={onRecordFlow}
               className="text-[11px] font-sans font-black text-burnt uppercase tracking-widest hover:opacity-80 transition-opacity"
             >
               Record New Flow
             </button>
             <button
               onClick={onViewTests}
               className="text-[11px] font-sans font-black text-muted uppercase tracking-widest hover:text-ink transition-colors"
             >
               View Tests
             </button>
          </div>
          <p className="text-[11px] font-mono font-bold text-muted uppercase tracking-tight opacity-60">
             Last run {lastRun}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const StatusBadge: React.FC<{ status: 'PASSING' | 'FAILING' | 'NONE' }> = ({ status }) => {
  if (status === 'NONE') return null;

  const isPassing = status === 'PASSING';

  return (
    <span className={`
      px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest
      ${isPassing ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
    `}>
      {status}
    </span>
  );
};
