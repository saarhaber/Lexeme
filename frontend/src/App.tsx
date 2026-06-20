import React from 'react';
import SiteHeader from './components/SiteHeader';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import DictionarySection from './components/DictionarySection';
import ScreenshotsSection from './components/ScreenshotsSection';
import FaqSection from './components/FaqSection';
import AboutSection from './components/AboutSection';
import WaitlistSection from './components/WaitlistSection';
import SiteFooter from './components/SiteFooter';

function App() {
  return (
    <div id="top" className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ScreenshotsSection />
        <DictionarySection />
        <AboutSection />
        <FaqSection />
        <WaitlistSection />
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
