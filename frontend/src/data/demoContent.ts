export interface DemoWordEntry {
  word: string;
  translation: string;
  definition: string;
  pos: string;
  context: string;
  cefr: string;
  frequency: string;
  notes?: string;
  forms?: string[];
  synonyms?: string[];
  tip?: string;
}

export interface DemoSrsCard {
  word: string;
  stage: 'Learning' | 'Review' | 'Mature';
  dueIn: string;
  focus: string;
  confidence: number; // 0 - 1
}

export const demoBookMeta = {
  title: 'Il Taccuino Fiorentino',
  author: 'Camilla B.',
  language: 'Italian',
  level: 'Upper-Intermediate (B2)',
  genre: 'Literary Fiction',
  coverAccent: 'from-orange-50 via-rose-50 to-amber-100',
};

export const demoPassage = `Lucia scese nella piazza principale proprio mentre i venditori aprivano le loro tende. Il profumo della focaccia appena sfornata riempiva l'aria. Il suo diario di cuoio era aperto su una pagina piena di appunti in cui cercava di intrecciare nuove parole con vecchi ricordi. Piu avanti, una piccola bottega custodiva una pila di romanzi consunti, ciascuno pronto a svelare un nuovo segreto lessicale.`;

export const demoWordBank: Record<string, DemoWordEntry> = {
  piazza: {
    word: 'piazza',
    translation: 'town square',
    definition: 'Uno spazio pubblico centrale dove la citta si riunisce.',
    pos: 'noun',
    context: 'Lucia scese nella piazza principale...',
    cefr: 'A2',
    frequency: 'Very common',
    forms: ['la piazza', 'le piazze'],
    synonyms: ['square', 'plaza'],
    tip: 'Often the social heart of an Italian town.',
  },
  focaccia: {
    word: 'focaccia',
    translation: 'flatbread',
    definition: 'Pane soffice condito con olio d\'oliva e sale.',
    pos: 'noun',
    context: 'Il profumo della focaccia appena sfornata...',
    cefr: 'B1',
    frequency: 'Common',
    forms: ['la focaccia', 'le focacce'],
    synonyms: ['flatbread'],
    tip: 'A bakery favorite; note the double "c".',
  },
  intrecciare: {
    word: 'intrecciare',
    translation: 'to weave / braid',
    definition: 'Unire elementi diversi creando una nuova trama.',
    pos: 'verb',
    context: '...cercava di intrecciare nuove parole con vecchi ricordi.',
    cefr: 'B2',
    frequency: 'Less common',
    forms: ['intreccio', 'intrecciando', 'intrecciato'],
    synonyms: ['combinare', 'intessere'],
    tip: 'Use when blending ideas or physical strands.',
  },
  bottega: {
    word: 'bottega',
    translation: 'workshop / small shop',
    definition: 'Negozio artigianale, spesso a conduzione familiare.',
    pos: 'noun',
    context: '...una piccola bottega custodiva una pila di romanzi...',
    cefr: 'B1',
    frequency: 'Common',
    forms: ['la bottega', 'le botteghe'],
    synonyms: ['shop', 'atelier'],
    tip: 'Think cozy, curated, often with local makers.',
  },
  svelare: {
    word: 'svelare',
    translation: 'to reveal',
    definition: 'Portare alla luce qualcosa di nascosto.',
    pos: 'verb',
    context: '...pronto a svelare un nuovo segreto lessicale.',
    cefr: 'B2',
    frequency: 'Moderate',
    forms: ['svelo', 'svelato', 'svelando'],
    synonyms: ['rivelare', 'scoprire'],
    tip: 'Great for plot twists and discoveries.',
  },
};

export const demoMetrics = [
  { label: 'Extraction time', value: '22s', helper: 'Smart parsing on a 280-page novel' },
  { label: 'Unique words detected', value: '1,842', helper: 'Grouped by lemma + family' },
  { label: 'Spoiler-safe words', value: '1,120', helper: 'Only from pages you have read' },
];

export const demoInsights = [
  'Named entities automatically masked until you encounter them.',
  'Context windows trimmed to 2 sentences to avoid spoilers.',
  'FSRS-ready cards generated the second you tap a word.',
];

export const demoStudyQueue: DemoSrsCard[] = [
  {
    word: 'piazza',
    stage: 'Learning',
    dueIn: 'in 3 min',
    focus: 'Meaning',
    confidence: 0.78,
  },
  {
    word: 'bottega',
    stage: 'Review',
    dueIn: 'in 8 hr',
    focus: 'Context recall',
    confidence: 0.64,
  },
  {
    word: 'svelare',
    stage: 'Mature',
    dueIn: 'in 3 days',
    focus: 'Production',
    confidence: 0.41,
  },
];

