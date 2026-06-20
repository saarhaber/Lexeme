import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="animate-slide-up">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Calm reading for language learners
          </p>
          <h1 className="mb-5 text-4xl font-heading font-bold leading-tight text-text sm:text-5xl lg:text-[3.25rem]">
            Tap. Guess. Read your books.
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-secondary">
            The EPUB reader that makes you guess before it tells you — offline, on your own books.
            Warm sepia pages, tap-to-learn vocabulary, and spaced repetition built in.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#notify" className="btn-primary px-6 py-3 text-base">
              Join the waitlist
            </a>
            <a
              href="#how-it-works"
              className="rounded-lg border border-secondary/30 bg-surface/80 px-6 py-3 text-base font-medium text-text transition hover:border-secondary/50 hover:bg-surface"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-secondary">Coming soon to the App Store and Google Play.</p>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-fade-in lg:max-w-md" aria-hidden="true">
          <div className="rounded-[2rem] border border-secondary/20 bg-surface p-3 shadow-floating">
            <div className="rounded-[1.5rem] bg-background p-5">
              <div className="mb-4 flex items-center justify-between text-xs text-secondary">
                <span>Il nome della rosa</span>
                <span>Chapter 4</span>
              </div>
              <p className="font-heading text-sm leading-relaxed text-text">
                Adso seguiva il maestro attraverso il{' '}
                <span className="relative inline-block rounded bg-highlight px-1 font-medium text-primary">
                  labirinto
                  <span className="absolute -bottom-8 left-1/2 z-10 w-36 -translate-x-1/2 rounded-lg bg-text px-2 py-1 text-center text-[10px] font-normal text-surface shadow-lg">
                    labyrinth · noun
                  </span>
                </span>{' '}
                di passaggi e scale, osservando ogni dettaglio con attenzione.
              </p>
              <div className="mt-10 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-surface p-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-secondary">Known</p>
                  <p className="text-lg font-semibold text-green-600">842</p>
                </div>
                <div className="rounded-lg bg-surface p-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-secondary">Learning</p>
                  <p className="text-lg font-semibold text-primary">127</p>
                </div>
                <div className="rounded-lg bg-surface p-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-secondary">Due today</p>
                  <p className="text-lg font-semibold text-gold">18</p>
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
