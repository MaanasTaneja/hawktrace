import { useState, useEffect } from 'react';
import { LandingPage } from './landing-page/LandingPage';
import { SignUp } from './auth/SignUp';
import { SignIn } from './auth/SignIn';
import { Onboarding, type UserProfile } from './onboarding/Onboarding';
import { Dashboard } from './dashboard/Dashboard';
import { BrowserSession } from './browser-session/BrowserSession';
import { TestSuites } from './test-suites/TestSuites';
import { Settings } from './settings/Settings';

type View = 'landing' | 'signup' | 'signin' | 'onboarding' | 'dashboard' | 'browser-session' | 'test-suites' | 'settings';

const PROFILE_KEY = 'hawktrace_user_profile';

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function App() {
  const [view, setView] = useState<View>(() => {
    const profile = loadProfile();
    return profile ? 'dashboard' : 'landing';
  });
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(
    () => loadProfile() ?? { name: '', position: '', company: '' }
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setView(event.state.view);
        setSelectedFlowId(event.state.flowId ?? null);
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    if (!window.history.state) {
      window.history.replaceState({ view }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView: View, opts: { flowId?: string; push?: boolean } = {}) => {
    const { flowId = null, push = true } = opts;
    setView(newView);
    setSelectedFlowId(flowId);
    window.scrollTo(0, 0);
    if (push) window.history.pushState({ view: newView, flowId }, '');
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    navigateTo('dashboard');
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleSignOut = () => {
    localStorage.removeItem(PROFILE_KEY);
    setUserProfile({ name: '', position: '', company: '' });
    navigateTo('landing');
  };

  if (view === 'signup') {
    return (
      <SignUp
        onSignInClick={() => navigateTo('signin')}
        onBack={() => window.history.length > 1 ? window.history.back() : navigateTo('landing')}
      />
    );
  }

  if (view === 'signin') {
    return (
      <SignIn
        onSignUpClick={() => navigateTo('signup')}
        onBack={() => window.history.length > 1 ? window.history.back() : navigateTo('landing')}
      />
    );
  }

  if (view === 'onboarding') {
    return (
      <Onboarding
        onComplete={handleOnboardingComplete}
        onBack={() => navigateTo('landing')}
      />
    );
  }

  if (view === 'dashboard') {
    return (
      <Dashboard
        userProfile={userProfile}
        onSignOut={handleSignOut}
        onRecordFlow={() => navigateTo('browser-session')}
        onViewTests={(flowId) => navigateTo('test-suites', { flowId })}
        onOpenSettings={() => navigateTo('settings')}
      />
    );
  }

  if (view === 'settings') {
    return (
      <Settings
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onBack={() => navigateTo('dashboard')}
        onSignOut={handleSignOut}
      />
    );
  }

  if (view === 'browser-session') {
    return (
      <BrowserSession
        onBack={() => navigateTo('dashboard')}
        onViewTests={(flowId) => navigateTo('test-suites', { flowId })}
      />
    );
  }

  if (view === 'test-suites') {
    return (
      <TestSuites
        onBack={() => window.history.back()}
        initialFlowId={selectedFlowId}
      />
    );
  }

  return (
    <LandingPage
      onSignInClick={() => navigateTo('signin')}
      onGetStarted={() => navigateTo('onboarding')}
    />
  );
}
