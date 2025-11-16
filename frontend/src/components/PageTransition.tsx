import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location.pathname);
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered'>('entered');

  useEffect(() => {
    if (location.pathname !== displayLocation) {
      setTransitionStage('entering');
      const timer = setTimeout(() => {
        setDisplayLocation(location.pathname);
        setTransitionStage('entered');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, displayLocation]);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const transitionClasses = prefersReducedMotion
    ? 'opacity-100'
    : transitionStage === 'entering'
    ? 'opacity-0 translate-y-2'
    : 'opacity-100 translate-y-0';

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${transitionClasses}`}
      style={{
        transitionProperty: prefersReducedMotion ? 'opacity' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;

