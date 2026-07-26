import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onSignInClick: () => void;
  onGetStarted: () => void;
  onAbout: () => void;
}

export function Navbar({ onSignInClick, onGetStarted, onAbout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);


  const closeMenu = () => setMenuOpen(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center pt-5 px-4 md:px-6"
    >
      <nav
        className="w-full max-w-6xl flex items-center justify-between px-4 md:px-6 py-3 rounded-full"
        style={{
          background: 'rgba(245, 244, 241, 0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(226,223,216,0.7)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left: Lab name */}
        <div className="flex flex-col leading-none">
          <span className="font-serif text-[1.2rem] md:text-[1.35rem] font-bold tracking-tight text-ink">
            XXXX Labs
          </span>
        </div>

        {/* Center: Nav links — desktop only */}
        <div className="hidden md:flex items-center gap-8 text-[13px] text-mid font-sans font-medium">
          {['Docs', 'Blog'].map((link) => (
            <a key={link} href="#" className="hover:text-ink transition-colors duration-200 relative group">
              {link}
              <span className="absolute -bottom-px left-0 w-0 h-px bg-burnt transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
          <button onClick={onAbout} className="hover:text-ink transition-colors duration-200 relative group">
            About
            <span className="absolute -bottom-px left-0 w-0 h-px bg-burnt transition-all duration-200 group-hover:w-full" />
          </button>
        </div>

        {/* Right: Buttons — desktop only */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={onSignInClick}
            className="text-[13px] text-ink font-medium px-4 py-2 rounded-full border border-stone hover:border-mid hover:bg-sand/60 transition-all duration-200"
          >
            Sign In
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
        </div>

        {/* Hamburger — mobile only */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-[5px] p-2">
          <span className={`block w-5 h-px bg-ink transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
          <span className={`block w-5 h-px bg-ink transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-px bg-ink transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
        </button>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[72px] left-4 right-4 rounded-2xl p-4 flex flex-col gap-2"
            style={{
              background: 'rgba(245, 244, 241, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(226,223,216,0.7)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            {['Docs', 'Blog'].map((link) => (
              <a key={link} href="#" onClick={closeMenu} className="text-[14px] text-mid font-sans font-medium px-3 py-2 rounded-xl hover:bg-sand/60 hover:text-ink transition-colors">
                {link}
              </a>
            ))}
            <button onClick={() => { onAbout(); closeMenu(); }} className="text-left text-[14px] text-mid font-sans font-medium px-3 py-2 rounded-xl hover:bg-sand/60 hover:text-ink transition-colors">
              About
            </button>
            <div className="h-px bg-stone/40 my-1" />
            <button onClick={() => { onSignInClick(); closeMenu(); }} className="text-[14px] text-ink font-medium px-3 py-2 rounded-xl border border-stone hover:bg-sand/60 transition-colors">
              Sign In
            </button>
            <button
              onClick={() => { onGetStarted(); closeMenu(); }}
              className="text-[14px] font-medium px-3 py-2.5 rounded-xl active:scale-95 transition-all"
              style={{ background: 'rgba(229,98,42,0.18)', border: '1px solid rgba(229,98,42,0.45)', color: '#E5622A' }}
            >
              Get Started
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
