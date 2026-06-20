import React from 'react';
import { dictionaryStats } from '../data/siteContent';

const DictionarySection: React.FC = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-10 rounded-3xl border border-secondary/20 bg-surface p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Offline dictionaries
            </p>
            <h2 className="mb-4 text-3xl font-heading font-bold text-text">
              Hero packs hosted on lexeme.uk
            </h2>
            <p className="mb-6 text-secondary leading-relaxed">{dictionaryStats.description}</p>
            <dl className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-background p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-secondary">Language</dt>
                <dd className="mt-1 font-semibold text-text">{dictionaryStats.language}</dd>
              </div>
              <div className="rounded-xl bg-background p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-secondary">Headwords</dt>
                <dd className="mt-1 font-semibold text-text">{dictionaryStats.headwords}</dd>
              </div>
              <div className="rounded-xl bg-background p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-secondary">Pack size</dt>
                <dd className="mt-1 font-semibold text-text">{dictionaryStats.size}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl bg-icon-purple-dark p-5 font-mono text-sm text-green-400 shadow-floating">
            <p className="text-secondary/70">GET /dictionaries/catalog.json</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-surface">
{`{
  "packs": [{
    "name": "ita-eng",
    "headwords": 586048,
    "download_url": "https://lexeme.uk/dictionaries/ita-eng.db"
  }]
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DictionarySection;
