import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPut } from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import SearchBar from '../components/SearchBar';
import FilterDropdown, { FilterOption } from '../components/FilterDropdown';
import SortSelector, { SortOption } from '../components/SortSelector';

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
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'chronological');
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPolling, setIsPolling] = useState(false);
  const [lastKnownCount, setLastKnownCount] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

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
      const response = await apiGet(
        `/vocab/book/${bookId}?sort_by=${sortBy}&page=${currentPage}&limit=100`,
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
        setVocabulary(data.vocabulary);
      }
      
      setLastKnownCount(data.total_count);
      setLoading(false);
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
            `/vocab/book/${bookId}?sort_by=chronological&page=1&limit=${limit}`,
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
  }, [bookId, sortBy, currentPage, token]);

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
      case 'known':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'learning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ignored':
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      {/* Prominent Study Mode Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
        <h2 className="text-xl font-bold text-gray-900 mb-3">🎯 Ready to Study?</h2>
        <p className="text-gray-700 mb-4">Choose your preferred study mode to practice vocabulary interactively!</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/book/${bookId}/study`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            🃏 Flashcards Mode
          </button>
          <button
            onClick={() => navigate(`/book/${bookId}/study`)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            ✅ Multiple Choice Mode
          </button>
          <button
            onClick={() => navigate(`/book/${bookId}/study`)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            ⌨️ Typing Mode
          </button>
          <button
            onClick={() => navigate(`/book/${bookId}/study/swipe`)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            💫 Swipe Mode
          </button>
          <button
            onClick={() => navigate(`/book/${bookId}/reading`)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            📖 Reading Mode
          </button>
        </div>
      </div>

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Vocabulary Explorer</h1>
          <p className="text-gray-600">Browse and manage vocabulary from your book</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (token && bookId) {
                try {
                  const response = await apiGet(`/export/csv/${bookId}`, token);
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `book_${bookId}_vocabulary.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            📥 Export CSV
          </button>
          <button
            onClick={async () => {
              if (token && bookId) {
                try {
                  const response = await apiGet(`/export/anki/${bookId}`, token);
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `book_${bookId}_anki.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📥 Export Anki
          </button>
          <button
            onClick={async () => {
              if (token && bookId) {
                try {
                  // Export filtered vocabulary as JSON
                  const filteredVocab = vocabulary
                    .filter(item => 
                      !searchQuery || 
                      item.lemma.lemma.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .filter(item => 
                      !filterStatus || item.status === filterStatus
                    );
                  
                  const jsonData = JSON.stringify({
                    book_id: parseInt(bookId || '0'),
                    export_date: new Date().toISOString(),
                    total_words: filteredVocab.length,
                    vocabulary: filteredVocab.map(item => ({
                      lemma: item.lemma.lemma,
                      definition: item.lemma.definition,
                      pos: item.lemma.pos,
                      language: item.lemma.language,
                      frequency_in_book: item.frequency_in_book,
                      status: item.status,
                      example_sentences: item.example_sentences,
                      collocations: item.collocations
                    }))
                  }, null, 2);
                  
                  const blob = new Blob([jsonData], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `book_${bookId}_vocabulary.json`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            📥 Export JSON
          </button>
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
              { value: 'learning', label: 'Learning' },
              { value: 'known', label: 'Known' },
              { value: 'ignored', label: 'Ignored' },
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
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
}>(({ item, favorites, onToggleFavorite, onUpdateStatus }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'known':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'learning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ignored':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const morphology = item.lemma.morphology || {};
  const wordForms = Array.isArray((morphology as any).forms) ? (morphology as any).forms : null;
  const excludeKeys = ['forms', 'form_count', 'root', 'prefixes', 'suffixes', 'derivations', 'inflections'];
  const grammarEntries = Object.entries(morphology || {})
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([key, value]) => {
      if (value === undefined || value === null || value === '') return '';
      const keyFormatted = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      if (Array.isArray(value)) {
        return `${keyFormatted}: ${value.join(', ')}`;
      }
      if (typeof value === 'boolean') {
        return value ? keyFormatted : '';
      }
      return `${keyFormatted}: ${value}`;
    })
    .filter(Boolean);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <button
              onClick={() => onToggleFavorite(item.lemma.id)}
              className={`text-xl transition-transform hover:scale-110 ${
                favorites.has(item.lemma.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
              }`}
              title={favorites.has(item.lemma.id) ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={favorites.has(item.lemma.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              ⭐
            </button>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
              {item.lemma.lemma}
            </h3>
            <AudioPlayer text={item.lemma.lemma} language={item.lemma.language} />
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {item.lemma.pos || 'NOUN'}
            </span>
            <span className="text-sm text-gray-500 break-words">
              Frequency: {item.frequency_in_book}
            </span>
          </div>
          
          <div className="space-y-2">
            {item.lemma.definition ? (
              <p className="text-gray-700 font-medium break-words">
                <span className="text-gray-600">Translation:</span>{' '}
                <span className="break-words">{item.lemma.definition}</span>
              </p>
            ) : (
              <p className="text-gray-500 italic text-sm">
                Translation not available
              </p>
            )}
            
            {wordForms && wordForms.length > 1 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Word Forms:</span>{' '}
                <span className="text-gray-700 break-words">{wordForms.join(', ')}</span>
              </div>
            )}
            
            {grammarEntries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {grammarEntries.map((entry) => (
                  <span
                    key={`${item.lemma.id}-${entry}`}
                    className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-full break-words"
                  >
                    {entry}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="sm:ml-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
            {item.status}
          </span>
        </div>
      </div>
      
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onUpdateStatus(item.lemma.id, 'known')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            item.status === 'known'
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50'
          }`}
        >
          ✓ Known
        </button>
        <button
          onClick={() => onUpdateStatus(item.lemma.id, 'learning')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            item.status === 'learning'
              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-yellow-50'
          }`}
        >
          📚 Learning
        </button>
        <button
          onClick={() => onUpdateStatus(item.lemma.id, 'ignored')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            item.status === 'ignored'
              ? 'bg-gray-100 text-gray-800 border-gray-200'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          👁️ Ignore
        </button>
      </div>
    </div>
  );
});

VocabularyItem.displayName = 'VocabularyItem';

export default VocabularyExplorer;
