import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Server, AlertTriangle, Check, LayoutDashboard, Video, PlayCircle } from 'lucide-react';
import logo from '../assets/HawkTrace-Logo.png';
import type { UserProfile } from '../onboarding/Onboarding';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onBack: () => void;
  onSignOut: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdateProfile, onBack, onSignOut }) => {
  const [activeSection, setActiveSection] = React.useState<'profile' | 'workspace' | 'danger'>('profile');

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] font-sans">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-[#F0EDE8] flex flex-col fixed h-screen z-20">
        <div className="p-10 pb-12">
          <div className="flex items-center justify-center gap-2">
            <img src={logo} alt="HawkTrace" className="h-16 w-16 object-contain" />
            <h1 className="text-3xl font-serif font-black text-ink tracking-tight">HawkTrace</h1>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <button
            onClick={onBack}
            className="flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-muted hover:text-ink w-full text-left group"
          >
            <span className="text-[#6B6560] group-hover:text-[#E5622A] transition-colors">
              <LayoutDashboard size={18} />
            </span>
            <span className="text-sm tracking-tight">Dashboard</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-muted hover:text-ink w-full text-left group"
          >
            <span className="text-[#6B6560] group-hover:text-[#E5622A] transition-colors">
              <Video size={18} />
            </span>
            <span className="text-sm tracking-tight">Flows</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-muted hover:text-ink w-full text-left group"
          >
            <span className="text-[#6B6560] group-hover:text-[#E5622A] transition-colors">
              <PlayCircle size={18} />
            </span>
            <span className="text-sm tracking-tight">Test Runs</span>
          </button>
        </nav>

        <div className="p-6 border-t border-[#F0EDE8]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-black text-[#6B6560]/60 hover:text-burnt uppercase tracking-[0.2em] transition-all pl-2"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
            Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[280px] p-16 max-w-[1000px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-12"
        >
          <header className="pt-4 border-b border-[#F0EDE8] pb-8">
            <h2 className="text-4xl font-serif font-bold text-ink tracking-tight">Settings</h2>
            <p className="text-sm text-muted font-sans mt-2">Manage your profile and workspace preferences.</p>
          </header>

          {/* Tab nav */}
          <div className="flex gap-1 border-b border-[#F0EDE8]">
            {([
              { id: 'profile', label: 'Profile', icon: <User size={14} /> },
              { id: 'workspace', label: 'Workspace', icon: <Server size={14} /> },
              { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={14} /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[13px] font-sans font-semibold border-b-2 -mb-px transition-all ${
                  activeSection === tab.id
                    ? 'border-burnt text-burnt'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeSection === 'profile' && (
            <ProfileSection userProfile={userProfile} onUpdateProfile={onUpdateProfile} />
          )}
          {activeSection === 'workspace' && <WorkspaceSection />}
          {activeSection === 'danger' && <DangerSection onSignOut={onSignOut} />}
        </motion.div>
      </main>
    </div>
  );
};

/* ── Profile Section ── */
const ProfileSection: React.FC<{
  userProfile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}> = ({ userProfile, onUpdateProfile }) => {
  const [name, setName] = React.useState(userProfile.name);
  const [position, setPosition] = React.useState(userProfile.position);
  const [company, setCompany] = React.useState(userProfile.company);
  const [saved, setSaved] = React.useState(false);

  const isDirty = name !== userProfile.name || position !== userProfile.position || company !== userProfile.company;

  const handleSave = () => {
    const updated: UserProfile = { name: name.trim(), position: position.trim(), company: company.trim() };
    localStorage.setItem('hawktrace_user_profile', JSON.stringify(updated));
    onUpdateProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="space-y-8 max-w-lg">
      <div>
        <h3 className="text-xl font-serif font-semibold text-ink mb-1">Your Profile</h3>
        <p className="text-sm text-muted font-sans">This information appears in your dashboard sidebar.</p>
      </div>

      <div className="space-y-5">
        <Field
          label="Full Name"
          required
          value={name}
          onChange={setName}
          placeholder="Jane Doe"
        />
        <Field
          label="Role / Position"
          value={position}
          onChange={setPosition}
          placeholder="e.g. CEO, Founder, QA Engineer"
        />
        <Field
          label="Company"
          value={company}
          onChange={setCompany}
          placeholder="e.g. Acme Inc."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!isDirty && !saved}
        className={`flex items-center gap-2 px-8 py-3 rounded-full font-sans font-semibold text-sm transition-all ${
          saved
            ? 'bg-green-50 border border-green-200 text-green-700'
            : isDirty
            ? 'bg-[#E5622A]/10 border border-[#E5622A]/20 text-[#E5622A] hover:bg-[#E5622A]/20 hover:-translate-y-0.5'
            : 'bg-sand/50 border border-sand text-muted cursor-not-allowed'
        }`}
      >
        {saved ? (
          <>
            <Check size={14} />
            Saved
          </>
        ) : (
          'Save changes'
        )}
      </button>
    </section>
  );
};

/* ── Workspace Section ── */
const WorkspaceSection: React.FC = () => {
  const [backendUrl, setBackendUrl] = React.useState(
    localStorage.getItem('hawktrace_backend_url') || 'http://localhost:8001'
  );
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    localStorage.setItem('hawktrace_backend_url', backendUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="space-y-8 max-w-lg">
      <div>
        <h3 className="text-xl font-serif font-semibold text-ink mb-1">Workspace</h3>
        <p className="text-sm text-muted font-sans">Configure your local HawkTrace backend connection.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-mid uppercase tracking-wider ml-1">
            Backend URL
          </label>
          <input
            type="text"
            value={backendUrl}
            onChange={e => setBackendUrl(e.target.value)}
            className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink font-mono placeholder:text-mid/40 transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
          />
          <p className="text-[11px] text-muted ml-1 mt-1 font-sans">
            Default: <span className="font-mono">http://localhost:8001</span>. Restart the app after changing.
          </p>
        </div>
      </div>

      <div className="bg-sand/40 border border-sand rounded-2xl p-5 space-y-2">
        <p className="text-[11px] font-sans font-bold text-muted uppercase tracking-widest">Connection Info</p>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-sans text-ink">Backend reachable at <span className="font-mono text-burnt">{backendUrl}</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-sm font-sans text-ink">MongoDB must be running on <span className="font-mono text-ink/60">localhost:27017</span></span>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`flex items-center gap-2 px-8 py-3 rounded-full font-sans font-semibold text-sm transition-all ${
          saved
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-[#E5622A]/10 border border-[#E5622A]/20 text-[#E5622A] hover:bg-[#E5622A]/20 hover:-translate-y-0.5'
        }`}
      >
        {saved ? <><Check size={14} /> Saved</> : 'Save URL'}
      </button>
    </section>
  );
};

/* ── Danger Zone ── */
const DangerSection: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => {
  const handleClearProfile = () => {
    onSignOut();
  };

  return (
    <section className="space-y-8 max-w-lg">
      <div>
        <h3 className="text-xl font-serif font-semibold text-ink mb-1">Danger Zone</h3>
        <p className="text-sm text-muted font-sans">These actions are irreversible. Proceed with care.</p>
      </div>

      <div className="space-y-4">
        <div className="border border-red-100 rounded-2xl p-6 flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-sans font-bold text-ink">Reset profile</p>
            <p className="text-[13px] font-sans text-muted mt-0.5">Clears your saved name, role, and company. You'll be taken back to the onboarding screen.</p>
          </div>
          <button
            onClick={handleClearProfile}
            className="shrink-0 px-5 py-2 rounded-full border border-red-200 text-red-600 text-[13px] font-sans font-semibold hover:bg-red-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
};

/* ── Shared Field ── */
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, required }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-medium text-mid uppercase tracking-wider ml-1">
      {label} {required && <span className="text-burnt">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-cream border border-sand rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-mid/40 transition-all focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/20"
    />
  </div>
);
