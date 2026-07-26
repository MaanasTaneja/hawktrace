import { useState, useEffect } from 'react';
import { LandingPage } from './landing-page/LandingPage';
import { SignUp } from './auth/SignUp';
import { SignIn } from './auth/SignIn';
import { Dashboard } from './dashboard/Dashboard';
import { BrowserSession } from './browser-session/BrowserSession';
import { TestSuites } from './test-suites/TestSuites';
import { Settings } from './settings/Settings';
import { About } from './about/About';
import { getToken, getStoredUser, clearAuth, setToken, setStoredUser, type StoredUser } from './api';
import type { UserProfile } from './onboarding/Onboarding';

type View = 'landing' | 'signup' | 'signin' | 'dashboard' | 'browser-session' | 'test-suites' | 'settings' | 'about';

function storedUserToProfile(user: StoredUser | null): UserProfile {
  return {
    name: user?.username ?? '',
    position: '',
    company: user?.company ?? '',
  };
}

export function App() {
  const [view, setView] = useState<View>(() => getToken() ? 'dashboard' : 'landing');
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => storedUserToProfile(getStoredUser()));

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

  const handleAuthSuccess = (user: StoredUser, token: string) => {
    setToken(token);
    setStoredUser(user);
    setUserProfile(storedUserToProfile(user));
    navigateTo('dashboard');
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleSignOut = () => {
    clearAuth();
    setUserProfile({ name: '', position: '', company: '' });
    navigateTo('landing');
  };

  if (view === 'signup') {
    return (
      <SignUp
        onSignInClick={() => navigateTo('signin')}
        onBack={() => window.history.length > 1 ? window.history.back() : navigateTo('landing')}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (view === 'signin') {
    return (
      <SignIn
        onSignUpClick={() => navigateTo('signup')}
        onBack={() => window.history.length > 1 ? window.history.back() : navigateTo('landing')}
        onSuccess={handleAuthSuccess}
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

  if (view === 'about') {
    return (
      <About
        onBack={() => navigateTo('landing')}
        onGetStarted={() => navigateTo('signup')}
      />
    );
  }

  return (
    <LandingPage
      onSignInClick={() => navigateTo('signin')}
      onGetStarted={() => navigateTo('signup')}
      onAbout={() => navigateTo('about')}
    />
  );
}
