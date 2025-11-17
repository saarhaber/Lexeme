import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost, apiPut } from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';

import { API_BASE_URL } from '../config/api';

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
  status: 'learned' | 'unknown' | 'ignored';
  example_sentences: string[];
  collocations: string[];
}

interface VocabList {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  word_count: number;
  created_at: string;
}

interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  opacity: number;
}

const SwipeStudySession: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [cardPosition, setCardPosition] = useState<CardPosition>({ x: 0, y: 0, rotation: 0, opacity: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [lists, setLists] = useState<VocabList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [addSuccessMessage, setAddSuccessMessage] = useState('');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentDragDelta = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Load vocabulary
  useEffect(() => {
    if (bookId && token) {
      loadVocabulary();
      loadLists();
    }
  }, [bookId, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowListDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadVocabulary = async () => {
    if (!bookId || !token) return;
    try {
      setLoading(true);
      const MAX_SESSION_WORDS = 200;
      const limit = 100; // API maximum
      const buildEndpoint = (pageNumber: number) => 
        `/vocab/book/${bookId}?page=${pageNumber}&limit=${limit}&sort_by=frequency&filter_status=unknown`;
      const fetchPage = async (pageNumber: number) => {
        const response = await apiGet(buildEndpoint(pageNumber), token);
        if (!response.ok) {
          throw new Error('Failed to load vocabulary');
        }
        return response.json();
      };

      const firstPage = await fetchPage(1);
      let allVocabulary: VocabularyItem[] = firstPage.vocabulary || [];
      const totalCount = firstPage.total_count || allVocabulary.length;
      const desiredCount = Math.min(totalCount, MAX_SESSION_WORDS);
      const effectiveCount = desiredCount > 0 ? desiredCount : allVocabulary.length;
      const pagesNeeded = Math.max(1, Math.ceil(Math.min(effectiveCount || limit, MAX_SESSION_WORDS) / limit));

      if (pagesNeeded > 1) {
        const remainingPages = Array.from({ length: pagesNeeded - 1 }, (_, idx) => idx + 2);
        const pageData = await Promise.all(remainingPages.map(page => fetchPage(page)));
        pageData.forEach(page => {
          allVocabulary = allVocabulary.concat(page.vocabulary || []);
        });
      }

      const targetCount = effectiveCount || 0;
      const studyWords = allVocabulary
        .filter((item: VocabularyItem) => item.status !== 'ignored')
        .slice(0, targetCount)
        .sort(() => Math.random() - 0.5);

      setWords(studyWords);
      setCurrentIndex(0);
      setShowTranslation(false);
      resetCardPosition();
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      setError('Failed to load vocabulary. Please check if the book has been processed.');
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      const response = await apiGet('/vocab-lists/', token);
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      }
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  const resetCardPosition = () => {
    setCardPosition({ x: 0, y: 0, rotation: 0, opacity: 1 });
    setShowTranslation(false);
  };

  // Touch/Mouse event handlers
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    hasDragged.current = false;
    currentDragDelta.current = { x: 0, y: 0 };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    // Mark as dragged if movement is significant
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDragged.current = true;
    }
    
    // Store current delta in ref for handleEnd
    currentDragDelta.current = { x: deltaX, y: deltaY };
    
    // Calculate rotation based on horizontal movement
    const rotation = deltaX * 0.1;
    
    // Calculate opacity based on distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const opacity = Math.max(0.5, 1 - distance / 500);
    
    setCardPosition({
      x: deltaX,
      y: deltaY,
      rotation,
      opacity
    });

    // Show translation on swipe up
    if (deltaY < -50) {
      setShowTranslation(true);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const { x, y } = currentDragDelta.current;
    const threshold = 100;
    
    // Swipe right (learned)
    if (x > threshold) {
      handleSwipe('learned');
    }
    // Swipe left (unknown)
    else if (x < -threshold) {
      handleSwipe('unknown');
    }
    // Swipe up (show translation) - already handled in handleMove
    else if (y < -threshold) {
      setShowTranslation(true);
      resetCardPosition();
    }
    // Return to center
    else {
      resetCardPosition();
    }
    
    // Reset drag delta
    currentDragDelta.current = { x: 0, y: 0 };
  };

  const handleSwipe = async (status: 'learned' | 'unknown') => {
    if (currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    
    // Update word status
    try {
      await apiPut(`/vocab/status/${currentWord.lemma.id}`, { status }, token);
    } catch (error) {
      console.error('Failed to update word status:', error);
    }
    
    // Move to next word
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetCardPosition();
    } else {
      // Session complete
      alert('Study session complete! 🎉');
      navigate('/books');
    }
  };

  const handleAddToList = async (listId: number) => {
    if (currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    
    try {
      const response = await apiPost(
        `/vocab-lists/${listId}/words`,
        { lemma_id: currentWord.lemma.id },
        token
      );
      
      if (response.ok) {
        const list = lists.find(l => l.id === listId);
        setAddSuccessMessage(`Added to "${list?.name}"`);
        setTimeout(() => {
          setAddSuccessMessage('');
          setShowListDropdown(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to add word to list:', error);
    }
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;
    
    try {
      const response = await apiPost(
        '/vocab-lists/',
        {
          name: newListName,
          description: newListDesc,
          is_public: false
        },
        token
      );
      
      if (response.ok) {
        const newList = await response.json();
        setLists([...lists, newList]);
        
        // Add current word to the new list
        await handleAddToList(newList.id);
        
        setNewListName('');
        setNewListDesc('');
        setShowNewListModal(false);
      }
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX, e.clientY);
    }
  };

  const onMouseUp = () => {
    handleEnd();
  };

  // Click to reveal translation
  const handleCardClick = (e: React.MouseEvent) => {
    // Only handle click if we didn't drag
    if (!hasDragged.current) {
      e.stopPropagation();
      setShowTranslation(!showTranslation);
    }
    // Reset drag flag after a short delay
    setTimeout(() => {
      hasDragged.current = false;
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading your study session...</p>
          <p className="mt-2 text-sm text-gray-500">Fetching vocabulary from book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Vocabulary</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setError(null);
                loadVocabulary();
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate(`/book/${bookId}/vocabulary`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              View Vocabulary List
            </button>
            <button
              onClick={() => navigate('/books')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
            >
              Back to Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Words Available</h2>
          <p className="text-gray-600 mb-6">
            {words.length === 0 
              ? "This book doesn't have any vocabulary words yet. The book may still be processing, or vocabulary extraction may have failed."
              : "All words in this book are marked as ignored."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/book/${bookId}/vocabulary`)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              View Vocabulary List
            </button>
            <button
              onClick={() => navigate('/books')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
            >
              Back to Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentIndex >= words.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Complete!</h2>
          <p className="text-gray-600 mb-6">
            You've reviewed all {words.length} words. Great job!
          </p>
          <button
            onClick={() => navigate('/books')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Back to Books
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/books')}
              className="text-gray-600 hover:text-gray-900 text-xl"
            >
              ←
            </button>
            <h1 className="text-lg font-bold text-gray-900">Swipe Study</h1>
            <div className="w-6"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600 font-medium min-w-[60px] text-right">
              {currentIndex + 1}/{words.length}
            </span>
          </div>
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-32 px-4">
        <div
          ref={cardRef}
          className="relative w-full max-w-sm"
          style={{
            perspective: '1000px',
          }}
        >
          {/* Card */}
          <div
            className={`relative bg-white rounded-3xl shadow-2xl transition-all duration-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              transform: `translate(${cardPosition.x}px, ${cardPosition.y}px) rotate(${cardPosition.rotation}deg)`,
              opacity: cardPosition.opacity,
              touchAction: 'none',
              userSelect: 'none',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onClick={handleCardClick}
          >
            {/* Swipe indicators */}
            {cardPosition.x > 50 && (
              <div className="absolute inset-0 bg-green-500/20 rounded-3xl flex items-center justify-center z-10">
                <div className="text-6xl font-bold text-green-600">✓</div>
              </div>
            )}
            {cardPosition.x < -50 && (
              <div className="absolute inset-0 bg-orange-500/20 rounded-3xl flex items-center justify-center z-10">
                <div className="text-6xl font-bold text-orange-600">?</div>
              </div>
            )}

            {/* Card Content */}
            <div className="p-8 pb-20">
              {/* Audio Button */}
              <div className="flex justify-end mb-4">
                <AudioPlayer text={currentWord.lemma.lemma} language={currentWord.lemma.language} />
              </div>

              {/* Word */}
              <div className="text-center mb-6">
                <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-3">
                  {currentWord.lemma.lemma}
                </h2>
                <div className="flex items-center justify-center gap-3">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {currentWord.lemma.pos}
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentWord.frequency_in_book}x
                  </span>
                </div>
              </div>

              {/* Translation (revealed on swipe up or click) */}
              {showTranslation && (
                <div className="mt-6 pt-6 border-t border-gray-200 animate-fadeIn">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Translation</h3>
                    <p className="text-xl text-gray-800 leading-relaxed">
                      {currentWord.lemma.definition || 'No definition available'}
                    </p>
                  </div>

                  {/* Grammar/Morphology */}
                  {currentWord.lemma.morphology && Object.keys(currentWord.lemma.morphology).length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Grammar</h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(currentWord.lemma.morphology).slice(0, 3).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  {currentWord.example_sentences && currentWord.example_sentences.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Examples</h3>
                      {currentWord.example_sentences.slice(0, 2).map((example, idx) => (
                        <p key={idx} className="text-sm text-gray-600 italic mb-2">
                          "{example}"
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hint to swipe up */}
              {!showTranslation && (
                <div className="text-center mt-6">
                  <p className="text-sm text-gray-400 animate-bounce">↑ Swipe up or tap to reveal</p>
                </div>
              )}
            </div>

            {/* Add to List Button */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowListDropdown(!showListDropdown);
                  }}
                  className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white text-xl hover:scale-110 transition-transform"
                >
                  +
                </button>

                {/* Dropdown */}
                {showListDropdown && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-30">
                    <div className="max-h-64 overflow-y-auto">
                      {lists.map((list) => (
                        <button
                          key={list.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToList(list.id);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{list.name}</div>
                          {list.description && (
                            <div className="text-xs text-gray-500 mt-1">{list.description}</div>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowListDropdown(false);
                          setShowNewListModal(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors text-purple-600 font-medium"
                      >
                        + Create New List
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (for desktop/fallback) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => handleSwipe('unknown')}
                className="w-16 h-16 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform"
                aria-label="Mark as Unknown"
              >
                ?
              </button>
            <button
                onClick={() => handleSwipe('learned')}
              className="w-16 h-16 bg-green-500 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform"
                aria-label="Mark as Learned"
            >
              ✓
            </button>
          </div>
          <div className="flex justify-center gap-8 mt-2">
            <span className="text-xs text-gray-500">Swipe left</span>
            <span className="text-xs text-gray-500">Swipe right</span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {addSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg animate-fadeIn">
          {addSuccessMessage}
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New List</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateNewList}
                  disabled={!newListName.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create & Add
                </button>
                <button
                  onClick={() => {
                    setShowNewListModal(false);
                    setNewListName('');
                    setNewListDesc('');
                  }}
                  className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SwipeStudySession;

