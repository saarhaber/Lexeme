import React from 'react';
import { features } from '../data/siteContent';

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Features</p>
          <h2 className="text-3xl font-heading font-bold text-gray-900 sm:text-4xl">
            Built for readers who hate interrupting the story
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            LexemeReader keeps you in the book. Look up a word, add it to your deck, and keep turning pages.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="card flex flex-col items-start text-left transition hover:-translate-y-0.5"
            >
              <span className="mb-3 text-3xl" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
