import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WhatIsQA } from './components/WhatIsQA';
import { HawkIllustration } from './components/HawkIllustration';
import { ProblemSolution } from './components/ProblemSolution';
import { LiveDemo } from './components/LiveDemo';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

// Navbar outer pt-5 (20px) + pill ~60px = 80px
const NAV_H = 80;

interface LandingPageProps {
  onSignInClick: () => void;
  onGetStarted: () => void;
  onAbout: () => void;
}

export function LandingPage({ onSignInClick, onGetStarted, onAbout }: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);

  // scrollYProgress goes 0→1 as the left column's bottom edge travels from
  // the viewport bottom to the viewport top — i.e. from "stat just visible"
  // to "WhatIsQA fully scrolled away / ProblemSolution fully in view".
  const { scrollYProgress } = useScroll({
    target:    wrapperRef,
    container: containerRef,
    offset:    ['end end', 'end start'],
  });

  const hawkOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen bg-[#F5F4F1] overflow-x-hidden"
      style={{ overflowY: 'scroll', scrollSnapType: 'y mandatory' }}
    >
      {/* Grain overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '220px 220px',
        }}
      />

      <Navbar onSignInClick={onSignInClick} onGetStarted={onGetStarted} onAbout={onAbout} />

      {/* Hawk: fixed right 45%, fades as WhatIsQA scrolls away — desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.35 }}
        className="hidden md:block"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '45%',
          height: '100vh',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <motion.div style={{ opacity: hawkOpacity }} className="w-full h-full">
          <HawkIllustration />
        </motion.div>
      </motion.div>

      {/* Left column — Hero + WhatIsQA */}
      <div
        ref={wrapperRef}
        className="relative w-full md:w-[55%] z-10"
        style={{ paddingTop: NAV_H + 16, paddingBottom: 30 }}
      >
        {/* Hero snap section */}
        <div
          className="border ml-3 mr-4 rounded-2xl"
          style={{
            borderColor: 'rgba(229,98,42,0.25)',
            scrollSnapAlign: 'start',
            scrollMarginTop: NAV_H + 16,
          }}
        >
          <Hero onGetStarted={onGetStarted} />
        </div>

        {/* WhatIsQA snap section */}
        <div
          className="border ml-3 mr-4 rounded-2xl mt-3"
          style={{
            borderColor: 'rgba(229,98,42,0.25)',
            scrollSnapAlign: 'start',
            scrollMarginTop: NAV_H,
            minHeight: `calc(100vh - ${NAV_H}px)`,
          }}
        >
          <WhatIsQA />
        </div>
      </div>

      {/* ProblemSolution snap section */}
      <div style={{ scrollSnapAlign: 'start' }}>
        <ProblemSolution />
      </div>

      <div style={{ scrollSnapAlign: 'start' }}>
        <LiveDemo />
      </div>

      <div style={{ scrollSnapAlign: 'start' }}>
        <CTA onGetStarted={onGetStarted} />
      </div>

      <Footer onAbout={onAbout} />
    </div>
  );
}
