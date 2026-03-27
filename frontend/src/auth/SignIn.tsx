import React from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from './AuthLayout';
import logo from '../assets/HawkTrace-Logo.png';

interface SignInProps {
  onSignUpClick: () => void;
  onBack: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignUpClick, onBack }) => {
  return (
    <AuthLayout onBack={onBack}>
      <div className="text-center mb-10">
        <img src={logo} alt="HawkTrace" className="h-20 w-20 object-contain mx-auto mb-3" />
        <h1 className="font-serif font-bold text-3xl tracking-tight text-ink mb-2">HawkTrace</h1>
        <h2 className="font-serif text-2xl text-ink mb-3">Welcome back.</h2>
        <p className="font-sans text-mid text-[15px]">
          Your test suites are waiting.
        </p>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-mid uppercase tracking-wider ml-1">
            Work email
          </label>
          <input
            type="email"
            placeholder="jane@company.com"
            className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="block text-[11px] font-medium text-mid uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              className="text-[11px] font-medium text-burnt hover:opacity-80 transition-opacity"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] font-sans font-semibold py-3.5 rounded-full hover:bg-[#E5622A]/20 transition-all hover:-translate-y-0.5 mt-2"
        >
          Sign in
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-sand"></div>
        </div>
        <div className="relative flex justify-center text-[13px]">
          <span className="px-3 bg-white/40 backdrop-blur-xl text-dim font-medium">or</span>
        </div>
      </div>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-3 bg-transparent border border-sand py-3 rounded-full hover:bg-cream/50 transition-colors text-ink font-sans text-[15px] font-medium"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.705a5.41 5.41 0 01-.282-1.705c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.443 2.017.957 4.963L3.964 7.3a5.41 5.41 0 015.036-3.722z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="mt-8 text-center text-[14px] text-mid">
        Don't have an account?{' '}
        <button
          onClick={onSignUpClick}
          className="text-burnt font-medium underline underline-offset-4 decoration-burnt/30 hover:decoration-burnt transition-all"
        >
          Start for free.
        </button>
      </div>
    </AuthLayout>
  );
};
