import { motion } from 'framer-motion';

export function Quote() {
  return (
    <section className="py-24 md:py-32 px-6 bg-sand border-y border-stone">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl mx-auto text-center"
      >
        <p className="font-serif italic text-[clamp(1.5rem,3.5vw,2.25rem)] leading-[1.25] tracking-[-0.01em] text-ink mb-8">
          &ldquo;Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam.&rdquo;
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full bg-stone" />
          <div className="text-left">
            <p className="text-ink text-sm font-medium">Lorem Ipsum</p>
            <p className="text-mid text-[12px]">CTO at Dolor Sit</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
