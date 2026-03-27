import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const events = [
  { id: 1, type: 'navigation', url: 'https://app.acme.com' },
  { id: 2, type: 'click', target: 'input#email' },
  { id: 3, type: 'input', value: 'admin@acme.com' },
  { id: 4, type: 'click', target: 'input#pass' },
  { id: 5, type: 'input', value: '••••••••' },
  { id: 6, type: 'click', target: 'button.submit' },
  { id: 7, type: 'assertion', condition: 'URL includes /dashboard' },
];

export function BrowserSimulation() {
  const [step, setStep] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState<typeof events>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (step < events.length) {
      const timer = setTimeout(() => {
        setVisibleEvents(prev => [...prev, events[step]].slice(-4));
        setStep(s => s + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsComplete(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Reset loop
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setStep(0);
        setVisibleEvents([]);
        setIsComplete(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto">
      {/* Main Browser Window */}
      <div className="absolute inset-0 bg-[#0E0E10] rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col">
        {/* Browser Header */}
        <div className="h-10 bg-[#161618] border-b border-white/[0.05] flex items-center px-4 gap-4">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
          <div className="flex-grow bg-white/[0.03] border border-white/[0.05] rounded px-3 py-1 flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/30 leading-none pt-0.5 tracking-tight">app.acme.com</span>
          </div>
        </div>

        {/* Browser Content + Sidebar */}
        <div className="flex-grow flex overflow-hidden border-t border-white/[0.05]">
          {/* Main Viewport */}
          <div className="flex-grow bg-[#0E0E10] p-8 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!isComplete ? (
                <motion.div
                  key="app"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center max-w-[240px] mx-auto space-y-4"
                >
                  <div className="w-10 h-10 bg-white/5 rounded-lg mb-4" />
                  <div className="w-full h-8 bg-white/[0.02] border border-white/[0.06] rounded px-3 flex items-center">
                    {step > 2 && <span className="text-[10px] font-mono text-white/60">admin@acme.com</span>}
                  </div>
                  <div className="w-full h-8 bg-white/[0.02] border border-white/[0.06] rounded px-3 flex items-center">
                    {step > 4 && <span className="text-[10px] font-mono text-white/40">••••••••</span>}
                  </div>
                  <div className={`w-full h-9 rounded text-white text-[11px] font-medium flex items-center justify-center transition-colors shadow-lg ${step > 6 ? 'bg-green-500/80' : 'bg-[#E5622A]'}`}>
                    {step > 6 ? 'Success' : 'Sign In'}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full w-full bg-[#161618] p-6 font-mono text-[10px] overflow-hidden relative"
                >
                  <div className="text-burnt mb-2 opacity-50">// login-flow.spec.ts</div>
                  <div className="text-white/60">
                    <span className="text-burnt">test</span>(&apos;login flow&apos;, async ({'{'} page {'}'}) =&gt; {'{'}
                    <div className="pl-4 mt-1 space-y-1">
                      <div>await page.<span className="text-blue-300">goto</span>(&apos;https://app.acme.com&apos;);</div>
                      <div>await page.<span className="text-blue-300">fill</span>(&apos;#email&apos;, &apos;admin@acme.com&apos;);</div>
                      <div>await page.<span className="text-blue-300">fill</span>(&apos;#pass&apos;, &apos;********&apos;);</div>
                      <div>await page.<span className="text-blue-300">click</span>(&apos;button.submit&apos;);</div>
                      <div>await <span className="text-yellow-200">expect</span>(page).<span className="text-blue-300">toHaveURL</span>(/dashboard/);</div>
                    </div>
                    {'}'});
                  </div>
                  <div className="absolute top-4 right-4 bg-burnt/10 text-burnt px-2 py-1 rounded text-[8px] uppercase tracking-widest font-bold">
                    AI Generated
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animated Cursor */}
            {!isComplete && (
              <motion.div
                animate={{
                  x: step === 0 ? 0 : step === 2 || step === 3 ? -60 : step === 4 || step === 5 ? -60 : step === 6 ? -60 : 0,
                  y: step === 0 ? 0 : step === 2 || step === 3 ? -20 : step === 4 || step === 5 ? 30 : step === 6 ? 80 : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 100 }}
                className="absolute pointer-events-none z-50 left-1/2 top-1/2 -ml-2 -mt-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.5 1.5L20.5 11.5L13.5 13.5L16.5 19.5L13.5 21L10.5 15L4.5 19.5V1.5Z" fill="white" stroke="black" strokeWidth="1"/>
                </svg>
              </motion.div>
            )}

            {/* Live Badge */}
            {!isComplete && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Live</span>
              </div>
            )}
          </div>

          {/* DevTools Side Panel */}
          <div className="w-48 bg-[#161618] border-l border-white/[0.05] p-3 flex flex-col gap-2">
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1">Event Trace</div>
            <div className="flex-grow space-y-1.5 overflow-hidden">
              <AnimatePresence>
                {visibleEvents.map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white/[0.02] border border-white/[0.05] p-2 rounded flex flex-col min-w-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] text-burnt font-mono font-bold uppercase">{ev.type}</span>
                      <span className="text-[7px] text-white/10 font-mono">1.2ms</span>
                    </div>
                    <span className="text-[9px] text-white/50 font-mono truncate leading-tight">
                      {ev.type === 'navigation' ? ev.url : ev.type === 'input' ? ev.value : ev.target}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
