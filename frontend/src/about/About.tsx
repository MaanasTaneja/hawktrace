import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import logo from '../assets/HawkTrace-Logo.png';

interface AboutProps {
  onBack: () => void;
  onGetStarted: () => void;
}

const NAV_SECTIONS = [
  { id: 'what-we-are',   label: 'What we are' },
  { id: 'the-problem',   label: 'The problem' },
  { id: 'our-approach',  label: 'Our approach' },
  { id: 'the-research',  label: 'The research' },
  { id: 'get-in-touch',  label: 'Get in touch' },
];

const researchPoints = [
  {
    label: '01',
    title: 'Behavioral recording as test specification',
    body: "Instead of asking engineers to describe what to test, we watch founders use their product and derive the specification from observed behavior. The founder's natural walkthrough carries more signal than any description they could write.",
  },
  {
    label: '02',
    title: 'Video understanding for visual assertion generation',
    body: "We use Gemini's multimodal video understanding to watch recordings and generate assertions based on what actually appeared on screen, not just what the DOM structure says happened. This catches visual regressions that selector-based tools completely miss.",
  },
  {
    label: '03',
    title: 'Autonomous workflow replication',
    body: 'From a recording we build an agent that can autonomously replicate exact workflows in a real browser. This agent runs on every new version of the product and reports what broke, what changed, and what needs attention.',
  },
];

