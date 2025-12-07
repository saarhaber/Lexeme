import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPut } from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import SearchBar from '../components/SearchBar';
import FilterDropdown, { FilterOption } from '../components/FilterDropdown';
import SortSelector, { SortOption } from '../components/SortSelector';
import WordIntelligenceModal from '../components/WordIntelligenceModal';

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

interface VocabularyResponse {
  book_id: number;
  vocabulary: VocabularyItem[];
  total_count: number;
  page: number;
  limit: number;
  sort_by: string;
  filter_status: string | null;
}

const VocabularyExplorer: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const normalizeStatusParam = (status: string | null) => {
    if (!status) return '';
    if (status === 'known') return 'learned';
    if (status === 'learning') return 'unknown';
    return status;
  };
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'chronological');
  const [filterStatus, setFilterStatus] = useState<string>(normalizeStatusParam(searchParams.get('status')));
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPolling, setIsPolling] = useState(false);
  const [lastKnownCount, setLastKnownCount] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`favorites_${bookId}`);
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    }
  }, [bookId]);

  const toggleFavorite = useCallback((lemmaId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(lemmaId)) {
        newFavorites.delete(lemmaId);
      } else {
        newFavorites.add(lemmaId);
      }
      localStorage.setItem(`favorites_${bookId}`, JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  }, [bookId]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterStatus) params.set('status', filterStatus);
    if (sortBy !== 'chronological') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [searchQuery, filterStatus, sortBy, setSearchParams]);

  const fetchVocabulary = async (append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      const statusQuery = filterStatus && filterStatus !== 'favorites'
        ? `&filter_status=${filterStatus}`
        : '';
      
      // For initial load, use smaller page size for faster first render
      const pageSize = append ? 100 : 50;
      const response = await apiGet(
        `/vocab/book/${bookId}?sort_by=${sortBy}&page=${currentPage}&limit=${pageSize}${statusQuery}&include_word_entry=false`,
        token
      );
      
      if (!response.ok) {
        throw new Error('Failed to load vocabulary');
      }
      
      const data: VocabularyResponse = await response.json();
      
      if (append && sortBy === 'chronological') {
        // Append new words that we haven't seen yet
        // In chronological mode (descending ID), new words appear first
        setVocabulary(prev => {
          const existingIds = new Set(prev.map(v => v.lemma.id));
          const newWords = data.vocabulary.filter(v => !existingIds.has(v.lemma.id));
          // Prepend new words since they appear first in chronological order
          return [...newWords, ...prev];
        });
      } else {
        // For initial load, show first batch immediately, then load rest in background
        if (!append && data.vocabulary.length > 0) {
          setVocabulary(data.vocabulary);
          setLoading(false); // Show first batch immediately
          
          // Load remaining items in background if there are more
          if (data.total_count > pageSize && currentPage === 1) {
            setTimeout(async () => {
              try {
                const remainingResponse = await apiGet(
                  `/vocab/book/${bookId}?sort_by=${sortBy}&page=1&limit=100${statusQuery}&include_word_entry=false`,
                  token
                );
                if (remainingResponse.ok) {
                  const remainingData: VocabularyResponse = await remainingResponse.json();
                  setVocabulary(remainingData.vocabulary);
                }
              } catch (err) {
                console.warn('Failed to load remaining vocabulary:', err);
              }
            }, 100);
          }
        } else {
          setVocabulary(data.vocabulary);
          setLoading(false);
        }
      }
      
      setLastKnownCount(data.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const checkVocabularyProgress = async () => {
    try {
      const response = await apiGet(`/vocab/book/${bookId}/count`, token);
      if (response.ok) {
        const data = await response.json();
        const currentCount = data.total_count;
        
        // If count increased, fetch new vocabulary
        if (currentCount > lastKnownCount && sortBy === 'chronological') {
          // Fetch the first page to get newest words (chronological sort shows newest first)
          // Limit to reasonable size to avoid loading too much at once
          const limit = Math.min(100, currentCount - lastKnownCount + 20); // Fetch a bit more to ensure we get all new words
          const vocabResponse = await apiGet(
            `/vocab/book/${bookId}?sort_by=chronological&page=1&limit=${limit}&include_word_entry=false`,
            token
          );
          
          if (vocabResponse.ok) {
            const vocabData: VocabularyResponse = await vocabResponse.json();
            
            // Append new words that we haven't seen yet
            setVocabulary(prev => {
              const existingIds = new Set(prev.map(v => v.lemma.id));
              const newWords = vocabData.vocabulary.filter(v => !existingIds.has(v.lemma.id));
              // In chronological mode, new words appear first, so prepend them
              return [...newWords, ...prev];
            });
            
            setLastKnownCount(currentCount);
          }
        }
        
        // Check if processing is complete
        const statusResponse = await apiGet(`/upload/status/${bookId}`, token);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.status === 'completed') {
            setProcessingComplete(true);
            setIsPolling(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to check vocabulary progress:', err);
    }
  };

  useEffect(() => {
    if (bookId && token) {
      fetchVocabulary();
      
      // Check if processing is still ongoing
      const checkStatus = async () => {
        try {
          const response = await apiGet(`/upload/status/${bookId}`, token);
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'processing') {
              setIsPolling(true);
              setProcessingComplete(false);
            } else {
              setProcessingComplete(true);
              setIsPolling(false);
            }
          }
        } catch (err) {
          console.error('Failed to check processing status:', err);
        }
      };
      checkStatus();
    }
  }, [bookId, sortBy, currentPage, filterStatus, token]);

  // Poll for new vocabulary when in chronological mode and processing is ongoing
  useEffect(() => {
    if (!isPolling || !bookId || !token || sortBy !== 'chronological' || processingComplete) {
      return;
    }

    const pollInterval = setInterval(() => {
      checkVocabularyProgress();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, bookId, token, sortBy, lastKnownCount, processingComplete]);

  const updateWordStatus = async (lemmaId: number, newStatus: string) => {
    try {
      await apiPut(
        `/vocab/status/${lemmaId}`,
        { status: newStatus },
        token
      );
      
      // Update local state
      setVocabulary(prev => 
        prev.map(item => 
          item.lemma.id === lemmaId 
            ? { ...item, status: newStatus as any }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to update word status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'learned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unknown':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading vocabulary...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
        {/* Swipe Study Banner */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-4xl md:text-5xl" aria-hidden="true">💫</div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Swipe Mode is the way to study</h2>
              <p className="text-gray-700 text-sm md:text-base">
                Review vocabulary with fast left/right gestures, reveal definitions with a swipe up, and keep your learning flow moving.
              </p>
            </div>
            <button
              onClick={() => navigate(`/book/${bookId}/study/swipe`)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-semibold shadow-md hover:shadow-lg"
            >
              Start Swipe Study
            </button>
          </div>
        </div>

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Vocabulary Explorer</h1>
          <p className="text-gray-600">Browse and manage vocabulary from your book</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <SearchBar
              placeholder="Search vocabulary..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            />
          </div>
          <SortSelector
            label="Sort by"
            options={[
              { value: 'chronological', label: 'Chronological (as processed)' },
              { value: 'frequency', label: 'Frequency' },
              { value: 'alphabetical', label: 'Alphabetical' }
            ]}
            value={sortBy}
            onChange={async (newSort) => {
              setSortBy(newSort);
              setCurrentPage(1);
              
              // Handle polling based on sort mode
              if (newSort !== 'chronological') {
                setIsPolling(false);
              } else {
                // If switching to chronological, check if processing is still ongoing
                try {
                  const response = await apiGet(`/upload/status/${bookId}`, token);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'processing') {
                      setIsPolling(true);
                      setProcessingComplete(false);
                    }
                  }
                } catch (err) {
                  console.error('Failed to check processing status:', err);
                }
              }
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <FilterDropdown
            label="Filter by status"
            options={[
              { value: 'unknown', label: 'Unknown' },
                { value: 'learned', label: 'Learned' },
              { value: 'favorites', label: '⭐ Favorites' }
            ]}
            value={filterStatus}
            onChange={setFilterStatus}
            showClear={!!filterStatus}
            onClear={() => setFilterStatus('')}
          />
          {(searchQuery || filterStatus || sortBy !== 'chronological') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setSortBy('chronological');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
          <div className="ml-auto text-sm text-gray-600">
            {vocabulary.filter(item => 
              !searchQuery || 
              item.lemma.lemma.toLowerCase().includes(searchQuery.toLowerCase())
            ).filter(item => 
              !filterStatus || item.status === filterStatus
            ).length} words shown
          </div>
        </div>
      </div>

      {/* Processing Status Banner */}
      {isPolling && !processingComplete && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Processing vocabulary... ({vocabulary.length} words loaded so far)
              </p>
              <p className="text-xs text-blue-700 mt-1">
                New words are being added as they're processed. You can start exploring now!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vocabulary List */}
      <div className="bg-gray-100 rounded-lg p-6">
        <div>
          {vocabulary.length === 0 ? (
            <div className="text-center py-12">
              {isPolling && !processingComplete ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Processing vocabulary...</h3>
                  <p className="text-gray-500">
                    Words will appear here as they are processed. Please wait a moment.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">📖</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No vocabulary found</h3>
                  <p className="text-gray-500">
                    {processingComplete 
                      ? "No vocabulary was extracted from this book. Try uploading again or check if the book contains text."
                      : "Upload and process a book to see vocabulary here, or the vocabulary is still being processed."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {vocabulary
                .filter(item => 
                  !searchQuery || 
                  item.lemma.lemma.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .filter(item => {
                  if (!filterStatus) return true;
                  if (filterStatus === 'favorites') {
                    return favorites.has(item.lemma.id);
                  }
                  return item.status === filterStatus;
                })
                .map((item) => (
                <VocabularyItem
                  key={item.lemma.id}
                  item={item}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onUpdateStatus={updateWordStatus}
                  onOpenDetail={() => setSelectedWord(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Word Intelligence Modal */}
      {selectedWord && (
        <WordIntelligenceModal
          item={selectedWord}
          isOpen={!!selectedWord}
          onClose={() => setSelectedWord(null)}
          onAddToQueue={() => {
            // TODO: Implement add to queue functionality
            console.log('Add to queue:', selectedWord.lemma.lemma);
          }}
        />
      )}

      {/* Pagination */}
      {vocabulary.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={vocabulary.length < 50}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized vocabulary item component for performance
const VocabularyItem = React.memo<{
  item: VocabularyItem;
  favorites: Set<number>;
  onToggleFavorite: (lemmaId: number) => void;
  onUpdateStatus: (lemmaId: number, newStatus: string) => void;
  onOpenDetail: () => void;
}>(({ item, favorites, onToggleFavorite, onUpdateStatus, onOpenDetail }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
        case 'learned':
        return 'bg-green-100 text-green-800 border-green-200';
        case 'unknown':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const morphology = item.lemma.morphology || {};
  const wordForms = Array.isArray((morphology as any)?.forms) ? (morphology as any).forms : null;
  
  // Extract type, conjugation, and form for pills
  const type = morphology?.type || morphology?.word_type || '';
  const conjugation = morphology?.conjugation || '';
  const form = morphology?.form || '';
  
  // Helper function to clean translation text (remove plural, gender prefixes, etc.)
  const cleanTranslation = (text: string | null): string => {
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
    // Join and clean up - take first line only for card view
    const firstLine = lines[0]?.trim() || '';
    const withoutQuotes = firstLine.replace(/^[“"']+|[”"']+$/g, '');
    const withoutTrailingPunctuation = withoutQuotes.replace(/[.,;:]+$/, '');
    if (
      withoutTrailingPunctuation &&
      withoutTrailingPunctuation === withoutTrailingPunctuation.toUpperCase() &&
      withoutTrailingPunctuation.length > 2 &&
      !withoutTrailingPunctuation.includes(' ')
    ) {
      return withoutTrailingPunctuation.toLowerCase();
    }
    return withoutTrailingPunctuation;
  };

  const pos = item.lemma.pos || 'NOUN';
  const gender = morphology?.gender;
  // Format: "NOUN • masculine" if both exist, or just POS
  const posDisplay = gender ? `${pos} • ${gender}` : pos;

  return (
    <div 
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 relative cursor-pointer hover:shadow-md transition-shadow"
      onClick={onOpenDetail}
    >
      {/* Top section with star, word, badges, and unknown button */}
      <div className="flex items-start gap-3 mb-3 pr-20">
        {/* Star icon - yellow outlined when not favorited, filled when favorited */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.lemma.id);
          }}
          className="flex-shrink-0 mt-0.5 focus:outline-none"
          title={favorites.has(item.lemma.id) ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={favorites.has(item.lemma.id) ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorites.has(item.lemma.id) ? (
            <span className="text-xl">⭐</span>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-gray-900 break-words">
              {item.lemma.lemma}
            </h3>
            
            {/* POS badge - light grey pill */}
            <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
              {posDisplay.toUpperCase()}
            </span>
            
            {/* Frequency */}
            <span className="text-xs text-gray-600">
              Frequency: {item.frequency_in_book}
            </span>
          </div>
          
          {/* Translation section */}
          <div className="mb-3">
            {item.lemma.definition ? (
              <p className="text-sm text-gray-700 break-words">
                <span className="text-gray-600 font-medium">Translation:</span>{' '}
                {cleanTranslation(item.lemma.definition)}
              </p>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Translation not available
              </p>
            )}
          </div>
          
          {/* Type, Conjugation, Form pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {type && (
              <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {type}
              </span>
            )}
            {conjugation && (
              <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {conjugation}
              </span>
            )}
            {form && (
              <span className="text-xs text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {form}
              </span>
            )}
          </div>
        </div>
        
        {/* Unknown button in top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(item.lemma.id, 'unknown');
          }}
          className="absolute top-4 right-4 text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors"
        >
          unknown
        </button>
      </div>
      
      {/* Bottom action buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onUpdateStatus(item.lemma.id, 'learned')}
          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors flex items-center justify-center gap-1 ${
            item.status === 'learned'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50'
          }`}
        >
          <span>✓</span>
          <span>Learned</span>
        </button>
        <button
          onClick={() => onUpdateStatus(item.lemma.id, 'unknown')}
          className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors flex items-center justify-center gap-1 ${
            item.status === 'unknown'
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50'
          }`}
        >
          <span>?</span>
          <span>Unknown</span>
        </button>
      </div>
    </div>
  );
});

VocabularyItem.displayName = 'VocabularyItem';

export default VocabularyExplorer;
