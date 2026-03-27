import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from '../../assets/HawkTrace-Logo.png';

interface NavbarProps {
  onSignInClick: () => void;
  onGetStarted: () => void;
}

export function Navbar({ onSignInClick, onGetStarted }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-cream/90 backdrop-blur-lg border-b border-stone/50' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="HawkTrace" className="h-14 w-14 object-contain" />
          <span className="font-serif text-2xl font-semibold tracking-tight leading-none pt-0.5">HawkTrace</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-mid font-sans">
          <a href="#how" className="hover:text-ink transition-colors">How it works</a>
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          <button 
            onClick={onSignInClick}
            className="hover:text-ink transition-colors font-medium"
          >
            Sign in
          </button>
        </div>
        <button
          onClick={onGetStarted}
          className="bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] text-[13px] font-medium px-5 py-1.5 rounded-full hover:bg-[#E5622A]/20 transition-all hover:scale-[1.02]"
        >
          Get started
        </button>
      </div>
    </motion.nav>
  );
}