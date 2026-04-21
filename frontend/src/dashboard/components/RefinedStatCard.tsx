import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
}

export const RefinedStatCard: React.FC<StatCardProps> = ({ label, value, trend, isPositive }) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-6 rounded-2xl flex flex-col justify-between relative transition-all duration-300"
      style={{ border: '1px solid rgba(229,98,42,0.25)', background: '#F5F4F1' }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <span className={`text-[10px] font-mono flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-3xl font-mono font-bold text-ink tracking-tight">
          {value}
        </h4>
        <p className="text-[10px] font-mono text-mid uppercase tracking-widest">
          {label}
        </p>
      </div>
    </motion.div>
  );
};
