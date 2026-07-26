import { motion } from 'framer-motion';

interface CTAProps {
  onGetStarted: () => void;
}

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section
      className="relative py-36 px-8"
      style={{
        backgroundImage: 'url(/new-1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Top separator */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[1.08] tracking-[-0.025em] text-white mb-12"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
        >
          Stop finding bugs
          <br />
          from your users.
          <br />
          <span className="italic font-mono text-[25px]" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Start catching them first.</span>
        </motion.h2>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <button
            onClick={onGetStarted}
            className="text-[14px] font-medium px-10 py-4 rounded-full active:scale-95 transition-all duration-200"
            style={{
              background: 'rgba(180,60,10,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(229,98,42,0.6)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            }}
          >
            Get Started
          </button>

          {/* Subtext */}
          <p className="font-mono text-[11px] text-white/70 tracking-wide" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)' }}>
            No credit card.&nbsp;&nbsp;No setup.&nbsp;&nbsp;Just a URL.
          </p>
        </motion.div>
      </div>

      {/* Bottom separator */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </section>
  );
}
