import React, { useState } from 'react';
import { faqs } from '../data/siteContent';

const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="text-3xl font-heading font-bold text-text">Common questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question} className="rounded-2xl border border-secondary/20 bg-surface shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-semibold text-text">{item.question}</span>
                  <span className="text-primary text-xl leading-none" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-secondary/10 px-5 pb-4 pt-3 text-secondary leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
