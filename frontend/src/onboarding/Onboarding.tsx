import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import logo from '../assets/HawkTrace-Logo.png';

export interface UserProfile {
  name: string;
  position: string;
  company: string;
}

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onBack: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBack }) => {
  const [name, setName] = React.useState('');
  const [position, setPosition] = React.useState('');
  const [company, setCompany] = React.useState('');

  const canSubmit = name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const profile: UserProfile = {
      name: name.trim(),
      position: position.trim(),
      company: company.trim(),
    };
    localStorage.setItem('hawktrace_user_profile', JSON.stringify(profile));
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-cream relative flex items-center justify-center p-6 overflow-hidden">
      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-burnt/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-burnt/5 blur-[120px] rounded-full" />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-mid hover:text-ink transition-colors group z-20"
      >
        <div className="w-8 h-8 rounded-full bg-sand/50 flex items-center justify-center group-hover:bg-sand transition-colors">
          <ChevronLeft size={16} />
        </div>
        <span className="text-[13px] font-medium font-sans">Back</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-sand rounded-3xl p-8 lg:p-10 shadow-[0_8px_32px_rgba(20,18,17,0.04)]">
          {/* Header */}
          <div className="text-center mb-10">
            <img src={logo} alt="HawkTrace" className="h-20 w-20 object-contain mx-auto mb-3" />
            <h1 className="font-serif font-bold text-3xl tracking-tight text-ink mb-2">HawkTrace</h1>
            <h2 className="font-serif text-2xl text-ink mb-3">Who are you?</h2>
            <p className="font-sans text-mid text-[15px]">
              Just a few details to personalize your workspace.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-mid uppercase tracking-wider ml-1">
                Full name <span className="text-burnt">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Doe"
                autoFocus
                className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-mid/40 transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-mid uppercase tracking-wider ml-1">
                Role / Position
              </label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="e.g. CEO, Founder, QA Engineer"
                className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-mid/40 transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-mid uppercase tracking-wider ml-1">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Acme Inc."
                className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-mid/40 transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 font-sans font-semibold py-3.5 rounded-full transition-all mt-2 ${
                canSubmit
                  ? 'bg-[#E5622A]/10 border border-[#E5622A]/20 text-[#E5622A] hover:bg-[#E5622A]/20 hover:-translate-y-0.5'
                  : 'bg-sand/50 border border-sand text-mid/40 cursor-not-allowed'
              }`}
            >
              Let's go
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
