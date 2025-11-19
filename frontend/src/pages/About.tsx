import React from 'react';

type ProjectLink = {
  label: string;
  href: string;
};

type SaarLabsProject = {
  name: string;
  summary: string;
  points: string[];
  links: ProjectLink[];
};

const SaarLabsProjects: SaarLabsProject[] = [
  {
    name: 'Shablam!',
    summary: 'Music recognition for RuPaul\'s Drag Race lip-syncs with official episode context.',
    points: [
      'Identify any Drag Race lip-sync song, past or present.',
      'See who won, lost, or sashayed away plus the season, episode, and franchise.',
      'Follow Spotify links supplied in the app listing to keep listening.',
    ],
    links: [
      { label: 'Website', href: 'https://shablam.app' },
      { label: 'Android', href: 'https://play.google.com/store/apps/details?id=com.saarlabs.shablam' },
      { label: 'iOS', href: 'https://apps.apple.com/us/app/shablam/id6738062833' },
    ],
  },
  {
    name: 'Eurovizam',
    summary: 'Eurovision song recognition paired with a contest-wide archive.',
    points: [
      'Identify Eurovision entries or search the archive by song, artist, year, or country.',
      'Review placement details, running order, participating countries, and voting information.',
      'Open official performance videos, read lyrics, stream on Apple Music, or try a random entry.',
    ],
    links: [
      { label: 'Android', href: 'https://play.google.com/store/apps/details?id=com.saarlabs.eurovizam' },
      { label: 'iOS', href: 'https://apps.apple.com/us/app/eurovizam/id6748100663' },
    ],
  },
];

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="bg-white shadow rounded-xl p-8">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-2">About Lexeme</p>
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">Lexeme by Saar Labs</h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Lexeme is a Saar Labs project for language learners who want to stay immersed in full-length books. Upload a PDF,
          EPUB, DOCX, or text file and Lexeme extracts lemmas, frequency lists, and context sentences so you can study
          vocabulary without leaving the narrative.
        </p>
      </header>

      <section className="bg-blue-50 border border-blue-100 rounded-xl p-8 space-y-6">
        <h2 className="text-2xl font-heading font-semibold text-gray-900">What Lexeme is for</h2>
        <ul className="space-y-4 text-gray-700">
          <li>
            <span className="font-semibold text-primary">Context-aware cards:</span> Reviews link directly to the line you
            highlighted in the reader so every prompt keeps story context intact.
          </li>
          <li>
            <span className="font-semibold text-primary">Automated prep:</span> The pipeline tokenizes uploads, builds lemma
            lists, and flags phrases that need practice so you do not have to maintain spreadsheets.
          </li>
          <li>
            <span className="font-semibold text-primary">Retention you can tune:</span> FSRS-powered review sessions keep new
            words in rotation while avoiding spoilers or repetitive drills.
          </li>
        </ul>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-8 space-y-4">
        <h2 className="text-2xl font-heading font-semibold text-gray-900">Saar Labs</h2>
        <p className="text-gray-700 leading-relaxed">
          Saar Labs builds Lexeme along with music-recognition tools such as Shablam! and Eurovizam. Each project helps fans
          identify what they are hearing and surface the surrounding context in a couple of taps.
        </p>
        <a
          href="https://saarlabs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary font-semibold hover:underline"
        >
          Visit saarlabs.com {'->'}
        </a>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-gray-500 font-semibold mb-2">More from Saar Labs</p>
          <h2 className="text-2xl font-heading font-semibold text-gray-900">Related projects</h2>
          <p className="text-gray-700">
            The links below point directly to the official store listings for Saar Labs audio-recognition apps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SaarLabsProjects.map((project) => (
            <article key={project.name} className="border border-gray-200 rounded-lg p-6 h-full flex flex-col space-y-4">
              <div>
                <h3 className="text-xl font-heading font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.summary}</p>
              </div>
              <ul className="list-disc pl-4 text-gray-700 space-y-2 flex-1">
                {project.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
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
