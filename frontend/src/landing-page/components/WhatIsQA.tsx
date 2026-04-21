import { motion } from 'framer-motion';

const bodyBlocks = [
  `After every deploy someone on the team opens the product, clicks through the main flows, makes sure nothing broke, and gets back to work. Twenty minutes every single time. Sometimes they skip it. Sometimes a user finds the bug first.`,
  `This is not bad engineering. This is just the reality of moving fast without a QA team. And it is costing you users you never knew you lost.`,
  `The tools that exist to fix this cost $500 a month, require a dedicated QA engineer to operate, and were built for companies that already have a testing culture. For a three person startup trying to ship, they are completely out of reach.`,
  `So founders do nothing. They accept the risk. They find out about broken flows from angry users at 2am.`,
];

export function WhatIsQA() {
  return (
    <div className="px-8 pt-10 pb-6">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-10"
      >
        <span className="font-mono text-[25px] text-burnt tracking-[0.2em] uppercase">
          Why QA is broken
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-[clamp(2rem,3.8vw,3.2rem)] leading-[1.1] tracking-[-0.02em] text-ink mb-14"
      >
        Every founder is their own QA team.
        <br />
        <span className="italic text-mid font-mono text-[25px]">
          They just do not know it yet.
        </span>
      </motion.h2>

      {/* Body text blocks */}
      <div className="space-y-8">
        {bodyBlocks.map((text, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              duration: 1.2,
              delay: i * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`text-[15px] leading-[1.75] font-sans ${
              i === bodyBlocks.length - 1
                ? 'text-ink font-medium'
                : 'text-mid'
            }`}
          >
            {text}
          </motion.p>
        ))}
      </div>

      {/* Stat callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="mt-16 p-8 rounded-2xl"
        style={{
          background: 'rgba(229,98,42,0.04)',
          border: '1px solid rgba(229,98,42,0.12)',
        }}
      >
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-serif text-[3.5rem] font-bold text-burnt leading-none tracking-tight">
            20
          </span>
          <span className="font-mono text-sm text-burnt/70 tracking-wide">min / deploy</span>
        </div>
        <p className="font-sans text-[13px] text-mid leading-relaxed">
          The average time a founder spends manually checking their product after
          each deploy. Multiplied by every deploy. Every week. Forever.
        </p>
      </motion.div>

    </div>
  );
}
