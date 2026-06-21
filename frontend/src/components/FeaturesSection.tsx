import React from 'react';
import FeatureMark from './brand/FeatureMark';
import { features } from '../data/siteContent';

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:items-start">
          <header className="lg:sticky lg:top-28">
            <p className="section-kicker mb-5">What Lexeme does</p>
            <h2 className="text-[2rem] font-heading font-bold leading-[1.12] text-text sm:text-[2.75rem]">
              A reader,
              <br />
              not a course.
            </h2>
            <div className="mt-8 max-w-sm">
              <p className="text-base leading-[1.7] text-secondary">
                Most language apps start with drills. Lexeme starts with the book you chose — and stays
                there until you finish it.
              </p>
              <div className="mt-8 h-px w-16 bg-primary/60" aria-hidden="true" />
            </div>
          </header>

          <ol className="relative list-none space-y-0">
            {features.map((feature) => (
              <li
                key={feature.id}
                className="group relative border-t border-secondary/20 py-9 first:border-t-0 first:pt-0 last:pb-0"
              >
                <div className="flex gap-5 sm:gap-7">
                  <div className="flex w-10 shrink-0 flex-col items-center pt-0.5 sm:w-12">
                    <FeatureMark id={feature.id} />
                    <span className="section-kicker mt-3 text-[0.7rem] text-primary/80">{feature.index}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xl font-bold leading-snug text-text sm:text-2xl">
                      {feature.title}
                    </h3>
                    <p className="mt-3 max-w-md text-[0.9375rem] leading-[1.65] text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
