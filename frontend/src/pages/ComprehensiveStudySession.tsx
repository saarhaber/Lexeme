import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../utils/api';

import { API_BASE_URL } from '../config/api';

interface VocabularyWord {
  id: number;
  lemma: string;
  pos: string;
  definition: string;
  frequency: number;
  difficulty_level: number;
  morphology: any;
}

interface StudySession {
  words: VocabularyWord[];
  currentIndex: number;
  studyMode: 'flashcard' | 'multiple-choice' | 'typing' | 'listening';
  totalWords: number;
  knownWords: Set<number>;
  unknownWords: Set<number>;
  difficulty: 'easy' | 'medium' | 'hard' | 'all';
}

const ComprehensiveStudySession: React.FC = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    if (bookId && token) {
      loadVocabulary();
    }
  }, [bookId, token]);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/vocab/book/${bookId}`, token);
      if (!response.ok) {
        throw new Error('Failed to load vocabulary');
      }
      const vocabulary = await response.json();
      
      // Create comprehensive study session with ALL words
      const words = vocabulary.vocabulary || vocabulary.words || [];
      const shuffledWords = [...words].sort(() => Math.random() - 0.5);
      
      setSession({
        words: shuffledWords,
        currentIndex: 0,
        studyMode: 'flashcard',
        totalWords: shuffledWords.length,
        knownWords: new Set(),
        unknownWords: new Set(),
        difficulty: 'all'
      });
      
      setError('');
    } catch (err) {
      setError('Failed to load vocabulary data');
      console.error('Error loading vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMultipleChoiceOptions = (correctWord: VocabularyWord, allWords: VocabularyWord[]): string[] => {
    const options = [correctWord.lemma];
    
    // Get random distractor words
    const otherWords = allWords.filter(w => w.id !== correctWord.id);
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length && options.length < 4; i++) {
      if (!options.includes(shuffled[i].lemma)) {
        options.push(shuffled[i].lemma);
      }
    }
    
    return options.sort(() => Math.random() - 0.5);
  };

  const handleShowAnswer = () => {
    if (!currentWord || !session) return;
    setShowAnswer(true);
    const newOptions = generateMultipleChoiceOptions(currentWord, session.words);
    setOptions(newOptions);
  };

  const handleMarkKnown = () => {
    if (!session || !currentWord) return;
    
    const newKnownWords = new Set(session.knownWords);
    newKnownWords.add(currentWord.id);
    
    setSession(prev => prev ? {
      ...prev,
      knownWords: newKnownWords,
      currentIndex: prev.currentIndex + 1
    } : null);
    
    resetCardState();
  };

  const handleMarkUnknown = () => {
    if (!session || !currentWord) return;
    
    const newUnknownWords = new Set(session.unknownWords);
    newUnknownWords.add(currentWord.id);
    
    setSession(prev => prev ? {
      ...prev,
      unknownWords: newUnknownWords,
      currentIndex: prev.currentIndex + 1
    } : null);
    
    resetCardState();
  };

  const handleTypingAnswer = () => {
    if (!session || !currentWord) return;
    
    const isCorrect = userInput.toLowerCase().trim() === currentWord.lemma.toLowerCase();
    if (isCorrect) {
      handleMarkKnown();
    } else {
      setError('Incorrect answer. Try again!');
    }
  };

  const handleMultipleChoiceAnswer = () => {
    if (!session || !currentWord) return;
    
    const isCorrect = selectedOption === currentWord.lemma;
    if (isCorrect) {
      handleMarkKnown();
    } else {
      setError('Incorrect answer. Try again!');
    }
  };

  const resetCardState = () => {
    setShowAnswer(false);
    setUserInput('');
    setSelectedOption('');
    setOptions([]);
    setError('');
  };

  const changeStudyMode = (mode: StudySession['studyMode']) => {
    if (!session) return;
    
    setSession(prev => prev ? {
      ...prev,
      studyMode: mode,
      currentIndex: 0
    } : null);
    
    resetCardState();
  };

  const currentWord = session?.words[session.currentIndex];
  const progress = session ? Math.round(((session.currentIndex) / session.totalWords) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your comprehensive vocabulary...</p>
          <p className="mt-2 text-sm text-gray-500">Processing ALL words from your book</p>
        </div>
      </div>
    );
  }

  if (error || !session || session.words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || 'No vocabulary available'}
          </h3>
          <p className="text-gray-500 mb-6">
            {error || 'Please upload a book first to start studying vocabulary.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Upload Book
          </button>
        </div>
      </div>
    );
  }

  if (session.currentIndex >= session.totalWords) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Study Session Complete!</h3>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">{session.knownWords.size}</div>
                <div className="text-sm text-gray-600">Known Words</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{session.unknownWords.size}</div>
                <div className="text-sm text-gray-600">Unknown Words</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{session.totalWords}</div>
                <div className="text-sm text-gray-600">Total Words</div>
              </div>
            </div>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => {
                setSession(prev => prev ? {
                  ...prev,
                  currentIndex: 0,
                  knownWords: new Set(),
                  unknownWords: new Set()
                } : null);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Study Again
            </button>
            <button
              onClick={() => navigate('/books')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                📖 Study Session
              </h1>
              <button
                onClick={() => navigate('/books')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Books
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Word {session.currentIndex + 1} of {session.totalWords} ({progress}% complete)
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Study Mode Selection */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Study Mode</h3>
            <div className="flex space-x-2">
              {(['flashcard', 'multiple-choice', 'typing', 'listening'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => changeStudyMode(mode)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    session.studyMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'flashcard' && '🃏 Flashcards'}
                  {mode === 'multiple-choice' && '❓ Multiple Choice'}
                  {mode === 'typing' && '⌨️ Typing'}
                  {mode === 'listening' && '🎧 Listening'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Study Card */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {session.studyMode === 'flashcard' && currentWord && (
              <FlashcardView
                word={currentWord}
                showAnswer={showAnswer}
                onShowAnswer={handleShowAnswer}
                onKnown={handleMarkKnown}
                onUnknown={handleMarkUnknown}
              />
            )}

            {session.studyMode === 'multiple-choice' && currentWord && (
              <MultipleChoiceView
                word={currentWord}
                options={options}
                selectedOption={selectedOption}
                onSelectOption={setSelectedOption}
                onSubmit={handleMultipleChoiceAnswer}
                showAnswer={showAnswer}
                onKnown={handleMarkKnown}
              />
            )}

            {session.studyMode === 'typing' && currentWord && (
              <TypingView
                word={currentWord}
                userInput={userInput}
                onInputChange={setUserInput}
                onSubmit={handleTypingAnswer}
                showAnswer={showAnswer}
                onKnown={handleMarkKnown}
              />
            )}

            {session.studyMode === 'listening' && currentWord && (
              <ListeningView
                word={currentWord}
                onPlay={() => {
                  // In a real implementation, you'd use text-to-speech
                  alert('Playing audio for: ' + currentWord.lemma);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Flashcard Component
const FlashcardView: React.FC<{
  word: VocabularyWord;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onKnown: () => void;
  onUnknown: () => void;
}> = ({ word, showAnswer, onShowAnswer, onKnown, onUnknown }) => {
  return (
    <div className="text-center">
      {!showAnswer ? (
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{word.lemma}</h2>
          <button
            onClick={onShowAnswer}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Show Definition
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-4xl font-bold text-green-600 mb-4">{word.lemma}</h2>
          <p className="text-lg text-gray-700 mb-6">
            {word.definition || 'No translation available'}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onKnown}
              className="px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              ✅ I Know This
            </button>
            <button
              onClick={onUnknown}
              className="px-6 py-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
            >
              ❓ I Need to Learn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Multiple Choice Component
const MultipleChoiceView: React.FC<{
  word: VocabularyWord;
  options: string[];
  selectedOption: string;
  onSelectOption: (option: string) => void;
  onSubmit: () => void;
  showAnswer: boolean;
  onKnown: () => void;
}> = ({ word, options, selectedOption, onSelectOption, onSubmit, showAnswer, onKnown }) => {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">{word.definition || 'No definition'}</h2>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => !showAnswer && onSelectOption(option)}
            disabled={showAnswer}
            className={`p-3 rounded-md border font-medium transition-colors ${
              selectedOption === option
                ? 'bg-blue-600 text-white border-blue-600'
                : showAnswer && option === word.lemma
                ? 'bg-green-100 text-green-800 border-green-300'
                : showAnswer && option === selectedOption
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {!showAnswer && (
        <button
          onClick={onSubmit}
          disabled={!selectedOption}
          className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}
      {showAnswer && (
        <div className="text-center">
          <p className="text-lg font-medium mb-4">
            Correct answer: <span className="text-green-600">{word.lemma}</span>
          </p>
          <button
            onClick={onKnown}
            className="px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
};

// Typing Component
const TypingView: React.FC<{
  word: VocabularyWord;
  userInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  showAnswer: boolean;
  onKnown: () => void;
}> = ({ word, userInput, onInputChange, onSubmit, showAnswer, onKnown }) => {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        {word.definition || 'Type the word'}
      </h2>
      {!showAnswer ? (
        <div>
          <input
            type="text"
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            className="w-full max-w-md p-3 border border-gray-300 rounded-md text-center text-lg mb-4"
            placeholder="Type your answer here..."
          />
          <button
            onClick={onSubmit}
            disabled={!userInput.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg font-medium mb-4">
            Correct answer: <span className="text-green-600">{word.lemma}</span>
          </p>
          <button
            onClick={onKnown}
            className="px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
};

// Listening Component
const ListeningView: React.FC<{
  word: VocabularyWord;
  onPlay: () => void;
}> = ({ word, onPlay }) => {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold text-gray-900 mb-8">🎧 Listen and Type</h2>
      <button
        onClick={onPlay}
        className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-colors mb-6"
      >
        🔊 Play Audio
      </button>
      <p className="text-gray-600">Audio functionality coming soon...</p>
    </div>
  );
};

export default ComprehensiveStudySession;
