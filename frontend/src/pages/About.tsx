import React from 'react';

const SaarLabsProjects = [
    {
      name: 'Shablam',
      tagline: '"Shazam for Drag Race" runway anthems',
      description:
        "Tap to identify any RuPaul's Drag Race runway track and dive into performance lore within seconds.",
    links: [
      { label: 'shablam.app', href: 'https://shablam.app' },
      { label: 'Android app', href: 'https://play.google.com/store/apps/details?id=com.saarlabs.shablam' },
    ],
  },
  {
    name: 'Eurovizam',
    tagline: '"Shazam for Eurovision" performances',
    description:
      'Recognize Eurovision entries on the spot, browse a contest-long archive, and surface trivia, standings, and lyric context for every act.',
    links: [
      { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=com.saarlabs.eurovizam' },
    ],
  },
];

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="bg-white shadow rounded-xl p-8">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-2">About Lexeme</p>
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">A Saar Labs experiment for deep reading</h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Lexeme is a Saar Labs project built to answer a simple question: <strong>What if language learners could keep
          reading the stories they love without pausing to study elsewhere?</strong> We transform any book you upload
          into a living vocabulary map, generate just-in-time glossaries, and feed everything into spaced repetition so
          the words you discover today become automatic tomorrow.
        </p>
      </header>

      <section className="bg-blue-50 border border-blue-100 rounded-xl p-8 space-y-6">
        <h2 className="text-2xl font-heading font-semibold text-gray-900">What it's for</h2>
        <ul className="space-y-4 text-gray-700">
          <li>
            <span className="font-semibold text-primary">Context-aware study:</span> Every vocabulary card is tied back
            to your original sentence, so you remember the moment that made the word matter.
          </li>
          <li>
            <span className="font-semibold text-primary">Hands-off extraction:</span> Upload a PDF, EPUB, or DOCX and let
            our NLP pipeline build lemma lists, difficulty curves, and personalized drills automatically.
          </li>
          <li>
            <span className="font-semibold text-primary">Review that respects narrative:</span> Our FSRS-powered review
            sessions ensure fluency without spoiling plot twists or flooding you with flashcards you don't need.
          </li>
        </ul>
      </section>

        <section className="bg-white border border-gray-200 rounded-xl p-8 space-y-4">
          <h2 className="text-2xl font-heading font-semibold text-gray-900">Built by Saar Labs</h2>
          <p className="text-gray-700 leading-relaxed">
            Saar Labs is a tiny applied research studio exploring fan-first music and media tools. Each prototype obsessively
            focuses on a niche community--then pushes on multimodal AI, recognition tech, and creative tooling to make that
            audience feel seen. Lexeme extends that same philosophy to readers chasing fluency through full-length books.
          </p>
        </section>

      <section className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-gray-500 font-semibold mb-2">More from Saar Labs</p>
          <h2 className="text-2xl font-heading font-semibold text-gray-900">Sister experiments you might like</h2>
          <p className="text-gray-700">
            Lexeme sits alongside other playful "Shazam-for-X" projects that help superfans connect instantly with the
            performances they care about.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SaarLabsProjects.map((project) => (
            <article key={project.name} className="border border-gray-200 rounded-lg p-6 h-full flex flex-col">
              <h3 className="text-xl font-heading font-semibold text-gray-900">{project.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{project.tagline}</p>
              <p className="text-gray-700 flex-1">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {project.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold hover:underline text-sm"
                  >
                    {link.label} {'->'}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default About;
