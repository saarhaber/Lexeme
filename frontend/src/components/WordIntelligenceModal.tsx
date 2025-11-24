import React from 'react';
import AudioPlayer from './AudioPlayer';

interface Lemma {
  id: number;
  lemma: string;
  language: string;
  pos: string | null;
  definition: string | null;
  morphology: Record<string, any> | null;
  global_frequency: number;
}

interface VocabularyItem {
  lemma: Lemma;
  frequency_in_book: number;
  difficulty_estimate: number;
  status: 'learned' | 'unknown';
  example_sentences?: string[];
  collocations?: string[];
}

interface WordIntelligenceModalProps {
  item: VocabularyItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToQueue?: () => void;
}

const WordIntelligenceModal: React.FC<WordIntelligenceModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToQueue,
}) => {
  if (!isOpen) return null;

  const morphology = item.lemma.morphology || {};
  const wordForms = Array.isArray(morphology?.forms) ? morphology.forms : null;
  
  // Extract data
  const pos = item.lemma.pos || 'NOUN';
  const definition = item.lemma.definition || '';
  const exampleSentence = item.example_sentences?.[0] || '';
  const synonyms = morphology?.synonyms || [];
  const tip = morphology?.tip || '';
  
  // Determine frequency label
  const frequencyLabel = item.frequency_in_book > 50 
    ? 'Very common' 
    : item.frequency_in_book > 20 
    ? 'Common' 
    : item.frequency_in_book > 10 
    ? 'Moderate' 
    : 'Less common';

  // Helper to clean definition
  const cleanDefinition = (text: string): string => {
    if (!text) return '';
    const lines = text.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && 
        !trimmed.toLowerCase().startsWith('plural:') &&
        !trimmed.toLowerCase().startsWith('feminine:') &&
        !trimmed.toLowerCase().startsWith('masculine:');
    });
    return lines[0]?.trim() || text.trim();
  };

  // Get translation (first line of definition, typically)
  const translation = definition.split('\n')[0]?.trim() || definition.trim();
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
                WORD INTELLIGENCE
              </p>
              <h2 className="text-2xl font-bold text-gray-900">
                Definition & pronunciation
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Word section */}
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">📚</span>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {item.lemma.lemma}
              </h3>
              <p className="text-lg text-gray-700">
                {translation}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-medium">
                {pos.toUpperCase()}
              </span>
              {morphology.cefr && (
                <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                  CEFR {morphology.cefr}
                </span>
              )}
            </div>
          </div>

          {/* Audio player */}
          <div className="flex justify-start">
            <AudioPlayer text={item.lemma.lemma} language={item.lemma.language} />
          </div>

          {/* Definition */}
          {cleanDefinition(definition) && (
            <p className="text-gray-800 leading-relaxed text-base">
              {cleanDefinition(definition)}
            </p>
          )}

          {/* Example sentence */}
          {exampleSentence && (
            <blockquote className="text-sm text-gray-600 border-l-4 border-yellow-400 pl-4 italic leading-relaxed">
              "{exampleSentence}"
            </blockquote>
          )}

          {/* Info pills */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full">
              Frequency: {frequencyLabel}
            </span>
            {wordForms && wordForms.length > 0 && (
              <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                Forms: {wordForms.join(', ')}
              </span>
            )}
            {synonyms.length > 0 && (
              <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                Synonyms: {synonyms.join(', ')}
              </span>
            )}
          </div>

          {/* Usage tip */}
          {tip && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {tip}
              </p>
            </div>
          )}

          {/* Add to queue button */}
          <button
            onClick={() => {
              onAddToQueue?.();
              onClose();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>➕</span>
            <span>Add to study queue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordIntelligenceModal;

