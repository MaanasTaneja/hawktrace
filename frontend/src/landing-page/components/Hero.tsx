import { motion } from 'framer-motion';
import logo from '../../assets/HawkTrace-Logo.png';

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <div className="flex flex-col py-8 w-full">
      {/* Bottom block */}
      <div className="px-8">
        {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-[clamp(2.4rem,4.8vw,4rem)] leading-[1.06] tracking-[-0.025em] text-ink mb-5"
      >
        Introducing
        <br />
        <span className="inline-flex items-center gap-3">
          <img
            src={logo}
            alt="HawkTrace"
            className="inline-block h-[0.65em] w-auto translate-y-[-0.05em]"
          />
          <span className="italic text-burnt">HawkTrace Agent</span>
        </span>
      </motion.h1>

      {/* Provocative statement */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 space-y-1"
      >
        <p className="text-[18px] text-ink font-semibold font-serif leading-snug">
          Testing should work for founders, not against them.
        </p>
        <p className="text-[18px] text-mid font-mono leading-snug italic">
          So we built an agent that does.
        </p>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3.5 mb-7"
      >
        <button
          onClick={onGetStarted}
          className="text-[13px] font-medium px-7 py-3 rounded-full active:scale-95 transition-all duration-200"
          style={{
            background: 'rgba(229,98,42,0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(229,98,42,0.45)',
            color: '#E5622A',
          }}
        >
          Get Started
        </button>
      </motion.div>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.72 }}
        className="flex items-center gap-2"
      >
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-stone border-2 border-[#F5F4F1]"
              style={{ background: i === 0 ? '#d4b896' : i === 1 ? '#c4a882' : '#b49270' }}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-dim tracking-wide">
          Used by founders at early stage startups.
        </p>
      </motion.div>
      </div>
    </div>
  );
}
