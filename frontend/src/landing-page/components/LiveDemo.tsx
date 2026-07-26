import { motion } from 'framer-motion';

export function LiveDemo() {
  return (
    <section className="relative py-28 px-8 bg-[#F5F4F1]">
      <div className="max-w-6xl mx-auto">
        {/* Section headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.1] tracking-[-0.02em] text-ink text-center mb-14"
        >
          See HawkTrace work in real time.
        </motion.h2>

        {/* Demo frame */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl overflow-hidden border border-stone/80"
          style={{
            boxShadow:
              '0 4px 6px -1px rgba(0,0,0,0.04), 0 12px 40px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
          }}
        >
          {/* Browser chrome */}
          <div className="bg-sand/90 border-b border-stone/60 px-4 py-3 flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-stone" />
              <div className="w-3 h-3 rounded-full bg-stone" />
              <div className="w-3 h-3 rounded-full bg-stone" />
            </div>

            {/* Fake URL bar */}
            <div className="flex-1 max-w-sm mx-auto">
              <div className="bg-white/70 border border-stone/60 rounded-md px-3 py-1 flex items-center gap-2">
                {/* Lock icon */}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-dim flex-shrink-0">
                  <rect x="2" y="4.5" width="6" height="4.5" rx="0.8" fill="currentColor" />
                  <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1" fill="none" />
                </svg>
                <span className="font-mono text-[11px] text-mid truncate">app.hawktrace.io/demo</span>
              </div>
            </div>
          </div>

          {/* Demo content placeholder */}
          <div className="bg-[#1a1918] h-[280px] md:h-[480px] flex items-center justify-center relative overflow-hidden">
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative text-center">
              <p className="font-mono text-[12px] text-white/30 uppercase tracking-[0.2em] mb-3">
                LIVE DEMO EMBED
              </p>
              <p className="font-sans text-[13px] text-white/20">
                Recording interface will be embedded here
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
