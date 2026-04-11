import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
// import { Ticker } from './components/Ticker';
// import { Metrics } from './components/Metrics';
import { DarkShowcase } from './components/DarkShowcase';
import { Features } from './components/Features';
// import { Quote } from './components/Quote';
// import { Pricing } from './components/Pricing';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

interface LandingPageProps {
  onSignInClick: () => void;
  onGetStarted: () => void;
}

export function LandingPage({ onSignInClick, onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      <Navbar onSignInClick={onSignInClick} onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      {/* <Ticker /> */}
      {/* <Metrics /> */}
      <DarkShowcase />
      <Features />
      {/* <Quote /> */}
      {/* <Pricing /> */}
      <CTA onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
