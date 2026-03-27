import { motion } from 'framer-motion';

interface CTAProps {
  onGetStarted: () => void;
}

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section id="cta" className="py-24 px-6 bg-ink text-cream">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-tight tracking-tight mb-6"
        >
          Stop shipping blind.
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-dim text-[17px] max-w-lg mx-auto mb-10"
        >
          Your users shouldn't be your QA team. Record once, test forever.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={onGetStarted}
            className="bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] text-sm font-medium px-8 py-3 rounded-full hover:bg-[#E5622A]/20 transition-all hover:-translate-y-0.5"
          >
            Start recording
          </button>
          
          <div className="mt-6 flex justify-center items-center gap-2 text-[12px] text-dim/60 font-medium font-sans">
            <span>No credit card</span>
            <span className="w-1 h-1 rounded-full bg-dim/30" />
            <span>Setup in seconds</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
