import React from 'react';

const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white/70 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-gray-500 sm:flex-row sm:px-8">
        <p>© {year} Saar Labs. LexemeReader and lexeme.uk.</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#features" className="transition hover:text-primary">
            Features
          </a>
          <a href="#faq" className="transition hover:text-primary">
            FAQ
          </a>
          <a href="#screenshots" className="transition hover:text-primary">
            Screenshots
          </a>
          <a
            href="https://lexeme.uk/dictionaries/catalog.json"
            className="transition hover:text-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dictionary catalog
          </a>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
