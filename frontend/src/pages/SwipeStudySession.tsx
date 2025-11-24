import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import { requestCache } from '../utils/requestCache';
import AudioPlayer from '../components/AudioPlayer';

interface Lemma {
  id: number;
  lemma: string;
  language: string;
  pos: string;
  definition: string;
  morphology: Record<string, any>;
  global_frequency: number;
}

interface WordEntry {
  word: string;
  translation: string;
  definition: string;
  pos: string;
  context?: string;
  cefr?: string;
  frequency?: string;
  notes?: string;
  forms?: string[];
  synonyms?: string[];
  tip?: string;
}

interface VocabularyItem {
  lemma: Lemma;
  word_entry?: WordEntry;  // Rich word data matching demo structure
  frequency_in_book: number;
  difficulty_estimate: number;
  status: 'learned' | 'unknown';
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

interface SwipeSessionResponse {
  book_id: number;
  vocabulary: VocabularyItem[];
  total_count: number;
  page: number;
  limit: number;
  sort_by: string;
  filter_status: string | null;
}

interface PendingUpdate {
  lemmaId: number;
  status: 'learned' | 'unknown';
}

interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  opacity: number;
}

const MAX_SESSION_WORDS = 200;
const BULK_THRESHOLD = 6;
const BULK_MAX = 40;
const BULK_FLUSH_INTERVAL = 1500;
const RECENT_WORD_STORAGE_KEY = 'swipe_recent_word_ids';
const RECENT_WORD_HISTORY_LIMIT = 400;

const readRecentSwipeHistory = (): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_WORD_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(-RECENT_WORD_HISTORY_LIMIT);
  } catch (error) {
    console.warn('Failed to read swipe history', error);
    return [];
  }
};

const persistRecentSwipeHistory = (ids: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      RECENT_WORD_STORAGE_KEY,
      JSON.stringify(ids.slice(-RECENT_WORD_HISTORY_LIMIT))
    );
  } catch (error) {
    console.warn('Failed to persist swipe history', error);
  }
};

const prioritizeVocabularyForSession = (
  items: VocabularyItem[],
  seenIds: Set<number>
): VocabularyItem[] => {
  if (!seenIds.size) {
    return items;
  }
  const fresh: VocabularyItem[] = [];
  const repeats: VocabularyItem[] = [];
  items.forEach((item) => {
    if (seenIds.has(item.lemma.id)) {
      repeats.push(item);
    } else {
      fresh.push(item);
    }
  });
  return [...fresh, ...repeats];
};

