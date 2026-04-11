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
      whileHover={{ y: -2, shadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
      className="bg-cream border border-sand rounded-2xl p-6 flex flex-col justify-between relative group transition-all duration-300 shadow-sm"
    >
      <div className="absolute top-4 right-4 flex items-center gap-1">
         <span className={`text-[10px] font-mono font-bold ${isPositive ? 'text-green-600' : 'text-red-500'} flex items-center gap-0.5`}>
           {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
           {trend}
         </span>
      </div>
      
      <div className="space-y-1">
        <h4 className="text-2xl font-mono font-bold text-ink tracking-tight">
          {value}
        </h4>
        <p className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest opacity-80">
          {label}
        </p>
      </div>
    </motion.div>
  );
};
