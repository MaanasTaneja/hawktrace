import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import logo from '../assets/HawkTrace-Logo.png';
import { BACKEND, type StoredUser } from '../api';

interface SignUpProps {
  onSignInClick: () => void;
  onBack: () => void;
  onSuccess: (user: StoredUser, token: string) => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSignInClick, onBack, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const regRes = await fetch(`${BACKEND}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, company, email, password }),
      });
      if (!regRes.ok) {
        const data = await regRes.json().catch(() => ({}));
        setError(data.detail ?? 'Registration failed. Please try again.');
        return;
      }

      // Auto-login after registration
      const tokenRes = await fetch(`${BACKEND}/users/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });
      if (!tokenRes.ok) {
        setError('Account created — please sign in.');
        return;
      }
      const { access_token } = await tokenRes.json();

      const meRes = await fetch(`${BACKEND}/users/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
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
      <div className="text-center mb-6">
        <img src={logo} alt="HawkTrace" className="h-14 w-14 object-contain mx-auto mb-2" />
        <h1 className="font-serif font-bold text-2xl tracking-tight text-ink mb-1">HawkTrace</h1>
        <h2 className="font-serif text-xl text-ink mb-9">Start catching bugs.</h2>
        <p className="font-sans text-white text-[13px]">No QA background needed. No credit card required.</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-white uppercase tracking-wider ml-1">Username</label>
          <input
            type="text"
            placeholder="janedoe"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-2.5 text-[14px] text-black placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-white uppercase tracking-wider ml-1">Company</label>
          <input
            type="text"
            placeholder="Acme Inc."
            value={company}
            onChange={e => setCompany(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-2.5 text-[14px] text-black placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-white uppercase tracking-wider ml-1">Work email</label>
          <input
            type="email"
            placeholder="jane@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-2.5 text-[14px] text-black placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-white uppercase tracking-wider ml-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-2.5 text-[14px] text-black placeholder:text-dim transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
            required
          />
        </div>
        <div className="py-2" />

        {error && (
          <p className="text-[13px] text-red-500 font-sans text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E5622A]/10 backdrop-blur-md border border-[#E5622A]/20 text-[#E5622A] font-sans font-semibold py-3.5 rounded-full hover:bg-[#E5622A]/20 transition-all hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'Create your account'}
        </button>
      </form>

      <div className="mt-5 text-center text-[14px] text-white/80">
        Already have an account?{' '}
        <button
          onClick={onSignInClick}
          className="text-white font-semibold underline underline-offset-4 decoration-white/50 hover:decoration-white transition-all"
        >
          Sign in.
        </button>
      </div>
    </AuthLayout>
  );
};
