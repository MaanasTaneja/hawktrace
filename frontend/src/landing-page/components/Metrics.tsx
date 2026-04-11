import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const stats = [
  { value: 12, suffix: 's', label: 'Average recording time' },
  { value: 0, suffix: '', label: 'Config files needed', display: '0' },
  { value: 94, suffix: '%', label: 'Test accuracy on first run' },
  { value: 3, suffix: 'x', label: 'Faster than writing tests manually' },
];

export function Metrics() {
  return (
    <section className="py-20 md:py-28 px-6 bg-cream">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="font-serif text-[clamp(2.5rem,5vw,4rem)] tracking-tight text-ink font-semibold leading-none mb-2">
              {stat.display ? stat.display : <Counter end={stat.value} suffix={stat.suffix} />}
            </div>
            <p className="text-mid text-[13px]">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
