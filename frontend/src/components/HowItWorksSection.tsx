import React from 'react';
import { steps } from '../data/siteContent';

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="border-y border-secondary/15 bg-surface/40 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <header className="mx-auto mb-14 max-w-lg sm:mb-16">
          <p className="section-kicker mb-4">How it works</p>
          <h2 className="font-heading text-[2rem] font-bold leading-[1.12] text-text sm:text-[2.5rem]">
            Three beats. One book.
          </h2>
          <p className="mt-5 text-base leading-[1.7] text-secondary">
            No onboarding maze. Import, read, come back tomorrow.
          </p>
        </header>

        <ol className="relative mx-auto max-w-2xl list-none border-l border-secondary/20 pl-8 sm:pl-10">
          {steps.map((step, index) => (
            <li key={step.chapter} className={`relative ${index < steps.length - 1 ? 'pb-12 sm:pb-14' : ''}`}>
              <span
                className="absolute -left-[4.5px] top-2 h-2 w-2 rounded-full border border-primary/40 bg-surface ring-2 ring-surface"
                aria-hidden="true"
              />
              <p className="section-kicker text-primary/90">Chapter {step.chapter}</p>
              <h3 className="mt-1.5 font-heading text-xl font-bold text-text sm:text-2xl">{step.title}</h3>
              <p className="mt-3 max-w-md text-[0.9375rem] leading-[1.65] text-secondary">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorksSection;
