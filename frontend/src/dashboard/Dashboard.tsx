import React from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/HawkTrace-Logo.png';
import {
  LayoutDashboard,
  Video,
  PlayCircle,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  User,
} from 'lucide-react';
import { FlowCard } from './components/FlowCard.tsx';
import { RecentTestRuns, type Flow } from './components/RecentTestRuns.tsx';
import { RefinedStatCard } from './components/RefinedStatCard.tsx';
import type { UserProfile } from '../onboarding/Onboarding.tsx';

const BACKEND = 'http://localhost:8001';

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

  React.useEffect(() => {
    fetch(`${BACKEND}/flows/`)
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

  // Computed stats
  const totalFlows = flows.length;
  const testsGenerated = flows.filter(f => f.has_tests).length;
  const totalEvents = flows.reduce((sum, f) => sum + f.event_count, 0);
  const pendingFlows = flows.filter(f => !f.has_tests).length;

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] font-sans selection:bg-burnt/10 underline-offset-4">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-[#F0EDE8] flex flex-col fixed h-screen z-20">
        <div className="p-10 pb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <img src={logo} alt="HawkTrace" className="h-16 w-16 object-contain" />
            <h1 className="text-3xl font-serif font-black text-ink tracking-tight">HawkTrace</h1>
          </motion.div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={activeSection === 'dashboard'}
            onClick={() => scrollToSection('dashboard')}
          />
          <NavItem
            icon={<Video size={18} />}
            label="Flows"
            active={activeSection === 'flows'}
            onClick={() => scrollToSection('flows')}
          />
          <NavItem
            icon={<PlayCircle size={18} />}
            label="Test Runs"
            active={activeSection === 'test-runs'}
            onClick={() => scrollToSection('test-runs')}
          />
          <NavItem
            icon={<SettingsIcon size={18} />}
            label="Settings"
            active={false}
            onClick={onOpenSettings}
          />
        </nav>

        <div className="p-8 border-t border-[#F0EDE8]">
          <div className="flex items-center gap-4 mb-6 group cursor-pointer p-2 rounded-xl hover:bg-[#FAF9F6] transition-all">
            <div className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center border border-[#F0EDE8] group-hover:border-burnt/30 transition-colors relative overflow-hidden">
              <User size={24} className="text-[#6B6560]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate">{userProfile.name}</p>
              <p className="text-[11px] font-mono font-black text-[#6B6560] uppercase tracking-tighter truncate">
                {[userProfile.position, userProfile.company].filter(Boolean).join(' @ ') || 'HawkTrace'}
              </p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-xs font-black text-[#6B6560]/60 hover:text-burnt uppercase tracking-[0.2em] transition-all w-full pl-2"
          >
            <LogOut size={14} strokeWidth={2.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[280px] p-16 relative z-10 max-w-[1400px]">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-16"
        >
          {/* Section 1 & 2: Header & Stats */}
          <div id="dashboard" className="space-y-16 scroll-mt-16">
            <motion.header
              variants={itemVariants}
              className="flex justify-between items-end pt-4"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-serif font-bold text-ink tracking-tight">Dashboard</h2>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-sans font-medium text-[#6B6560]">{today}</p>
                  {!loading && pendingFlows > 0 && (
                    <>
                      <div className="h-3 w-px bg-[#F0EDE8]" />
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[11px] font-mono font-bold text-ink uppercase tracking-widest">
                          {pendingFlows} flow{pendingFlows !== 1 ? 's' : ''} pending
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={onRecordFlow}
                className="bg-burnt/10 backdrop-blur-md border border-burnt/20 text-burnt px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:bg-burnt/20 shadow-lg shadow-burnt/5"
              >
                <Plus size={18} strokeWidth={3} />
                Record Flow
              </button>
            </motion.header>

            <motion.section variants={itemVariants} className="grid grid-cols-3 gap-8">
              <RefinedStatCard
                label="Flows Recorded"
                value={loading ? '—' : String(totalFlows)}
                trend={totalFlows > 0 ? `+${totalFlows}` : '0'}
                isPositive={true}
              />
              <RefinedStatCard
                label="Tests Generated"
                value={loading ? '—' : String(testsGenerated)}
                trend={totalFlows > 0 ? `${Math.round((testsGenerated / totalFlows) * 100)}%` : '0%'}
                isPositive={true}
              />
              <RefinedStatCard
                label="Total Events"
                value={loading ? '—' : String(totalEvents)}
                trend={totalFlows > 0 ? `avg ${Math.round(totalEvents / totalFlows)}` : '0'}
                isPositive={true}
              />
            </motion.section>
          </div>

          {/* Section 3: Recorded Flows */}
          <motion.section
            id="flows"
            variants={itemVariants}
            className="pt-8 scroll-mt-16"
          >
            <div className="flex items-center justify-between mb-10 border-b border-[#F0EDE8] pb-4">
              <h3 className="text-3xl font-serif font-semibold text-ink">Recorded Flows</h3>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-8">
                {[0, 1].map(i => (
                  <div key={i} className="bg-white border border-sand rounded-[2rem] p-8 h-56 animate-pulse" />
                ))}
              </div>
            ) : flows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-muted text-sm font-sans opacity-60">No flows recorded yet.</p>
                <button
                  onClick={onRecordFlow}
                  className="bg-burnt/10 backdrop-blur-md border border-burnt/20 text-burnt px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:bg-burnt/20 shadow-lg shadow-burnt/5 text-sm uppercase tracking-widest"
                >
                  <Plus size={16} strokeWidth={3} />
                  Record Your First Flow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8">
                {flows.slice(0, 6).map(flow => (
                  <FlowCard
                    key={flow.flow_id}
                    flowId={flow.flow_id}
                    name={flow.name}
                    startedAt={flow.started_at}
                    eventCount={flow.event_count}
                    frameCount={flow.frame_count}
                    hasTests={flow.has_tests}
                    onRecordFlow={onRecordFlow}
                    onViewTests={onViewTests}
                  />
                ))}
              </div>
            )}
          </motion.section>

          {/* Divider */}
          <div className="h-px bg-[#F0EDE8] w-full" />

          {/* Section 4: All Flows Table */}
          <motion.section
            id="test-runs"
            variants={itemVariants}
            className="pt-8 scroll-mt-16"
          >
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-serif font-black text-ink">All Flows</h3>
              <button
                onClick={onViewTests}
                className="text-xs font-sans font-black text-[#E5622A] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
              >
                View Test Suites
              </button>
            </div>
            <RecentTestRuns flows={flows} onViewTests={onViewTests} />
          </motion.section>

        </motion.div>
      </main>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-4 px-6 py-4 rounded-xl transition-all relative group w-full text-left
        ${active ? 'text-ink font-bold' : 'text-muted hover:text-ink'}
      `}
    >
      <span className={`transition-colors duration-300 ${active ? 'text-[#E5622A]' : 'text-[#6B6560] group-hover:text-[#E5622A]'}`}>
        {icon}
      </span>
      <span className="text-sm tracking-tight">{label}</span>
      {active && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 w-1 h-6 bg-[#E5622A] rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
};
