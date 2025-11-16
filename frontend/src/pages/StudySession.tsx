import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SkeletonCard from '../components/SkeletonCard';
import ProgressIndicator from '../components/ProgressIndicator';

interface Lemma {
  id: number;
  lemma: string;
  language: string;
  pos: string;
  definition: string;
  morphology: Record<string, any>;
  global_frequency: number;
}

interface VocabularyItem {
  lemma: Lemma;
  frequency_in_book: number;
  difficulty_estimate: number;
  status: 'known' | 'learning' | 'unknown' | 'ignored';
  example_sentences: string[];
  collocations: string[];
}

interface StudyCard {
  id: number;
  word: string;
  definition: string;
  difficulty: number;
  frequency: number;
  pos: string;
  examples: string[];
  isFlipped: boolean;
}

type StudyMode = 'flashcards' | 'multiple-choice' | 'typing';

const StudySession: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcards');
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapters, setChapters] = useState<number[]>([]);
  const [chapterWordCounts, setChapterWordCounts] = useState<Record<number, number>>({});
  
  // Study state
  const [showDefinition, setShowDefinition] = useState(false);
  const [userChoice, setUserChoice] = useState<string>('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [typingAnswer, setTypingAnswer] = useState('');

  // Fetch user's books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/books');
        if (response.ok) {
          const data = await response.json();
          setBooks(data);
          if (data.length > 0) {
            const firstBookId = data[0].id;
            setSelectedBook(firstBookId);
            if (bookId) {
              const book = data.find((b: any) => b.id === parseInt(bookId));
              if (book) {
                setSelectedBook(book.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch books:', error);
      }
    };

    fetchBooks();
  }, [bookId]);

  // Fetch chapters for selected book
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedBook) return;
      try {
        const response = await fetch(`http://localhost:8000/api/vocab/book/${selectedBook}/chapters`);
        if (response.ok) {
          const data = await response.json();
          setChapters(data.chapters || []);
          setChapterWordCounts(data.chapter_word_counts || {});
          // Default to "All chapters" (null)
          setSelectedChapter(null);
        }
      } catch (error) {
        console.error('Failed to fetch chapters:', error);
      }
    };

    fetchChapters();
  }, [selectedBook]);

  // Load vocabulary for study
  useEffect(() => {
    if (selectedBook) {
      loadVocabularyForStudy(selectedBook);
    }
  }, [selectedBook, selectedChapter]);

  const loadVocabularyForStudy = async (bookId: number) => {
    try {
      setLoading(true);
      let url = `http://localhost:8000/api/vocab/book/${bookId}`;
      if (selectedChapter !== null) {
        url += `?chapter=${selectedChapter}`;
      }
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to load vocabulary');
      }
      
      const data = await response.json();
      const vocabulary = data.vocabulary;
      
      // Convert vocabulary items to study cards
      const studyCards: StudyCard[] = vocabulary
        .filter((item: VocabularyItem) => item.status !== 'known' && item.status !== 'ignored')
        .map((item: VocabularyItem) => ({
          id: item.lemma.id,
          word: item.lemma.lemma,
          definition: item.lemma.definition || `${item.lemma.pos} word`,
          difficulty: item.difficulty_estimate,
          frequency: item.frequency_in_book,
          pos: item.lemma.pos,
          examples: item.example_sentences.slice(0, 2),
          isFlipped: false
        }));
      
      setCards(studyCards);
      setCurrentCardIndex(0);
      setShowDefinition(false);
      setCorrectAnswers(0);
      setTotalQuestions(0);
      setUserChoice('');
      setTypingAnswer('');
      setLoading(false);
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      setLoading(false);
    }
  };

  const [showCompletion, setShowCompletion] = useState(false);

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowDefinition(false);
      setUserChoice('');
      setTypingAnswer('');
    } else {
      // End of cards, show completion celebration
      setShowCompletion(true);
      setTimeout(() => {
        setShowCompletion(false);
        setCurrentCardIndex(0);
        setCorrectAnswers(0);
        setTotalQuestions(0);
      }, 3000);
    }
  };

  const handleAnswer = async (answer: 'correct' | 'incorrect' | 'skip') => {
    setTotalQuestions(prev => prev + 1);
    
    if (answer === 'correct') {
      setCorrectAnswers(prev => prev + 1);
    }
    
    // Update word status in backend
    const currentCard = cards[currentCardIndex];
    const newStatus = answer === 'correct' ? 'known' : 'learning';
    
    try {
      await fetch(`http://localhost:8000/api/vocab/status/${currentCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error('Failed to update word status:', error);
    }
    
    setTimeout(handleNextCard, 500);
  };

  const generateMultipleChoiceOptions = (correctWord: string) => {
    const options = [correctWord];
    const otherWords = cards
      .filter(card => card.word !== correctWord)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(card => card.word);
    
    return [...options, ...otherWords].sort(() => Math.random() - 0.5);
  };

  const handleMCAnswer = (selectedWord: string) => {
    setUserChoice(selectedWord);
    const isCorrect = selectedWord === cards[currentCardIndex].word;
    
    setTotalQuestions(prev => prev + 1);
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    setTimeout(handleNextCard, 1000);
  };

  const handleTypingAnswer = () => {
    const currentCard = cards[currentCardIndex];
    const isCorrect = typingAnswer.toLowerCase().trim() === currentCard.word.toLowerCase();
    
    setTotalQuestions(prev => prev + 1);
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    setTimeout(handleNextCard, 500);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <SkeletonCard variant="study" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Books Available</h2>
          <p className="text-gray-500 mb-4">
            Upload and process a book to start studying vocabulary.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Upload a Book
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Vocabulary to Study</h2>
          <p className="text-gray-500 mb-4">
            This book doesn't have any vocabulary words to study yet.
          </p>
          <button
            onClick={() => navigate(`/book/${selectedBook}/vocabulary`)}
            className="btn-primary"
          >
            View Vocabulary
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  // Show completion celebration
  if (showCompletion) {
    const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center animate-bounce">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Study Session Complete!</h2>
          <div className="text-4xl font-bold text-blue-600 mb-4">{scorePercentage}%</div>
          <p className="text-lg text-gray-600 mb-6">
            You reviewed {cards.length} words and got {correctAnswers} out of {totalQuestions} correct!
          </p>
          {scorePercentage >= 90 && (
            <p className="text-xl text-green-600 font-semibold mb-4">🌟 Outstanding performance!</p>
          )}
          <button
            onClick={() => {
              setShowCompletion(false);
              setCurrentCardIndex(0);
              setCorrectAnswers(0);
              setTotalQuestions(0);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🎯 Study Session</h1>
        
        {/* Book Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Book to Study:
          </label>
          <select
            value={selectedBook || ''}
            onChange={(e) => setSelectedBook(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} by {book.author} ({book.language})
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Selection */}
        {chapters.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Chapter (optional):
            </label>
            <select
              value={selectedChapter === null ? 'all' : selectedChapter}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedChapter(value === 'all' ? null : Number(value));
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Chapters</option>
              {chapters.map((chapter) => (
                <option key={chapter} value={chapter}>
                  Chapter {chapter} ({chapterWordCounts[chapter] || 0} words)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Study Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Study Mode:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStudyMode('flashcards')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 transform ${
                studyMode === 'flashcards'
                  ? 'bg-primary text-white scale-105'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105 active:scale-95'
              }`}
            >
              🃏 Flashcards
            </button>
            <button
              onClick={() => setStudyMode('multiple-choice')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 transform ${
                studyMode === 'multiple-choice'
                  ? 'bg-primary text-white scale-105'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105 active:scale-95'
              }`}
            >
              ✅ Multiple Choice
            </button>
            <button
              onClick={() => setStudyMode('typing')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 transform ${
                studyMode === 'typing'
                  ? 'bg-primary text-white scale-105'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105 active:scale-95'
              }`}
            >
              ⌨️ Typing
            </button>
            <button
              onClick={() => navigate(`/book/${selectedBook}/study/swipe`)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              💫 Swipe Mode
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <ProgressIndicator
                value={currentCardIndex + 1}
                max={cards.length}
                label="Study Progress"
                showValues={true}
                showPercentage={true}
                variant="blue"
                size="md"
                ariaLabel={`Study progress: ${currentCardIndex + 1} of ${cards.length} words reviewed`}
              />
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700">Session Score</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}%
                </span>
                <span className="text-sm text-gray-600">
                  {correctAnswers} / {totalQuestions}
                </span>
              </div>
              <ProgressIndicator
                value={totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0}
                max={100}
                showPercentage={false}
                variant={totalQuestions > 0 && (correctAnswers / totalQuestions) >= 0.7 ? 'green' : totalQuestions > 0 && (correctAnswers / totalQuestions) >= 0.5 ? 'yellow' : 'red'}
                size="sm"
                ariaLabel={`Session score: ${correctAnswers} correct out of ${totalQuestions} total`}
              />
            </div>
          </div>
          {/* Encouraging Messages */}
          {totalQuestions > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <p className="text-sm text-gray-700 text-center">
                {(() => {
                  const score = correctAnswers / totalQuestions;
                  if (score >= 0.9) return '🌟 Excellent work! You\'re mastering these words!';
                  if (score >= 0.7) return '👍 Great job! Keep up the good work!';
                  if (score >= 0.5) return '💪 You\'re making progress! Keep studying!';
                  return '📚 Keep practicing! Every word you learn is progress!';
                })()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Study Card */}
      <div className="card transition-all duration-300 hover:shadow-lg">
        <div className="text-center">
          {studyMode === 'flashcards' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <div className="text-6xl font-bold text-primary mb-4">
                  {currentCard.word}
                </div>
                <div className="text-gray-600 mb-2">
                  <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {currentCard.pos}
                  </span>
                  <span className="ml-2 text-sm">
                    Difficulty: {Math.round(currentCard.difficulty * 100)}%
                  </span>
                  <span className="ml-2 text-sm">
                    Frequency: {currentCard.frequency}
                  </span>
                </div>
              </div>

              {!showDefinition ? (
                <button
                  onClick={() => setShowDefinition(true)}
                  className="btn-primary transition-all duration-200"
                >
                  Show Definition
                </button>
              ) : (
                <div className="text-left animate-slide-up">
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Definition:</h3>
                    <p className="text-gray-700">{currentCard.definition}</p>
                    
                    {currentCard.examples.length > 0 && (
                      <div className="mt-3">
                        <h4 className="font-semibold mb-2">Examples:</h4>
                        {currentCard.examples.map((example, idx) => (
                          <p key={idx} className="text-sm text-gray-600 italic">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleAnswer('correct')}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      ✓ I Know This
                    </button>
                    <button
                      onClick={() => handleAnswer('incorrect')}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      ✗ Need to Learn
                    </button>
                    <button
                      onClick={() => handleAnswer('skip')}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {studyMode === 'multiple-choice' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">
                  What does this word mean?
                </h3>
                <div className="text-3xl font-bold text-primary mb-2">
                  {currentCard.definition}
                </div>
                <div className="text-sm text-gray-600">
                  Choose the correct word:
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {generateMultipleChoiceOptions(currentCard.word).map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleMCAnswer(option)}
                    disabled={!!userChoice}
                    className={`p-4 rounded-lg border-2 text-lg font-medium transition-all duration-200 transform ${
                      userChoice === option
                        ? option === currentCard.word
                          ? 'border-green-500 bg-green-100 text-green-800 scale-105'
                          : 'border-red-500 bg-red-100 text-red-800 scale-105'
                        : userChoice
                        ? 'border-gray-300 bg-gray-50 text-gray-400'
                        : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {studyMode === 'typing' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">
                  Type the word that means:
                </h3>
                <div className="text-2xl font-bold text-primary mb-2">
                  {currentCard.definition}
                </div>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={typingAnswer}
                  onChange={(e) => setTypingAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTypingAnswer()}
                  placeholder="Type your answer..."
                  className="w-full max-w-md px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <button
                onClick={handleTypingAnswer}
                disabled={!typingAnswer.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Check Answer
              </button>

              {typingAnswer && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">
                    <strong>Correct answer:</strong> {currentCard.word}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudySession;
