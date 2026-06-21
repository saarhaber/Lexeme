export const features = [
  {
    title: 'Bring your own books',
    description:
      'Import EPUBs from your library and read them cover to cover — offline, on your device, with no store or subscription.',
    icon: '📖',
  },
  {
    title: 'Guess before you know',
    description:
      'Tap a word and try to recall it before the translation appears. Look things up without breaking the reading flow.',
    icon: '👆',
  },
  {
    title: 'Calm sepia reading',
    description:
      'Warm paper tones designed for long reading sessions. Sepia is the default — the same comfortable view as the app.',
    icon: '☕',
  },
  {
    title: 'Finish the book',
    description:
      'Vocabulary review supports your reading — words you tap while reading come back in short sessions so you keep turning pages.',
    icon: '📚',
  },
];

export const steps = [
  {
    number: '1',
    title: 'Import a book',
    description: 'Add an EPUB from your library — a novel, essay, or anything you actually want to read in your target language.',
  },
  {
    number: '2',
    title: 'Read. Tap. Guess.',
    description: 'Turn pages in warm sepia. Tap words you do not know, guess the meaning, then see the definition — all without leaving the book.',
  },
  {
    number: '3',
    title: 'Keep reading',
    description: 'Pick up where you left off. Optional review sessions reinforce words you met in the story — so the next chapter feels easier.',
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
    'Lexeme downloads hero dictionary packs from lexeme.uk — no GitHub auth, no private-repo friction. Look up words while you read, even offline.',
};

export const screenshots = [
  {
    id: 'reading',
    title: 'Read your books',
    description: 'Open any EPUB and read in warm sepia — the same calm view you get in the app.',
    device: 'phone' as const,
    alt: 'Lexeme reading view showing an Italian EPUB on Android',
  },
  {
    id: 'lookup',
    title: 'Tap without stopping',
    description: 'Tap a word for definitions, grammar, and examples in a bottom sheet — your place in the book stays put.',
    device: 'phone' as const,
    alt: 'Lexeme word lookup sheet while reading on Android',
  },
  {
    id: 'study',
    title: 'Guess, then learn',
    description: 'Active recall before the answer appears — so lookups reinforce reading, not replace it.',
    device: 'phone' as const,
    alt: 'Lexeme guess-before-you-know prompt while reading on Android',
  },
  {
    id: 'library-tablet',
    title: 'Your library, any screen',
    description: 'Import EPUBs, track progress, and pick up the chapter you left off.',
    device: 'tablet' as const,
    alt: 'Lexeme library on iPad',
  },
];

export type ComparisonRow = {
  label: string;
  lexeme: string;
  lingq: string;
  beelinguapp: string;
  lexemeHighlight?: boolean;
};

export const comparisonIntro = {
  eyebrow: 'Why Lexeme',
  title: 'Built to read books — not to sell you lessons',
  description:
    'LingQ and Beelinguapp are great at what they do. Lexeme is different: a calm EPUB reader for finishing the books you already own — forever free.',
};

export const comparisonRows: ComparisonRow[] = [
  {
    label: 'Primary goal',
    lexeme: 'Finish books you import',
    lingq: 'Build vocabulary from any content',
    beelinguapp: 'Study curated bilingual stories',
  },
  {
    label: 'Your own EPUBs',
    lexeme: 'Yes — bring any book',
    lingq: 'Yes — import on desktop',
    beelinguapp: 'No — app library only',
    lexemeHighlight: true,
  },
  {
    label: 'Reading experience',
    lexeme: 'Sepia EPUB reader, stays in the book',
    lingq: 'Lesson-style reader, web-first imports',
    beelinguapp: 'Side-by-side bilingual text',
    lexemeHighlight: true,
  },
  {
    label: 'Word lookup',
    lexeme: 'Tap → guess → definition in context',
    lingq: 'Tap → instant translation',
    beelinguapp: 'Reference your native language',
  },
  {
    label: 'Offline reading',
    lexeme: 'Full offline with hero dictionaries',
    lingq: 'Premium only',
    beelinguapp: 'Limited without premium',
    lexemeHighlight: true,
  },
  {
    label: 'Price',
    lexeme: 'Forever free',
    lingq: 'Free tier capped; ~$10–15/mo Premium',
    beelinguapp: 'Free with limits; ~$7–45/yr Premium',
    lexemeHighlight: true,
  },
];

export const comparisonHighlights = [
  {
    title: 'vs LingQ',
    description:
      'LingQ turns content into lessons and gates imports, offline mode, and saved words behind Premium. Lexeme is a dedicated EPUB reader: import your book, read offline, tap words — no subscription, no 20-word cap.',
  },
  {
    title: 'vs Beelinguapp',
    description:
      'Beelinguapp teaches through its own bilingual story library — you cannot import your EPUB. Lexeme is for the novel already on your shelf: read it in the original language, guess words as you go, and keep turning pages.',
  },
  {
    title: 'Forever free',
    description:
      'No paywall on your books, no premium tier for offline reading, no ads. Lexeme is a Saar Labs experiment — we want learners to actually finish books, not subscribe to finish a chapter.',
  },
];

export const faqs = [
  {
    question: 'What is Lexeme?',
    answer:
      'Lexeme is a calm EPUB reader for language learners. Import books you want to read, tap words to guess and learn their meanings in context, and pick up where you left off — all offline. Vocabulary review is there to help you keep reading, not to replace it.',
  },
  {
    question: 'Is Lexeme a vocabulary app?',
    answer:
      'No — Lexeme is a reader first. The goal is to help you finish books in a language you are learning. Tapping words builds your vocabulary along the way, and optional review sessions reinforce what you met in the story.',
  },
  {
    question: 'Will Lexeme spoil my book?',
    answer:
      'No. Review cards are tied to text you have already read. Lexeme never surfaces plot details from pages you have not reached yet.',
  },
  {
    question: 'How is Lexeme different from LingQ or Beelinguapp?',
    answer:
      'LingQ is a broad immersion platform with a limited free tier and paid Premium for imports and offline use. Beelinguapp offers curated bilingual stories but not your own EPUBs. Lexeme is a focused EPUB reader: your books, sepia pages, tap-to-guess lookups, offline dictionaries — forever free.',
  },
  {
    question: 'Which languages are supported?',
    answer:
      'Lexeme supports reading across many languages. The first hero offline dictionary pack is Italian→English, hosted on lexeme.uk.',
  },
  {
    question: 'When can I download the app?',
    answer:
      'Lexeme is in active development. Join the waitlist and we will notify you when it launches on the App Store and Google Play.',
  },
];