/* ── Split-text heading that reveals word by word on scroll ── */
function SplitHeading({ text, className }: { text: string; className?: string }) {
  return (
    <motion.h2
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={{ visible: { transition: { staggerChildren: 0.055 } } }}
    >
      {text.split(' ').map((word, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', marginRight: '0.28em' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            variants={{
              hidden:  { y: '105%', opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}


export function About({ onBack, onGetStarted }: AboutProps) {
  const [activeSection, setActiveSection] = useState('what-we-are');
  const [hoveredDot, setHoveredDot]       = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  /* Track active section with IntersectionObserver */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-30% 0px -60% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#F5F4F1] font-sans selection:bg-burnt/10">

      {/* Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '220px 220px',
        }}
      />

      {/* Reading progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left"
        style={{ scaleX, background: 'rgba(229,98,42,0.55)' }}
      />

      {/* Navbar */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50 flex justify-center pt-5 px-6"
      >
        <nav
          className="w-full max-w-6xl flex items-center justify-between px-6 py-3 rounded-full"
          style={{
            background: 'rgba(245,244,241,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(226,223,216,0.7)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2">
            <img src={logo} alt="HawkTrace" className="h-6 w-auto" />
            <span className="font-serif text-[1.1rem] font-bold tracking-tight text-ink">HawkTrace</span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-medium text-mid hover:text-ink transition-colors duration-200"
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <button
            onClick={onGetStarted}
            className="text-[13px] font-medium px-5 py-2 rounded-full active:scale-95 transition-all duration-200"
            style={{
              background: 'rgba(229,98,42,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(229,98,42,0.45)',
              color: '#E5622A',
            }}
          >
            Get Started
          </button>
        </nav>
      </motion.div>

      {/* Section dot navigator - fixed left */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-0">
        {/* Track line */}
        <div className="absolute left-[5px] top-0 bottom-0 w-px" style={{ background: 'rgba(229,98,42,0.15)' }} />

        {NAV_SECTIONS.map(({ id, label }, i) => {
          const isActive = activeSection === id;
          const isHovered = hoveredDot === id;
          return (
            <div key={id} className="relative flex items-center" style={{ paddingTop: i === 0 ? 0 : 28 }}>
              <button
                onClick={() => scrollTo(id)}
                onMouseEnter={() => setHoveredDot(id)}
                onMouseLeave={() => setHoveredDot(null)}
                className="relative z-10 flex items-center justify-center w-[11px] h-[11px] rounded-full transition-all duration-300"
                style={{
                  background: isActive ? '#E5622A' : 'rgba(229,98,42,0.2)',
                  border: isActive ? '2px solid #E5622A' : '1.5px solid rgba(229,98,42,0.3)',
                  transform: isActive ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: isActive ? '0 0 8px rgba(229,98,42,0.4)' : 'none',
                }}
              />
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-5 font-mono text-[12px] text-mid whitespace-nowrap tracking-wide"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <main className="max-w-[700px] mx-auto px-4 pt-36 pb-16 relative z-10">

        {/* Hero box */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-10 mb-3"
          style={{ border: '1px solid rgba(229,98,42,0.25)' }}
        >
          <p className="font-mono text-[12px] text-burnt uppercase tracking-[0.3em] mb-5">XXXX Labs</p>
          <h1 className="font-serif text-[clamp(2.2rem,4vw,3.2rem)] font-bold text-ink leading-[1.08] tracking-[-0.02em] mb-6">
            We build autonomous agents for software quality.
          </h1>
          <p className="font-sans text-[15px] text-mid leading-[1.8]">
            A research lab focused on one problem. The teams that need quality assurance the most are exactly the ones who cannot afford the tools that exist today.
          </p>
        </motion.div>

        {/* What we are */}
        <section id="what-we-are" className="scroll-mt-28 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-10"
            style={{ border: '1px solid rgba(229,98,42,0.25)' }}
          >
            <p className="font-mono text-[12px] text-burnt uppercase tracking-[0.3em] mb-3">What we are</p>
            <SplitHeading
              text="Not a QA company. A research lab."
              className="font-serif text-[1.65rem] font-semibold text-ink leading-snug tracking-[-0.01em] mb-6"
            />
            <div className="space-y-4 font-sans text-[15px] text-mid leading-[1.8]">
              <p>
                We are not building a better version of Selenium or a cheaper version of Mabl. We are researchers who believe that quality assurance should be invisible, automatic, and derived entirely from how founders naturally use their products.
              </p>
              <p>
                HawkTrace is the first agent we have built. It will not be the last.
              </p>
            </div>
          </motion.div>
        </section>

        {/* The problem */}
        <section id="the-problem" className="scroll-mt-28 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-10"
            style={{ border: '1px solid rgba(229,98,42,0.25)' }}
          >
            <p className="font-mono text-[12px] text-burnt uppercase tracking-[0.3em] mb-3">The problem</p>
            <SplitHeading
              text="Twenty minutes after every deploy, forever."
              className="font-serif text-[1.65rem] font-semibold text-ink leading-snug tracking-[-0.01em] mb-6"
            />
            <div className="space-y-4 font-sans text-[15px] text-mid leading-[1.8]">
              <p>
                Every early-stage founder manually tests their own product after every deploy. They open the app, click through the main flows, make sure nothing broke, and get back to work. Twenty minutes every single time. Sometimes they skip it. Sometimes a user finds the bug first.
              </p>
              <p>
                The tools that exist to fix this were built for companies with dedicated QA engineers, enterprise budgets, and weeks to spend on onboarding. For a three-person startup trying to ship, they are completely out of reach.
              </p>
              <p>
                So founders accept the risk. They find out about broken flows from angry users. They lose customers they never knew they lost. This is the problem we are solving.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Our approach */}
        <section id="our-approach" className="scroll-mt-28 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-10"
            style={{ border: '1px solid rgba(229,98,42,0.25)' }}
          >
            <p className="font-mono text-[12px] text-burnt uppercase tracking-[0.3em] mb-3">Our approach</p>
            <SplitHeading
              text="What if the tool just watched you use your product?"
              className="font-serif text-[1.65rem] font-semibold text-ink leading-snug tracking-[-0.01em] mb-6"
            />
            <div className="space-y-4 font-sans text-[15px] text-mid leading-[1.8]">
              <p>
                Most QA tools ask you to describe what to test. Write it in plain English. Record it in their platform. Script it in code. We asked a different question.
              </p>
              <p>
                Founders already know their product better than anyone. They demo it, use it, and walk investors through it every day. That natural behavior contains everything you need to know about what matters and what should never break.
              </p>
              <p>
                HawkTrace captures that behavior, builds an agent from it, and runs that agent on every new version of your product. The founder never writes a test. Never configures a pipeline. Never thinks about QA again.
              </p>
            </div>
          </motion.div>
        </section>

        {/* The research */}
        <section id="the-research" className="scroll-mt-28 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-10"
            style={{ border: '1px solid rgba(229,98,42,0.25)' }}
          >
            <p className="font-mono text-[12px] text-burnt uppercase tracking-[0.3em] mb-3">The research</p>
            <SplitHeading
              text="Three core technical ideas."
              className="font-serif text-[1.65rem] font-semibold text-ink leading-snug tracking-[-0.01em] mb-4"
            />
            <p className="font-sans text-[15px] text-mid leading-[1.8] mb-8">
              HawkTrace is not a wrapper around an existing testing framework. It is built from the ground up on ideas that did not exist in QA tooling before.
            </p>
            <div className="space-y-3">
              {researchPoints.map((pt, i) => (
                <motion.div
                  key={pt.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
                  whileHover={{ y: -2 }}
                  className="rounded-xl p-5 cursor-default"
                  style={{
                    border: '1px solid rgba(229,98,42,0.15)',
                    background: 'rgba(229,98,42,0.03)',
                  }}
                >
                  <div className="flex items-start gap-5">
                    <span className="font-mono text-[11px] text-burnt tracking-widest mt-[3px] shrink-0">{pt.label}</span>
                    <div>
                      <h4 className="font-serif text-[1rem] font-semibold text-ink leading-snug mb-2">{pt.title}</h4>
                      <p className="font-sans text-[13.5px] text-mid leading-[1.75]">{pt.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Get in touch */}
        <section id="get-in-touch" className="scroll-mt-28 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-10"
            style={{ border: '1px solid rgba(229,98,42,0.25)' }}
          >
            <p className="font-mono text-[12px] text-burnt uppercase tracking-[0.3em] mb-3">Get in touch</p>
            <SplitHeading
              text="We want to hear from you."
              className="font-serif text-[1.65rem] font-semibold text-ink leading-snug tracking-[-0.01em] mb-5"
            />
            <p className="font-sans text-[15px] text-mid leading-[1.8] mb-7">
              We are always interested in talking to founders building fast, researchers thinking about autonomous systems, and engineers who care about software quality.
            </p>
            <motion.a
              href="mailto:hello@xxxx.ai"
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="inline-flex items-center gap-2 font-mono text-[13px] text-burnt hover:opacity-70 transition-opacity tracking-wide"
            >
              hello@xxxx.ai →
            </motion.a>
          </motion.div>
        </section>

      </main>
    </div>
  );
}