const SwipeStudySession: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const pendingUpdatesRef = useRef<PendingUpdate[]>([]);
  const flushTimeoutRef = useRef<number | null>(null);
  const isFlushingRef = useRef(false);
  const recentWordIdsRef = useRef<Set<number>>(new Set());
  const sessionSeenIdsRef = useRef<Set<number>>(new Set());
  const prefetchOffsetRef = useRef<number>(30); // Track where we've loaded up to
  const isPrefetchingRef = useRef<boolean>(false);

  // Load vocabulary
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

  const resetCardPosition = useCallback(() => {
    setCardPosition({ x: 0, y: 0, rotation: 0, opacity: 1 });
  }, []);

  const fetchTranslationForWord = useCallback(async (word: string, language: string): Promise<string | null> => {
    // Fallback: Try to fetch translation from API if missing
    if (!token) return null;
    try {
      // This would call an API endpoint to get translation
      // For now, return null - the fallback chain in render will handle it
      return null;
    } catch (error) {
      console.error('Failed to fetch translation:', error);
      return null;
    }
  }, [token]);

  const loadVocabulary = useCallback(async (initialLoad: boolean = true) => {
    if (!bookId || !token) return;
    
    const INITIAL_BATCH_SIZE = 30; // Load first 30 words immediately
    const BATCH_SIZE = 50; // Load remaining in batches
    
    try {
      if (initialLoad) {
        setLoading(true);
        setError(null);
      }
      
      // Load initial batch immediately for fast first render (with caching)
      const initialEndpoint = `/vocab/book/${bookId}/swipe-session?limit=${INITIAL_BATCH_SIZE}&offset=0&filter_status=unknown`;
      const cacheKey = `swipe-${bookId}-${INITIAL_BATCH_SIZE}-0`;
      
      const initialData: SwipeSessionResponse = await requestCache.get(
        cacheKey,
        async () => {
          const initialResponse = await apiGet(initialEndpoint, token);
          if (!initialResponse.ok) {
            throw new Error('Failed to load vocabulary');
          }
          return await initialResponse.json();
        },
        10000 // Cache for 10 seconds
      );
      let vocabulary: VocabularyItem[] = initialData.vocabulary || [];

      // Sanitize initial batch
      const sanitizedWords = vocabulary.map((item) => ({
        ...item,
        lemma: {
          ...item.lemma,
          morphology: item.lemma.morphology || {}
        },
        example_sentences: item.example_sentences || [],
        collocations: item.collocations || [],
        word_entry: item.word_entry || (item.lemma.definition ? {
          word: item.lemma.lemma,
          translation: item.lemma.definition,
          definition: item.lemma.definition,
          pos: item.lemma.pos || '',
        } : undefined)
      }));

      const dedupedMap = new Map<number, VocabularyItem>();
      sanitizedWords.forEach((item) => {
        if (!dedupedMap.has(item.lemma.id)) {
          dedupedMap.set(item.lemma.id, item);
        }
      });

      const storedRecentIds = new Set(readRecentSwipeHistory());
      recentWordIdsRef.current = storedRecentIds;
      sessionSeenIdsRef.current.clear();

      const prioritizedWords = prioritizeVocabularyForSession(
        Array.from(dedupedMap.values()),
        storedRecentIds
      );

      // Set initial words immediately for fast render
      setWords(prioritizedWords);
      setCurrentIndex(0);
      resetCardPosition();
      setLoading(false); // Show UI immediately

      // Load remaining words in background
      const totalNeeded = MAX_SESSION_WORDS;
      const remainingNeeded = Math.max(0, totalNeeded - INITIAL_BATCH_SIZE);
      
      if (remainingNeeded > 0 && initialData.total_count > INITIAL_BATCH_SIZE) {
        // Load remaining words in batches
        const batches = Math.ceil(remainingNeeded / BATCH_SIZE);
        const allWords = [...prioritizedWords];
        
        for (let i = 0; i < batches; i++) {
          const offset = INITIAL_BATCH_SIZE + (i * BATCH_SIZE);
          const batchLimit = Math.min(BATCH_SIZE, remainingNeeded - (i * BATCH_SIZE));
          
          try {
            const batchEndpoint = `/vocab/book/${bookId}/swipe-session?limit=${batchLimit}&offset=${offset}&filter_status=unknown`;
            const batchCacheKey = `swipe-${bookId}-${batchLimit}-${offset}`;
            
            const batchData: SwipeSessionResponse = await requestCache.get(
              batchCacheKey,
              async () => {
                const batchResponse = await apiGet(batchEndpoint, token);
                if (!batchResponse.ok) {
                  throw new Error('Failed to load vocabulary batch');
                }
                return await batchResponse.json();
              },
              10000
            );
            
            if (batchData) {
              const batchWords = (batchData.vocabulary || []).map((item) => ({
                ...item,
                lemma: {
                  ...item.lemma,
                  morphology: item.lemma.morphology || {}
                },
                example_sentences: item.example_sentences || [],
                collocations: item.collocations || [],
                word_entry: item.word_entry || (item.lemma.definition ? {
                  word: item.lemma.lemma,
                  translation: item.lemma.definition,
                  definition: item.lemma.definition,
                  pos: item.lemma.pos || '',
                } : undefined)
              }));

              // Dedupe and add to existing words
              batchWords.forEach((item) => {
                if (!dedupedMap.has(item.lemma.id)) {
                  dedupedMap.set(item.lemma.id, item);
                  allWords.push(item);
                }
              });
            }
          } catch (batchError) {
            console.warn('Failed to load vocabulary batch:', batchError);
            // Continue with what we have
          }
        }

        // Update with all loaded words, re-prioritize
        const finalPrioritized = prioritizeVocabularyForSession(
          allWords,
          storedRecentIds
        ).slice(0, MAX_SESSION_WORDS);

        setWords(finalPrioritized);
        prefetchOffsetRef.current = finalPrioritized.length;
      } else {
        prefetchOffsetRef.current = prioritizedWords.length;
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      setError('Failed to load vocabulary. Please check if the book has been processed.');
      setLoading(false);
    }
  }, [bookId, token, resetCardPosition]);

  const loadLists = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiGet('/vocab-lists/', token);
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      }
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  }, [token]);

  const flushPendingUpdates = useCallback(async (force: boolean = false) => {
    if (!token) return;
    const pendingCount = pendingUpdatesRef.current.length;
    if (!force && pendingCount < BULK_THRESHOLD) {
      if (!flushTimeoutRef.current) {
        flushTimeoutRef.current = window.setTimeout(() => {
          flushTimeoutRef.current = null;
          flushPendingUpdates(true);
        }, BULK_FLUSH_INTERVAL);
      }
      return;
    }

    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    if (isFlushingRef.current) {
      return;
    }

    const batch = pendingUpdatesRef.current.splice(0, BULK_MAX);
    if (!batch.length) {
      return;
    }

    isFlushingRef.current = true;

    const dedupedMap = new Map<number, 'learned' | 'unknown'>();
    batch.forEach(({ lemmaId, status }) => dedupedMap.set(lemmaId, status));

    const payload = Array.from(dedupedMap.entries()).map(([lemmaId, status]) => ({
      lemma_id: lemmaId,
      status
    }));

    try {
      await apiPost('/vocab/status/bulk', { updates: payload }, token);
    } catch (error) {
      console.error('Failed to flush status updates:', error);
      const retryItems = payload.map(({ lemma_id, status }) => ({ lemmaId: lemma_id, status }));
      pendingUpdatesRef.current.unshift(...retryItems);
    } finally {
      isFlushingRef.current = false;
      if (pendingUpdatesRef.current.length) {
        if (pendingUpdatesRef.current.length >= BULK_THRESHOLD) {
          flushPendingUpdates(true);
        } else if (!flushTimeoutRef.current) {
          flushTimeoutRef.current = window.setTimeout(() => {
            flushTimeoutRef.current = null;
            flushPendingUpdates(true);
          }, BULK_FLUSH_INTERVAL);
        }
      }
    }
  }, [token]);

  const queueStatusUpdate = useCallback((lemmaId: number, status: 'learned' | 'unknown') => {
    pendingUpdatesRef.current.push({ lemmaId, status });

    if (pendingUpdatesRef.current.length >= BULK_THRESHOLD) {
      flushPendingUpdates(true);
    } else {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flushTimeoutRef.current = window.setTimeout(() => {
        flushTimeoutRef.current = null;
        flushPendingUpdates(true);
      }, BULK_FLUSH_INTERVAL);
    }
  }, [flushPendingUpdates]);

  useEffect(() => {
    return () => {
      flushPendingUpdates(true);
    };
  }, [flushPendingUpdates]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingUpdates(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushPendingUpdates]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushPendingUpdates(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushPendingUpdates]);

  useEffect(() => {
    if (bookId && token) {
      loadVocabulary();
      loadLists();
    }
  }, [bookId, token, loadVocabulary, loadLists]);

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
    // Return to center
    else {
      resetCardPosition();
    }
    
    // Reset drag delta
    currentDragDelta.current = { x: 0, y: 0 };
  };

  // Prefetch next batch when user is near the end
  const prefetchNextBatch = useCallback(async () => {
    if (!bookId || !token || isPrefetchingRef.current) return;
    
    const PREFETCH_THRESHOLD = 10; // Prefetch when 10 words remaining
    const remainingWords = words.length - currentIndex;
    
    if (remainingWords <= PREFETCH_THRESHOLD && words.length < MAX_SESSION_WORDS) {
      isPrefetchingRef.current = true;
      const BATCH_SIZE = 50;
      const offset = prefetchOffsetRef.current;
      
      try {
        const endpoint = `/vocab/book/${bookId}/swipe-session?limit=${BATCH_SIZE}&offset=${offset}&filter_status=unknown`;
        const cacheKey = `swipe-${bookId}-${BATCH_SIZE}-${offset}`;
        
        const data: SwipeSessionResponse = await requestCache.get(
          cacheKey,
          async () => {
            const response = await apiGet(endpoint, token);
            if (!response.ok) {
              throw new Error('Failed to prefetch vocabulary');
            }
            return await response.json();
          },
          10000
        );
        
        if (data) {
          const newWords = (data.vocabulary || []).map((item) => ({
            ...item,
            lemma: {
              ...item.lemma,
              morphology: item.lemma.morphology || {}
            },
            example_sentences: item.example_sentences || [],
            collocations: item.collocations || [],
            word_entry: item.word_entry || (item.lemma.definition ? {
              word: item.lemma.lemma,
              translation: item.lemma.definition,
              definition: item.lemma.definition,
              pos: item.lemma.pos || '',
            } : undefined)
          }));

          setWords((prevWords) => {
            const existingIds = new Set(prevWords.map(w => w.lemma.id));
            const uniqueNewWords = newWords.filter(w => !existingIds.has(w.lemma.id));
            if (uniqueNewWords.length > 0) {
              prefetchOffsetRef.current += uniqueNewWords.length;
              return [...prevWords, ...uniqueNewWords].slice(0, MAX_SESSION_WORDS);
            }
            return prevWords;
          });
        }
      } catch (error) {
        console.warn('Failed to prefetch vocabulary:', error);
      } finally {
        isPrefetchingRef.current = false;
      }
    }
  }, [bookId, token, words, currentIndex]);

  const handleSwipe = async (status: 'learned' | 'unknown') => {
    if (currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    sessionSeenIdsRef.current.add(currentWord.lemma.id);
    const existingHistory = Array.from(recentWordIdsRef.current).filter(
      (id) => id !== currentWord.lemma.id
    );
    existingHistory.push(currentWord.lemma.id);
    const trimmedHistory = existingHistory.slice(-RECENT_WORD_HISTORY_LIMIT);
    recentWordIdsRef.current = new Set(trimmedHistory);
    persistRecentSwipeHistory(trimmedHistory);
    
    queueStatusUpdate(currentWord.lemma.id, status);
    
    // If marked as learned, remove it from the words array immediately
    if (status === 'learned') {
      setWords((prevWords) => {
        const filtered = prevWords.filter((w) => w.lemma.id !== currentWord.lemma.id);
        // If no words left, session is complete
        if (filtered.length === 0) {
          setTimeout(async () => {
            await flushPendingUpdates(true);
            alert('Study session complete! 🎉');
            navigate('/books');
          }, 100);
        } else {
          // Adjust currentIndex if it's now out of bounds (e.g., we removed the last word)
          setCurrentIndex((prevIndex) => {
            if (prevIndex >= filtered.length) {
              return Math.max(0, filtered.length - 1);
            }
            return prevIndex;
          });
        }
        return filtered;
      });
      // Don't increment index - the array shifts, so the next word is now at currentIndex
      resetCardPosition();
      // Prefetch if needed
      setTimeout(() => prefetchNextBatch(), 100);
      return;
    }
    
    // For unknown status, just move to next word
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetCardPosition();
      // Prefetch if approaching end
      setTimeout(() => prefetchNextBatch(), 100);
    } else {
      await flushPendingUpdates(true);
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
            This book doesn't have any vocabulary words yet. The book may still be processing, or vocabulary extraction may have failed.
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
            <div className="p-6 pb-24">
              {/* Title: Definition & pronunciation */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-gray-700">Definition & pronunciation</h3>
                {/* Audio Button - Top Right (small blue square with speaker icon) */}
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors">
                  <AudioPlayer 
                    text={currentWord.lemma.lemma} 
                    language={currentWord.lemma.language}
                  />
                </div>
              </div>

              {/* Word with POS, Gender, and CEFR badges */}
              <div className="mb-5">
                  <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-3 lowercase tracking-tight leading-tight">
                    {currentWord.lemma.lemma}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const pos = currentWord.word_entry?.pos?.toUpperCase() || currentWord.lemma.pos?.toUpperCase() || '';
                      const morphology = currentWord.lemma?.morphology || {};
                      const gender = morphology.gender;
                      
                      // Combine POS and gender into one badge if both exist
                      let badgeText = pos;
                      if (gender && pos) {
                        badgeText = `${pos} • ${gender}`;
                      } else if (gender && !pos) {
                        badgeText = gender;
                      } else if (!pos) {
                        badgeText = 'NOUN';
                      }
                      
                      return (
                        <span className="px-4 py-1.5 bg-purple-500 text-white rounded-full text-xs font-medium">
                          {badgeText}
                        </span>
                      );
                    })()}
                    {currentWord.word_entry?.cefr && (
                      <span className="px-4 py-1.5 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">
                        CEFR {currentWord.word_entry.cefr}
                      </span>
                    )}
                  </div>
                </div>

              {/* English Translation */}
              <div className="mb-4">
                <p className="text-base text-gray-900 font-normal">
                  {(() => {
                    // Helper function to clean translation text (remove plural, gender prefixes, etc.)
                    const cleanTranslation = (text: string): string => {
                      if (!text) return '';
                      // Split by newlines and filter out lines starting with unwanted prefixes
                      const lines = text.split('\n').filter(line => {
                        const trimmed = line.trim();
                        return trimmed && 
                          !trimmed.toLowerCase().startsWith('plural:') &&
                          !trimmed.toLowerCase().startsWith('feminine:') &&
                          !trimmed.toLowerCase().startsWith('masculine:') &&
                          !trimmed.toLowerCase().startsWith('root:') &&
                          !trimmed.toLowerCase().startsWith('prefix:') &&
                          !trimmed.toLowerCase().startsWith('suffix:');
                      });
                      // Join and clean up
                      return lines.join(' ').trim();
                    };

                    const translation = 
                      cleanTranslation(currentWord.word_entry?.translation || '') ||
                      cleanTranslation(currentWord.word_entry?.definition || '') ||
                      cleanTranslation(currentWord.lemma.definition || '') ||
                      currentWord.lemma.lemma;
                    return translation;
                  })()}
                </p>
              </div>

              {/* Example phrase with yellow bar */}
              {(currentWord.word_entry?.context || (currentWord.example_sentences && currentWord.example_sentences.length > 0)) && (
                <div className="flex gap-3 mb-5">
                  <div className="w-1 h-auto bg-yellow-400 rounded-full flex-shrink-0 self-stretch"></div>
                  <p className="text-sm text-gray-600 italic leading-relaxed flex-1">
                    {currentWord.word_entry?.context || currentWord.example_sentences[0]}
                  </p>
                </div>
              )}

              {/* Info buttons: Frequency, Forms, Synonyms */}
              <div className="flex flex-wrap gap-2 mb-5">
                {currentWord.word_entry?.frequency && (
                  <div className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium whitespace-nowrap">
                    Frequency: {currentWord.word_entry.frequency}
                  </div>
                )}
                {currentWord.word_entry?.forms && currentWord.word_entry.forms.length > 0 && (
                  <div className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
                    Forms: {currentWord.word_entry.forms.slice(0, 5).join(', ')}
                    {currentWord.word_entry.forms.length > 5 && ` +${currentWord.word_entry.forms.length - 5} more`}
                  </div>
                )}
                {currentWord.word_entry?.synonyms && currentWord.word_entry.synonyms.length > 0 && (
                  <div className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
                    Related: {currentWord.word_entry.synonyms.join(', ')}
                  </div>
                )}
                {/* Show grammar tags from morphology (reflexive, conjugation type, etc.) - excluding gender and number */}
                {(() => {
                  const morphology = currentWord.lemma?.morphology || {};
                  const grammarTags = [];
                  
                  // Check for reflexive
                  if (morphology.reflexive || morphology.conjugation_type === 'reflexive' || 
                      currentWord.lemma.lemma?.endsWith('si') || currentWord.lemma.lemma?.endsWith('rsi')) {
                    grammarTags.push('reflexive');
                  }
                  
                  // Check for conjugation type
                  if (morphology.conjugation) {
                    grammarTags.push(morphology.conjugation);
                  }
                  
                  // Check for other grammar features (excluding gender and number which are shown with POS)
                  if (morphology.type) {
                    grammarTags.push(morphology.type);
                  }
                  
                  // Explicitly exclude gender and number - they're shown with POS badge above
                  
                  if (grammarTags.length > 0) {
                    return (
                      <div className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                        {grammarTags.join(' • ')}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Tip box - Light blue background */}
              {currentWord.word_entry?.tip && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {currentWord.word_entry.tip}
                  </p>
                </div>
              )}
            </div>

            {/* Add to List Button - Circular gradient button at bottom */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowListDropdown(!showListDropdown);
                  }}
                  className="w-16 h-16 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-full shadow-xl flex items-center justify-center text-white text-2xl font-light hover:scale-110 transition-transform"
                  aria-label="Add to list"
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

