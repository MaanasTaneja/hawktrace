import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const features = [
  {
    num: '01',
    title: 'No setup. Ever.',
    desc: 'Just enter your URL. We open your product in a live browser session and record everything. No script tags, no installs, no touching your codebase.',
  },
  {
    num: '02',
    title: 'Tests you actually own.',
    desc: 'Standard Playwright files that live in your repo. No proprietary format, no vendor lock-in. Run them anywhere, anytime, with one command.',
  },
  {
    num: '03',
    title: 'Knows when things change.',
    desc: 'When your UI drifts, HawkTrace notices. It tells you exactly what changed, what tests need updating, and what\u2019s at risk before your next deploy.',
  },
  {
    num: '04',
    title: 'Built from how you work.',
    desc: 'You already demo your product. You already know what matters. HawkTrace turns that natural walkthrough into a full test suite. No QA mindset required.',
  },
  {
    num: '05',
    title: 'Catches bugs before your users do.',
    desc: 'Every deploy triggers your suite automatically. You get a screenshot, a diff, and an exact failure reason before anyone else sees it.',
  },
  {
    num: '06',
    title: 'Gets smarter over time.',
    desc: 'Every recording, every test run, every regression caught teaches HawkTrace your product. The longer you use it, the better it understands what normal looks like.',
  },
];

export function Features() {
  const [active, setActive] = useState(0);

  return (
    <section id="features" className="py-24 md:py-32 px-6 bg-cream">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="text-[11px] font-mono text-burnt uppercase tracking-[0.2em] mb-3 block">
            Capabilities
          </span>
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.12] tracking-[-0.02em] text-ink max-w-lg">
            Six reasons to stop writing tests by hand
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-16 items-start">
          {/* Left . accordion list */}
          <div className="space-y-0 border-t border-stone">
            {features.map((f, i) => (
              <div
                key={i}
                onClick={() => setActive(i)}
                className={`border-b border-stone cursor-pointer transition-colors duration-200 ${
                  active === i ? 'bg-sand/50' : 'hover:bg-sand/30'
                }`}
              >
                <div className="flex items-center gap-4 py-4 px-4">
                  <span className="text-[10px] font-mono text-dim w-5">{f.num}</span>
                  <h3
                    className={`text-[15px] font-medium transition-colors ${
                      active === i ? 'text-ink' : 'text-mid'
                    }`}
                  >
                    {f.title}
                  </h3>
                  <svg
                    className={`ml-auto w-4 h-4 text-dim transition-transform duration-200 ${
                      active === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <AnimatePresence>
                  {active === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="text-mid text-[13px] leading-relaxed px-4 pb-4 pl-9">
                        {f.desc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Right . visual preview that changes per feature */}
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block sticky top-24"
          >
            <div className="bg-sand rounded-xl border border-stone p-8 md:p-10 min-h-[320px] flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-burnt/10 flex items-center justify-center">
                  <span className="text-burnt text-sm font-mono font-semibold">{features[active].num}</span>
                </div>
                <span className="text-[10px] font-mono text-dim uppercase tracking-widest">Feature</span>
              </div>
              <h3 className="font-serif text-2xl text-ink font-semibold mb-3">
                {features[active].title}
              </h3>
              <p className="text-mid text-sm leading-relaxed">
                {features[active].desc}
              </p>
              <div className="mt-6 pt-5 border-t border-stone">
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-burnt/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-burnt rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${((active + 1) / features.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-dim">{active + 1}/{features.length}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
