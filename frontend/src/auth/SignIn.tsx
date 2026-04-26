import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import logo from '../assets/HawkTrace-Logo.png';
import { BACKEND, type StoredUser } from '../api';

interface SignInProps {
  onSignUpClick: () => void;
  onBack: () => void;
  onSuccess: (user: StoredUser, token: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignUpClick, onBack, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokenRes = await fetch(`${BACKEND}/users/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });
      if (!tokenRes.ok) {
        setError('Invalid username or password.');
        return;
      }
      const { access_token } = await tokenRes.json();

      const meRes = await fetch(`${BACKEND}/users/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!meRes.ok) {
        setError('Login failed. Please try again.');
        return;
      }
      const user: StoredUser = await meRes.json();
      onSuccess(user, access_token);
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onBack={onBack}>
      <div className="text-center mb-10">
        <img src={logo} alt="HawkTrace" className="h-20 w-20 object-contain mx-auto mb-3" />
        <h1 className="font-serif font-bold text-3xl tracking-tight text-ink mb-2">HawkTrace</h1>
        <h2 className="font-serif text-2xl text-ink mb-3">Welcome back.</h2>
        <p className="font-sans text-white text-[15px]">Your test suites are waiting.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-white uppercase tracking-wider ml-1">
            Username
          </label>
          <input
            type="text"
            placeholder="your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-white uppercase tracking-wider ml-1">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
            required
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-500 font-sans text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] font-sans font-semibold py-3.5 rounded-full hover:bg-[#E5622A]/20 transition-all hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-8 text-center text-[14px] text-white/80">
        Don't have an account?{' '}
        <button
          onClick={onSignUpClick}
          className="text-white font-semibold underline underline-offset-4 decoration-white/50 hover:decoration-white transition-all"
        >
          Start for free.
        </button>
      </div>
    </AuthLayout>
  );
};
