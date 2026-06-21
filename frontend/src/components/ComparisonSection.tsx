import React from 'react';
import { comparisonHighlights, comparisonIntro, comparisonRows } from '../data/siteContent';

const ComparisonSection: React.FC = () => {
  return (
    <section id="compare" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            {comparisonIntro.eyebrow}
          </p>
          <h2 className="text-3xl font-heading font-bold text-text sm:text-4xl">{comparisonIntro.title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-secondary">{comparisonIntro.description}</p>
        </div>

        <div className="mb-12 overflow-x-auto rounded-3xl border border-secondary/20 bg-surface shadow-soft-card">
          <table className="min-w-[640px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-secondary/20 bg-background/60">
                <th scope="col" className="px-4 py-4 font-semibold text-text sm:px-6">
                  &nbsp;
                </th>
                <th scope="col" className="px-4 py-4 font-heading font-bold text-primary sm:px-6">
                  Lexeme
                </th>
                <th scope="col" className="px-4 py-4 font-semibold text-secondary sm:px-6">
                  LingQ
                </th>
                <th scope="col" className="px-4 py-4 font-semibold text-secondary sm:px-6">
                  Beelinguapp
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-secondary/10 last:border-b-0">
                  <th scope="row" className="px-4 py-4 font-medium text-text sm:px-6">
                    {row.label}
                  </th>
                  <td
                    className={`px-4 py-4 sm:px-6 ${
                      row.lexemeHighlight ? 'bg-highlight/40 font-medium text-text' : 'text-text'
                    }`}
                  >
                    {row.lexeme}
                  </td>
                  <td className="px-4 py-4 text-secondary sm:px-6">{row.lingq}</td>
                  <td className="px-4 py-4 text-secondary sm:px-6">{row.beelinguapp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {comparisonHighlights.map((item) => (
            <article key={item.title} className="card">
              <h3 className="mb-2 text-lg font-semibold text-text">{item.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
