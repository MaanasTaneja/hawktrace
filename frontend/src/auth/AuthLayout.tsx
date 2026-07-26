import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBack }) => {
  return (
    <div
      className="h-screen relative flex items-center justify-center p-6 overflow-hidden"
      style={{
        backgroundImage: 'url(/new1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Back Button */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors group z-20"
        >
          <div className="w-8 h-8 rounded-full bg-sand/50 flex items-center justify-center group-hover:bg-sand transition-colors">
            <ChevronLeft size={16} />
          </div>
          <span className="text-[13px] font-medium font-sans">Back to landing</span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-sand rounded-3xl p-6 shadow-[0_8px_32px_rgba(20,18,17,0.04)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
