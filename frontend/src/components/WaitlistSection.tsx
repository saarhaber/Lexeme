import React, { useState } from 'react';

const WaitlistSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    window.location.href = `mailto:hello@lexeme.uk?subject=Lexeme%20waitlist&body=Please%20notify%20me%20when%20Lexeme%20launches.%0A%0AEmail%3A%20${encodeURIComponent(email.trim())}`;
    setSubmitted(true);
  };

  return (
    <section id="notify" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Early access</p>
        <h2 className="mb-4 text-3xl font-heading font-bold text-text sm:text-4xl">
          Be first to read your books with Lexeme
        </h2>
        <p className="mb-8 text-lg text-secondary">
          Lexeme is in active development — a forever-free EPUB reader for language learners. Leave your
          email and we will let you know when the app is ready.
        </p>
        {submitted ? (
          <p
            className="rounded-xl border border-primary/30 bg-highlight/30 px-6 py-4 text-text"
            role="status"
          >
            Thanks! Your email client should open so you can send your request.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-secondary/30 bg-surface px-4 py-3 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="submit" className="btn-primary px-6 py-3 whitespace-nowrap">
              Notify me
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default WaitlistSection;
