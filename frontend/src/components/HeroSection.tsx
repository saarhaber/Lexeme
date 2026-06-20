import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="animate-slide-up">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            LexemeReader for iOS & Android
          </p>
          <h1 className="mb-5 text-4xl font-heading font-bold leading-tight text-gray-900 sm:text-5xl lg:text-[3.25rem]">
            Learn vocabulary from the books you love
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-600">
            Read real literature in any language. Tap a word for instant definitions, build a personal
            lexicon, and review with spaced repetition—all without leaving the page or spoiling the plot.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#notify" className="btn-primary px-6 py-3 text-base">
              Join the waitlist
            </a>
            <a
              href="#how-it-works"
              className="rounded-lg border border-gray-300 bg-white/80 px-6 py-3 text-base font-medium text-gray-700 transition hover:border-gray-400 hover:bg-white"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-500">Coming soon to the App Store and Google Play.</p>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-fade-in lg:max-w-md" aria-hidden="true">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-3 shadow-floating">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-blue-50 via-white to-purple-50 p-5">
              <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
                <span>Il nome della rosa</span>
                <span>Chapter 4</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-800">
                Adso seguiva il maestro attraverso il{' '}
                <span className="relative inline-block rounded bg-primary/15 px-1 font-medium text-primary">
                  labirinto
                  <span className="absolute -bottom-8 left-1/2 z-10 w-36 -translate-x-1/2 rounded-lg bg-gray-900 px-2 py-1 text-center text-[10px] font-normal text-white shadow-lg">
                    labyrinth · noun
                  </span>
                </span>{' '}
                di passaggi e scale, osservando ogni dettaglio con attenzione.
              </p>
              <div className="mt-10 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-white/80 p-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Known</p>
                  <p className="text-lg font-semibold text-emerald-600">842</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Learning</p>
                  <p className="text-lg font-semibold text-primary">127</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Due today</p>
                  <p className="text-lg font-semibold text-amber-600">18</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
