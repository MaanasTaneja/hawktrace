import React from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/HawkTrace-Logo.png';
import { LogOut, Plus, User, Settings as SettingsIcon, Search, ChevronDown } from 'lucide-react';
import { FlowCard } from './components/FlowCard.tsx';
import { RecentTestRuns, type Flow } from './components/RecentTestRuns.tsx';
import { RefinedStatCard } from './components/RefinedStatCard.tsx';
import type { UserProfile } from '../onboarding/Onboarding.tsx';

import { BACKEND, authFetch } from '../api';

interface DashboardProps {
  onSignOut: () => void;
  onRecordFlow: () => void;
  onViewTests: (flowId?: string) => void;
  onOpenSettings: () => void;
  userProfile: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSignOut, onRecordFlow, onViewTests, onOpenSettings, userProfile }) => {
  const [activeSection, setActiveSection] = React.useState('dashboard');
  const [flows, setFlows] = React.useState<Flow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!filterDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterDropdownOpen]);
  const pillRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  React.useEffect(() => {
    authFetch(`${BACKEND}/flows/all`)
      .then(r => r.json())
      .then(data => setFlows(Array.isArray(data) ? data : []))
      .catch(() => setFlows([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      const sections = ['dashboard', 'flows', 'test-runs'];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
          }
        }
      }

      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        setActiveSection('test-runs');
      }

      if (window.scrollY < 100) {
        setActiveSection('dashboard');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 80, behavior: 'smooth' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const totalFlows = flows.length;
  const agentsPassed = flows.filter(f => f.last_run_status === 'passed').length;
  const agentsFailed = flows.filter(f => f.last_run_status === 'failed').length;
  const pendingFlows = flows.filter(f => !f.has_tests).length;

  const filteredFlows = flows.filter(f => {
    const matchesSearch = !search || (f.name ?? f.flow_id).toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'passing') return f.last_run_status === 'passed';
    if (statusFilter === 'failing') return f.last_run_status === 'failed';
    if (statusFilter === 'ready') return f.has_tests && f.last_run_status == null;
    if (statusFilter === 'pending') return !f.has_tests;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F4F1] font-sans selection:bg-burnt/10">
      {/* Grain overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '220px 220px',
        }}
      />

      {/* Top navbar — same pill style as landing page */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50 flex justify-center pt-5 px-4 md:px-6"
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
          {/* Left: logo */}
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="HawkTrace" className="h-6 w-6 object-contain" />
            <span className="font-serif text-[1.1rem] font-bold tracking-tight text-ink">HawkTrace</span>
          </div>

          {/* Center: nav links — desktop only */}
          <div className="hidden md:flex items-center gap-8 text-[13px] text-mid font-sans font-medium">
            {[
              { label: 'Dashboard', id: 'dashboard' },
              { label: 'Flows', id: 'flows' },
              { label: 'Test Runs', id: 'test-runs' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="relative group transition-colors duration-200 hover:text-ink"
                style={{ color: activeSection === id ? '#141211' : undefined }}
              >
                {label}
                {activeSection === id && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-px left-0 w-full h-px bg-burnt"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Right: record flow — desktop only */}
          <button
            onClick={onRecordFlow}
            className="hidden md:block text-[13px] font-medium px-5 py-2 rounded-full active:scale-95 transition-all duration-200"
            style={{
              background: 'rgba(229,98,42,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(229,98,42,0.45)',
              color: '#E5622A',
            }}
          >
            Record Flow
          </button>
        </nav>
      </motion.div>

      {/* Main Content */}
      <main className="px-4 md:px-14 pt-28 pb-16 relative z-10 max-w-[1400px] mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-14"
        >
          {/* Header & Stats */}
          <div id="dashboard" className="space-y-10 scroll-mt-16">
            <motion.header variants={itemVariants} className="flex items-end pt-2">
              <div className="space-y-1.5">
                <h2 className="text-2xl md:text-4xl font-serif font-bold text-ink tracking-tight">Dashboard</h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono text-mid">{today}</p>
                  {!loading && pendingFlows > 0 && (
                    <>
                      <div className="h-3 w-px" style={{ background: 'rgba(229,98,42,0.2)' }} />
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[11px] font-mono text-mid">
                          {pendingFlows} flow{pendingFlows !== 1 ? 's' : ''} pending
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.header>

            <motion.section variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <RefinedStatCard
                label="Flows Recorded"
                value={loading ? '—' : String(totalFlows)}
                trend={totalFlows > 0 ? `+${totalFlows}` : '0'}
                isPositive={true}
              />
              <RefinedStatCard
                label="Agents Passed"
                value={loading ? '—' : String(agentsPassed)}
                trend={totalFlows > 0 ? `${Math.round((agentsPassed / totalFlows) * 100)}%` : '0%'}
                isPositive={true}
              />
              <RefinedStatCard
                label="Agents Failed"
                value={loading ? '—' : String(agentsFailed)}
                trend={totalFlows > 0 ? `${Math.round((agentsFailed / totalFlows) * 100)}%` : '0%'}
                isPositive={agentsFailed === 0}
              />
            </motion.section>
          </div>

          {/* Recorded Flows */}
          <motion.section id="flows" variants={itemVariants} className="scroll-mt-16">
            <div className="mb-6 pb-4 space-y-4" style={{ borderBottom: '1px solid rgba(229,98,42,0.15)' }}>
              <h3 className="text-2xl font-serif font-semibold text-ink">Recorded Flows</h3>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search flows…"
                    className="w-full pl-8 pr-4 py-2 text-[13px] font-sans text-ink rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-burnt/30 transition-all"
                    style={{ border: '1px solid rgba(229,98,42,0.2)' }}
                  />
                </div>
                {/* Status dropdown */}
                <div ref={filterRef} className="relative ml-auto">
                  <button
                    onClick={() => setFilterDropdownOpen(o => !o)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-sans font-medium transition-all"
                    style={{
                      background: 'white',
                      border: '1px solid rgba(229,98,42,0.2)',
                      color: statusFilter === 'all' ? '#8C7B6B' : '#E5622A',
                    }}
                  >
                    {statusFilter === 'all' ? 'All Flows' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    <ChevronDown size={13} className={`transition-transform duration-200 ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {filterDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-44 rounded-2xl overflow-hidden z-20 py-1"
                      style={{
                        background: 'rgba(245,244,241,0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(226,223,216,0.8)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      {[
                        { value: 'all', label: 'All Flows' },
                        { value: 'passing', label: 'Passing' },
                        { value: 'failing', label: 'Failing' },
                        { value: 'ready', label: 'Ready' },
                        { value: 'pending', label: 'Pending' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setStatusFilter(opt.value); setFilterDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-sans transition-colors hover:bg-sand/40"
                          style={{ color: statusFilter === opt.value ? '#E5622A' : '#4A3F35', fontWeight: statusFilter === opt.value ? 600 : 400 }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[0, 1].map(i => (
                  <div key={i} className="rounded-2xl p-8 h-52 animate-pulse" style={{ border: '1px solid rgba(229,98,42,0.15)', background: 'rgba(229,98,42,0.03)' }} />
                ))}
              </div>
            ) : flows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <p className="font-mono text-sm text-mid">No flows recorded yet.</p>
                <button
                  onClick={onRecordFlow}
                  className="hidden md:flex items-center gap-2 text-[13px] font-medium px-6 py-2.5 rounded-full active:scale-95 transition-all"
                  style={{
                    background: 'rgba(229,98,42,0.12)',
                    border: '1px solid rgba(229,98,42,0.35)',
                    color: '#E5622A',
                  }}
                >
                  <Plus size={16} />
                  Record Your First Flow
                </button>
              </div>
            ) : filteredFlows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="font-mono text-sm text-mid">No flows match your filters.</p>
              </div>
            ) : (
              <div
                className="overflow-y-auto flows-scroll"
                style={{
                  maxHeight: '540px',
                  paddingTop: '4px',
                  paddingBottom: '2px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(229,98,42,0.25) transparent',
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredFlows.map(flow => (
                    <FlowCard
                      key={flow.flow_id}
                      flowId={flow.flow_id}
                      name={flow.name}
                      startedAt={flow.started_at}
                      eventCount={flow.event_count}
                      frameCount={flow.frame_count}
                      hasTests={flow.has_tests}
                      agentActive={flow.agent_active ?? true}
                      lastRunStatus={flow.last_run_status}
                      onRecordFlow={onRecordFlow}
                      onViewTests={onViewTests}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: 'rgba(229,98,42,0.15)' }} />

          {/* All Flows Table */}
          <motion.section id="test-runs" variants={itemVariants} className="scroll-mt-16">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-serif font-semibold text-ink">All Flows</h3>
            </div>
            <RecentTestRuns flows={filteredFlows} onViewTests={onViewTests} />
          </motion.section>
        </motion.div>
      </main>

      {/* Bottom-right user pill */}
      <div ref={pillRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Expanded panel */}
        <motion.div
          initial={false}
          animate={userMenuOpen ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: 8, pointerEvents: 'none' }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-5 w-64"
          style={{
            background: 'rgba(245,244,241,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(226,223,216,0.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          {/* User info */}
          <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(229,98,42,0.12)' }}>
            <p className="font-serif text-[1rem] font-semibold text-ink">{userProfile.name}</p>
            {userProfile.position && (
              <p className="font-mono text-[11px] text-mid mt-0.5">{userProfile.position}</p>
            )}
            {userProfile.company && (
              <p className="font-mono text-[11px] text-mid">{userProfile.company}</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => { onOpenSettings(); setUserMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium text-mid hover:text-ink hover:bg-sand/40 transition-all duration-150"
            >
              <SettingsIcon size={14} />
              Settings
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium text-mid hover:text-burnt hover:bg-sand/40 transition-all duration-150"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* Pill trigger */}
        <button
          onClick={() => setUserMenuOpen(o => !o)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full transition-all duration-200 active:scale-95"
          style={{
            background: 'rgba(245,244,241,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(226,223,216,0.8)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(229,98,42,0.12)', border: '1px solid rgba(229,98,42,0.3)' }}
          >
            <User size={11} className="text-burnt" />
          </div>
          <span className="text-[13px] font-medium text-ink">{userProfile.name}</span>
        </button>
      </div>
    </div>
  );
};

