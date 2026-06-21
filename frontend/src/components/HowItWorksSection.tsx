import React from 'react';
import { steps } from '../data/siteContent';

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="rounded-3xl border border-secondary/20 bg-surface/80 p-8 shadow-soft-card sm:p-12">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="text-3xl font-heading font-bold text-text sm:text-4xl">
              From first page to last chapter
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-secondary">
              No lesson plans — just the book you chose, a calm reader, and help when you need a word.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-xl font-bold text-primary">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text">{step.title}</h3>
                <p className="text-sm leading-relaxed text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
