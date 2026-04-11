import { motion } from 'framer-motion';
import { BrowserSimulation } from './BrowserSimulation';

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center pt-14">
      <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-20">
        {/* Left . text */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 bg-sand border border-stone px-3 py-1 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] font-mono text-mid">Public beta</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.06] tracking-[-0.03em] text-ink mb-6"
          >
            The QA
            <br />
            engineer you
            <br />
            <span className="text-burnt italic">never</span> hired.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="text-mid text-[15px] leading-relaxed max-w-sm mb-8"
          >
            HawkTrace records your product sessions and transforms them into
            human-readable Playwright tests. No setup, no scripts, no QA team required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            <button
              onClick={onGetStarted}
              className="bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#E5622A]/20 transition-all hover:-translate-y-0.5"
            >
              Start recording
            </button>
            <a
              href="#how"
              className="text-sm text-mid hover:text-ink transition-colors underline underline-offset-4 decoration-stone font-sans"
            >
              How it works ↓
            </a>
          </motion.div>
        </div>

        {/* Right . Browser Simulation */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:pl-10"
        >
          <BrowserSimulation />
        </motion.div>
      </div>
    </section>
  );
}
