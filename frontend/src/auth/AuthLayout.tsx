import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBack }) => {
  return (
    <div className="min-h-screen bg-cream relative flex items-center justify-center p-6 overflow-hidden">
      {/* Texture/Grain Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-burnt/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-burnt/5 blur-[120px] rounded-full" />

      {/* Back Button */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-mid hover:text-ink transition-colors group z-20"
        >
          <div className="w-8 h-8 rounded-full bg-sand/50 flex items-center justify-center group-hover:bg-sand transition-colors">
            <ChevronLeft size={16} />
          </div>
          <span className="text-[13px] font-medium font-sans">Back to landing</span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-sand rounded-3xl p-8 lg:p-10 shadow-[0_8px_32px_rgba(20,18,17,0.04)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
