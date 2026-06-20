import React from 'react';
import { screenshots } from '../data/siteContent';
import ScreenshotFrame from './ScreenshotFrame';

const phoneScreens = screenshots.filter((s) => s.device === 'phone');
const tabletScreens = screenshots.filter((s) => s.device === 'tablet');

const ScreenshotsSection: React.FC = () => {
  return (
    <section id="screenshots" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">App preview</p>
          <h2 className="text-3xl font-heading font-bold text-text sm:text-4xl">
            See Lexeme in action
          </h2>
          <p className="mt-4 text-lg text-secondary">
            Reading, lookup, and review — designed for phones and tablets.
          </p>
        </div>

        <div className="mb-16 grid gap-10 sm:grid-cols-3">
          {phoneScreens.map((screen) => (
            <ScreenshotFrame
              key={screen.id}
              title={screen.title}
              description={screen.description}
              alt={screen.alt}
              variant="phone"
              imageSrc={`/screenshots/phone/${screen.id}.png`}
            />
          ))}
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          {tabletScreens.map((screen) => (
            <ScreenshotFrame
              key={screen.id}
              title={screen.title}
              description={screen.description}
              alt={screen.alt}
              variant="tablet"
              imageSrc={`/screenshots/tablet/${screen.id}.png`}
            />
          ))}
          <div className="space-y-4">
            <h3 className="text-2xl font-heading font-bold text-text">Built for deep reading</h3>
            <p className="leading-relaxed text-secondary">
              On tablet, Lexeme gives you more room for long-form reading sessions, side-by-side
              vocabulary lists, and comfortable study review — without losing the tap-to-learn flow that
              keeps you in the story.
            </p>
            <ul className="space-y-2 text-sm text-secondary">
              <li>• Import EPUB from Files or cloud storage</li>
              <li>• Offline hero dictionaries downloaded from lexeme.uk</li>
              <li>• Review sessions sync across your devices</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScreenshotsSection;
