import { motion } from 'framer-motion';

const features = [
  {
    number: '01',
    title: 'Live browser capture',
    description:
      'Every click, every input, every navigation recorded through a real Chromium session. Not synthetic events. Not mocks. The actual product.',
  },
  {
    number: '02',
    title: 'Instant agent creation',
    description:
      'Your recording becomes a fully autonomous agent in minutes. No scripting. No test harness. No YAML configuration files.',
  },
  {
    number: '03',
    title: 'Continuous regression testing',
    description:
      'Every deploy triggers your agent automatically. Your flows run before your users ever touch the new version.',
  },
  {
    number: '04',
    title: 'Natural language reports',
    description:
      'Knows exactly what failed, on which step, and why. Not just a red X. A sentence your whole team can understand.',
  },
  {
    number: '05',
    title: 'Zero configuration',
    description:
      'No infrastructure to manage. No test scripts to maintain. No dedicated QA engineer required to keep it running.',
  },
  {
    number: '06',
    title: 'One URL to start',
    description:
      'Point us at your product. Record your first flow. That is the entire setup. You are done in under five minutes.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export function ProblemSolution() {
  return (
    <section className="relative py-32 px-8 bg-[#F5F4F1]">
      <div className="max-w-7xl mx-auto">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-10"
        >
          <span className="font-mono text-[25px] text-burnt tracking-[0.2em] uppercase">
            How it works
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-[clamp(2rem,3.8vw,3.2rem)] leading-[1.1] tracking-[-0.02em] text-ink mb-14 max-w-3xl"
        >
          An agent that learns your product
          <br />
          <span className="italic text-mid font-mono text-[25px]">and never forgets a flow.</span>
        </motion.h2>

        {/* 6-column feature grid (2 rows x 3 cols) */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-14 gap-y-14"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {features.map((f) => (
            <motion.div key={f.number} variants={itemVariants} className="group">
              {/* Number */}
              <div className="font-mono text-[2.2rem] font-medium text-burnt/25 leading-none mb-4 tracking-tighter select-none group-hover:text-burnt/50 transition-colors duration-300">
                {f.number}
              </div>

              {/* Divider */}
              <div className="w-8 h-px bg-stone mb-4 group-hover:w-14 group-hover:bg-burnt/40 transition-all duration-300" />

              {/* Title */}
              <h3 className="font-serif text-[1.1rem] font-semibold text-ink mb-2.5 leading-snug">
                {f.title}
              </h3>

              {/* Description */}
              <p className="font-sans text-[13.5px] text-mid leading-[1.7]">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
