export const features = [
  {
    title: 'Bring your own books',
    description: 'Import EPUBs from your library and read offline — no store, no subscriptions, just your books.',
    icon: '📖',
  },
  {
    title: 'Guess before you know',
    description: 'Tap a word and try to recall it before the translation appears. Active recall, built into every page.',
    icon: '👆',
  },
  {
    title: 'Calm sepia reading',
    description: 'Warm paper tones designed for long, comfortable reading sessions — the default experience is sepia.',
    icon: '☕',
  },
  {
    title: 'Spaced repetition',
    description: 'Words you discover while reading feed into review sessions so vocabulary sticks without extra effort.',
    icon: '🎯',
  },
];

export const steps = [
  {
    number: '1',
    title: 'Import a book',
    description: 'Add an EPUB from your library and open it in Lexeme — offline, on your own device.',
  },
  {
    number: '2',
    title: 'Tap. Guess. Learn.',
    description: 'Tap any word, guess the meaning, then see the definition in context — no tab switching.',
  },
  {
    number: '3',
    title: 'Review & remember',
    description: 'Short study sessions reinforce the words you discovered while reading.',
  },
];

export const sisterProjects = [
  {
    name: 'Shablam',
    tagline: '"Shazam for Drag Race" runway anthems',
    description:
      'Identify any RuPaul\'s Drag Race lip-sync track and dive into performance lore within seconds.',
    links: [
      { label: 'shablam.app', href: 'https://shablam.app' },
      {
        label: 'Android app',
        href: 'https://play.google.com/store/apps/details?id=com.saarlabs.shablam',
      },
    ],
  },
  {
    name: 'Eurovizam',
    tagline: '"Shazam for Eurovision" performances',
    description:
      'Recognize Eurovision entries on the spot and surface trivia, standings, and lyric context.',
    links: [
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.saarlabs.eurovizam',
      },
    ],
  },
];

export const dictionaryStats = {
  language: 'Italian',
  headwords: '586,000+',
  size: '153 MB',
  description:
    'Lexeme downloads hero dictionary packs from lexeme.uk — no GitHub auth, no private-repo friction.',
};

export const screenshots = [
  {
    id: 'reading',
    title: 'Read in context',
    description: 'Tap any word while reading to see definitions without leaving the page.',
    device: 'phone' as const,
    alt: 'Lexeme reading view on Android phone',
  },
  {
    id: 'lookup',
    title: 'Rich word cards',
    description: 'Bilingual definitions, grammar cues, and pronunciation in one sheet.',
    device: 'phone' as const,
    alt: 'Lexeme word lookup on Android phone',
  },
  {
    id: 'study',
    title: 'Swipe to review',
    description: 'Short study sessions reinforce words you discovered while reading.',
    device: 'phone' as const,
    alt: 'Lexeme study session on Android phone',
  },
  {
    id: 'library-tablet',
    title: 'Your library, any screen',
    description: 'Import EPUBs, track progress, and pick up where you left off.',
    device: 'tablet' as const,
    alt: 'Lexeme library on iPad',
  },
];

export const faqs = [
  {
    question: 'What is Lexeme?',
    answer:
      'Lexeme is a calm EPUB reader for language learners. Import your own books, tap words to guess and learn their meanings, and review vocabulary with spaced repetition — all offline.',
  },
  {
    question: 'Will Lexeme spoil my book?',
    answer:
      'No. Vocabulary cards are tied to text you have already read. Lexeme never surfaces plot details from pages you have not reached yet.',
  },
  {
    question: 'Which languages are supported?',
    answer:
      'Lexeme supports reading and vocabulary extraction across many languages. The first hero offline dictionary pack is Italian→English, hosted on lexeme.uk.',
  },
  {
    question: 'When can I download the app?',
    answer:
      'Lexeme is in active development. Join the waitlist and we will notify you when it launches on the App Store and Google Play.',
  },
];
