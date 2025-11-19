import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioPlayer from '../components/AudioPlayer';
import {
  demoBookMeta,
  demoInsights,
  demoMetrics,
  demoPassage,
  demoStudyQueue,
  demoWordBank,
  DemoSrsCard,
  DemoWordEntry,
} from '../data/demoContent';

const demoSteps = [
  {
    title: 'Upload & analyze',
    description: 'Lexeme cleans your book, groups lemmas, and checks spoiler safety automatically.',
  },
  {
    title: 'Explore vocabulary',
    description: 'Tap any highlighted word to open bilingual definitions, CEFR tags, and grammar cues.',
  },
  {
    title: 'Review & retain',
    description: 'Send the word to the FSRS queue and keep reading without losing focus.',
  },
];

const normalizeWord = (word: string) => word.toLowerCase().replace(/[^a-z']/g, '');

const DemoExperience: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [selectedWordKey, setSelectedWordKey] = useState<string | null>(null);
  const [studyQueue, setStudyQueue] = useState<DemoSrsCard[]>(demoStudyQueue);
  const [guideMessage, setGuideMessage] = useState('Start by simulating an upload to see Lexeme analyze a book.');
  const [queueMessage, setQueueMessage] = useState('');

  const tokens = useMemo(() => demoPassage.split(/(\s+|[.,!?;:()"—-])/), []);

  const currentWord: DemoWordEntry | null = selectedWordKey ? demoWordBank[selectedWordKey] : null;

  const handleSimulateUpload = () => {
    setAnalysisComplete(true);
    setGuideMessage('Great! Now tap any highlighted word in the excerpt to explore it in context.');
    setActiveStep(1);
  };

  const handleWordClick = (token: string) => {
    const normalized = normalizeWord(token);
    if (!normalized || !demoWordBank[normalized]) {
      return;
    }
    setSelectedWordKey(normalized);
    setGuideMessage('Add this word to your study queue or keep exploring other highlights.');
    setActiveStep((prev) => Math.max(prev, 1));
  };

  const handleAddToQueue = () => {
    if (!currentWord) return;

    const alreadyQueued = studyQueue.some((card) => card.word === currentWord.word);
    if (!alreadyQueued) {
      const newCard: DemoSrsCard = {
        word: currentWord.word,
        stage: 'Learning',
        dueIn: 'in 10 min',
        focus: 'Meaning + sound',
        confidence: 0.52,
      };
      setStudyQueue((prev) => [newCard, ...prev]);
    }
    setActiveStep(2);
    setQueueMessage(`${currentWord.word} is scheduled with FSRS so you see it again right before you would forget it.`);
    setTimeout(() => setQueueMessage(''), 4500);
  };

  return (
    <div className="space-y-10">
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl p-8 shadow-sm border border-blue-100">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold mb-2">Interactive demo</p>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-4">
              Try Lexeme with a spoiler-safe sample book
            </h1>
            <p className="text-gray-700 text-lg">
              Follow the guided flow below to watch Lexeme extract vocabulary from a real passage, show rich
              definitions, and queue cards for spaced repetition—all without creating an account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleSimulateUpload}
                className="btn-primary px-5 py-3 text-base"
              >
                Start guided demo
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="btn-secondary px-5 py-3 text-base"
              >
                Create free account
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            {demoMetrics.map((metric) => (
              <div key={metric.label} className="bg-white/80 backdrop-blur border border-white rounded-2xl p-4 shadow-inner">
                <p className="text-xs uppercase text-gray-500">{metric.label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{metric.value}</p>
                <p className="text-xs text-gray-500 mt-1">{metric.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {demoSteps.map((step, index) => {
            const isComplete = index < activeStep;
            const isCurrent = index === activeStep;
            return (
              <div
                key={step.title}
                className={`rounded-2xl border p-5 transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : isComplete
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            );
          })}
        </div>
        <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-4 text-sm text-blue-900 flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">
            ✨
          </span>
          <p>{guideMessage}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Sample book</p>
              <h2 className="text-2xl font-semibold text-gray-900">{demoBookMeta.title}</h2>
              <p className="text-sm text-gray-500">
                {demoBookMeta.author} • {demoBookMeta.language} • {demoBookMeta.level}
              </p>
            </div>
            <button
              onClick={handleSimulateUpload}
              className="px-4 py-2 text-sm rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
            >
              Simulate upload
            </button>
          </div>

          {analysisComplete ? (
            <div className="grid gap-4 md:grid-cols-3">
              {demoMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs text-blue-700 uppercase">{metric.label}</p>
                  <p className="text-xl font-semibold text-blue-900">{metric.value}</p>
                  <p className="text-xs text-blue-600">{metric.helper}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              Click “Simulate upload” to watch Lexeme extract vocabulary and spoiler-safe context automatically.
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Excerpt preview</p>
            <div className="prose max-w-none text-lg leading-relaxed text-gray-800">
              {tokens.map((token, index) => {
                const normalized = normalizeWord(token);
                const isHighlight = !!demoWordBank[normalized];
                if (!token.trim()) {
                  return <span key={`space-${index}`}>{token}</span>;
                }
                if (!isHighlight) {
                  return <span key={`token-${index}`}>{token}</span>;
                }
                const isSelected = selectedWordKey === normalized;
                return (
                  <button
                    key={`token-${index}`}
                    type="button"
                    onClick={() => handleWordClick(token)}
                    className={`inline-block px-1 rounded transition duration-150 ${
                      isSelected
                        ? 'bg-yellow-200 text-gray-900 underline'
                        : 'bg-yellow-100 text-blue-900 hover:bg-yellow-200'
                    }`}
                    aria-label={`See definition for ${normalized}`}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">Highlighted words are spoiler-safe and ready for lookup.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-gray-500">Word intelligence</p>
                <h3 className="text-xl font-semibold text-gray-900">Definition & pronunciation</h3>
              </div>
              {currentWord && (
                <AudioPlayer text={currentWord.word} language="it-IT" />
              )}
            </div>

            {currentWord ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl" aria-hidden="true">
                    📚
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{currentWord.word}</p>
                    <p className="text-sm text-gray-500">{currentWord.translation}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {currentWord.pos.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    CEFR {currentWord.cefr}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed">{currentWord.definition}</p>
                <blockquote className="text-sm text-gray-600 border-l-4 border-yellow-300 pl-4 italic">
                  “{currentWord.context}”
                </blockquote>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded">Frequency: {currentWord.frequency}</span>
                  {currentWord.forms && (
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Forms: {currentWord.forms.join(', ')}
                    </span>
                  )}
                  {currentWord.synonyms && (
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Synonyms: {currentWord.synonyms.join(', ')}
                    </span>
                  )}
                </div>
                {currentWord.tip && <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">{currentWord.tip}</p>}
                <button
                  onClick={handleAddToQueue}
                  className="w-full btn-primary py-3 text-base"
                >
                  ➕ Add to study queue
                </button>
                {queueMessage && (
                  <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg p-3">
                    {queueMessage}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                Tap a highlighted word in the excerpt to see Lexeme’s contextual dictionary view.
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-gray-500">FSRS preview</p>
                <h3 className="text-xl font-semibold text-gray-900">Personalized review queue</h3>
              </div>
              <span className="text-sm text-gray-500">Auto-syncs in the background</span>
            </div>
            <div className="space-y-4">
              {studyQueue.map((card) => (
                <div key={card.word} className="rounded-2xl border border-gray-200 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{card.word}</p>
                      <p className="text-sm text-gray-500">{card.focus}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full border ${
                        card.stage === 'Learning'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : card.stage === 'Review'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {card.stage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Due {card.dueIn}</span>
                    <span>Confidence {Math.round(card.confidence * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${Math.min(100, Math.round(card.confidence * 100))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-semibold">Why the demo feels different</h3>
            <ul className="space-y-2 text-sm text-gray-100">
              {demoInsights.map((insight) => (
                <li key={insight} className="flex items-start gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm rounded-lg bg-white text-gray-900 font-semibold"
              >
                Back to homepage
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="px-4 py-2 text-sm rounded-lg border border-white/40 hover:bg-white/10 transition"
              >
                Continue to onboarding
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DemoExperience;

