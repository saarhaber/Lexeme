import React from 'react';
import { sisterProjects } from '../data/siteContent';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl space-y-12 px-5 sm:px-8">
        <div className="rounded-3xl border border-secondary/20 bg-surface p-8 shadow-soft-card sm:p-12">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">About</p>
          <h2 className="mb-4 text-3xl font-heading font-bold text-text">
            A Saar Labs experiment for calm reading
          </h2>
          <p className="max-w-3xl text-lg leading-relaxed text-secondary">
            Lexeme is a Saar Labs project built to answer a simple question:{' '}
            <strong className="text-text">
              What if language learners could keep reading the stories they love — guessing words before
              being told, all on their own books?
            </strong>{' '}
            We built a calm EPUB reader with warm sepia pages, tap-to-guess vocabulary, and spaced
            repetition so the words you discover today become automatic tomorrow.
          </p>
        </div>

        <div>
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-secondary">
              More from Saar Labs
            </p>
            <h3 className="text-2xl font-heading font-bold text-text">Sister experiments you might like</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {sisterProjects.map((project) => (
              <article key={project.name} className="card flex h-full flex-col">
                <h4 className="text-xl font-heading font-semibold text-text">{project.name}</h4>
                <p className="mb-3 text-sm text-secondary">{project.tagline}</p>
                <p className="mb-4 flex-1 text-secondary">{project.description}</p>
                <div className="flex flex-wrap gap-3">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {link.label} →
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
