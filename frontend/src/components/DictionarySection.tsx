import React from 'react';
import { dictionaryStats } from '../data/siteContent';

const DictionarySection: React.FC = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-10 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Offline dictionaries
            </p>
            <h2 className="mb-4 text-3xl font-heading font-bold text-gray-900">
              Hero packs hosted on lexeme.uk
            </h2>
            <p className="mb-6 text-gray-700 leading-relaxed">{dictionaryStats.description}</p>
            <dl className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/80 p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Language</dt>
                <dd className="mt-1 font-semibold text-gray-900">{dictionaryStats.language}</dd>
              </div>
              <div className="rounded-xl bg-white/80 p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Headwords</dt>
                <dd className="mt-1 font-semibold text-gray-900">{dictionaryStats.headwords}</dd>
              </div>
              <div className="rounded-xl bg-white/80 p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Pack size</dt>
                <dd className="mt-1 font-semibold text-gray-900">{dictionaryStats.size}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl bg-gray-900 p-5 font-mono text-sm text-green-400 shadow-floating">
            <p className="text-gray-400">GET /dictionaries/catalog.json</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-100">
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
