import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="animate-slide-up">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Read real books in the language you are learning
          </p>
          <h1 className="mb-5 text-4xl font-heading font-bold leading-tight text-text sm:text-5xl lg:text-[3.25rem]">
            Tap. Guess. Read your books.
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-secondary">
            Lexeme is a calm EPUB reader for finishing the stories you already own — offline, in warm
            sepia, with tap-to-guess lookups when you need them. Vocabulary comes along for the ride.
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
          <p className="mt-6 text-sm text-secondary">
            Forever free · Coming soon to the App Store and Google Play
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-fade-in lg:max-w-md" aria-hidden="true">
          <div className="overflow-hidden rounded-[2rem] border border-secondary/25 bg-background shadow-floating">
            <div className="flex items-center justify-between border-b border-secondary/15 px-4 py-3">
              <span className="text-xs text-secondary">← La favorita del Mahdi</span>
              <div className="flex gap-2 text-[10px] text-secondary">
                <span>☰</span>
                <span>A</span>
                <span>⋮</span>
              </div>
            </div>
            <div className="bg-background px-5 py-4">
              <p className="font-heading text-sm leading-relaxed text-text">
                Mangiava in silenzio, senza alzare gli occhi, mentre il{' '}
                <span className="rounded bg-highlight px-1 font-medium text-primary">labirinto</span> di
                passaggi si apriva davanti a lui.
              </p>
            </div>
            <div className="mx-3 mb-3 rounded-2xl border border-secondary/15 bg-surface px-4 py-4 shadow-soft-card">
              <p className="font-heading text-base font-bold text-text">labirinto</p>
              <p className="text-xs italic text-secondary">/la.biˈrin.to/</p>
              <p className="mt-2 rounded-lg bg-background px-3 py-2 text-xs leading-relaxed text-text">
                — Il <strong className="text-primary">labirinto</strong> di corridoi era difficile da
                attraversare.
              </p>
              <p className="mt-3 text-xs font-medium text-secondary">
                What do you think &ldquo;labirinto&rdquo; means?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {['labyrinth', 'library', 'garden', 'tower'].map((option) => (
                  <div
                    key={option}
                    className="rounded-lg border border-secondary/25 bg-background px-2 py-2 text-center text-[11px] text-text"
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
