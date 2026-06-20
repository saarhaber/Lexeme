export const features = [
  {
    title: 'Learn from real literature',
    description: 'Not textbooks—real books you actually want to read, in any language.',
    icon: '📖',
  },
  {
    title: 'Zero spoilers',
    description: 'Vocabulary is tied to what you have already read. Plot stays untouched.',
    icon: '🚫',
  },
  {
    title: 'Tap to translate',
    description: 'Tap any word for instant definitions, grammar cues, and pronunciation.',
    icon: '👆',
  },
  {
    title: 'Spaced repetition',
    description: 'FSRS-powered review schedules words right before you would forget them.',
    icon: '🎯',
  },
];

export const steps = [
  {
    number: '1',
    title: 'Import a book',
    description: 'Add an EPUB or PDF from your library and start reading on your phone.',
  },
  {
    number: '2',
    title: 'Tap while you read',
    description: 'Look up words in context with rich bilingual definitions—no tab switching.',
  },
  {
    number: '3',
    title: 'Review & remember',
    description: 'Swipe through short study sessions that reinforce what you discovered.',
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
    'LexemeReader downloads hero dictionary packs from lexeme.uk—no GitHub auth, no private-repo friction.',
};

export const screenshots = [
  {
    id: 'reading',
    title: 'Read in context',
    description: 'Tap any word while reading to see definitions without leaving the page.',
    device: 'phone' as const,
    alt: 'LexemeReader reading view on Android phone',
  },
  {
    id: 'lookup',
    title: 'Rich word cards',
    description: 'Bilingual definitions, grammar cues, and pronunciation in one sheet.',
    device: 'phone' as const,
    alt: 'LexemeReader word lookup on Android phone',
  },
  {
    id: 'study',
    title: 'Swipe to review',
    description: 'Short FSRS study sessions reinforce words you discovered while reading.',
    device: 'phone' as const,
    alt: 'LexemeReader study session on Android phone',
  },
  {
    id: 'library-tablet',
    title: 'Your library, any screen',
    description: 'Import EPUBs and PDFs, track progress, and pick up where you left off.',
    device: 'tablet' as const,
    alt: 'LexemeReader library on iPad',
  },
];

export const faqs = [
  {
    question: 'What is LexemeReader?',
    answer:
      'LexemeReader is a mobile app for learning vocabulary from real books. Import a title, read in the app, tap words for definitions, and review with spaced repetition.',
  },
  {
    question: 'Will LexemeReader spoil my book?',
    answer:
      'No. Vocabulary cards are tied to text you have already read. Lexeme never surfaces plot details from pages you have not reached yet.',
  },
  {
    question: 'Which languages are supported?',
    answer:
      'LexemeReader supports reading and vocabulary extraction across many languages. The first hero offline dictionary pack is Italian→English, hosted on lexeme.uk.',
  },
  {
    question: 'When can I download the app?',
    answer:
      'LexemeReader is in active development. Join the waitlist and we will notify you when it launches on the App Store and Google Play.',
  },
];
