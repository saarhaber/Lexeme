import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import SkeletonCard from '../components/SkeletonCard';
import LoadingOverlay from '../components/LoadingOverlay';

import { API_BASE_URL } from '../config/api';

interface ReadingTextResponse {
  text: string;
  position: number;
  total_length: number;
  progress: number;
  chapter: number;
  safe_vocabulary_count: number;
}

interface WordDefinition {
  lemma: string;
  definition: string;
  pos?: string;
  context_sentence?: string;
  frequency?: number;
  morphology?: Record<string, any>;
}

interface WordLookupResponse {
  word: string;
  definitions: WordDefinition[];
  is_safe: boolean;
}

const ReadingMode: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [text, setText] = useState<string>('');
  const [position, setPosition] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDefinition, setWordDefinition] = useState<WordLookupResponse | null>(null);
  const [definitionPosition, setDefinitionPosition] = useState<{ x: number; y: number } | null>(null);
  const [fontSize, setFontSize] = useState<number>(18);
  const [loadingWord, setLoadingWord] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bookmarks, setBookmarks] = useState<Array<{ position: number; label: string; timestamp: string }>>([]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');

  useEffect(() => {
    if (bookId) {
      loadReadingText();
      loadBookmarks();
    }
  }, [bookId]);

  const loadBookmarks = () => {
    const saved = localStorage.getItem(`bookmarks_${bookId}`);
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
      }
    }
  };

  const saveBookmark = () => {
    const newBookmark = {
      position,
      label: bookmarkLabel || `Position ${Math.round(progress * 100)}%`,
      timestamp: new Date().toISOString()
    };
    const updated = [...bookmarks, newBookmark].sort((a, b) => a.position - b.position);
    setBookmarks(updated);
    localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(updated));
    setShowBookmarkModal(false);
    setBookmarkLabel('');
  };

  const deleteBookmark = (index: number) => {
    const updated = bookmarks.filter((_, i) => i !== index);
    setBookmarks(updated);
    localStorage.setItem(`bookmarks_${bookId}`, JSON.stringify(updated));
  };

  const jumpToBookmark = async (bookmarkPosition: number) => {
    try {
      setLoading(true);
      const response = await apiGet(
        `/reading/book/${bookId}/text?position=${bookmarkPosition}&length=2000`,
        token
      );
      if (response.ok) {
        const data: ReadingTextResponse = await response.json();
        setText(data.text);
        setPosition(data.position);
        setProgress(data.progress);
        handleUpdateProgress(data.position);
      }
    } catch (err) {
      console.error('Error jumping to bookmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReadingText = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/reading/book/${bookId}/text?length=2000`, token);
      if (!response.ok) {
        throw new Error('Failed to load book text');
      }
      const data: ReadingTextResponse = await response.json();
      setText(data.text);
      setPosition(data.position);
      setProgress(data.progress);
      setError('');
    } catch (err) {
      setError('Failed to load book text');
      console.error('Error loading text:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = async (word: string, event: React.MouseEvent) => {
    // Clean word (remove punctuation but preserve apostrophes for contractions like "nell'estate")
    const cleanWord = word.replace(/[^\w\s']/g, '').toLowerCase();
    if (!cleanWord || cleanWord.replace(/'/g, '').length < 2) return;

    setSelectedWord(cleanWord);
    
    // Get word position for popup placement
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setDefinitionPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });

    try {
      setLoadingWord(true);
      const response = await apiGet(
        `/reading/book/${bookId}/word/${encodeURIComponent(cleanWord)}?position=${position}`,
        token
      );
      if (response.ok) {
        const data: WordLookupResponse = await response.json();
        setWordDefinition(data);
      }
    } catch (err) {
      console.error('Error looking up word:', err);
    } finally {
      setLoadingWord(false);
    }
  };

  const handleUpdateProgress = async (newPosition: number) => {
    try {
      const response = await apiPost(
        `/reading/book/${bookId}/progress`,
        { position: newPosition },
        token
      );
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress || 0);
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleLoadMore = async () => {
    const newPosition = position + 2000;
    try {
      setLoadingMore(true);
      const response = await apiGet(
        `/reading/book/${bookId}/text?position=${newPosition}&length=2000`,
        token
      );
      if (response.ok) {
        const data: ReadingTextResponse = await response.json();
        setText(data.text);
        setPosition(data.position);
        setProgress(data.progress);
        handleUpdateProgress(data.position);
      }
    } catch (err) {
      console.error('Error loading more text:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const splitTextIntoWords = (text: string): string[] => {
    // Split text preserving spaces and punctuation
    return text.split(/(\s+|[.,!?;:—])/);
  };

  const closeDefinition = () => {
    setSelectedWord(null);
    setWordDefinition(null);
    setDefinitionPosition(null);
  };

  const findLemmaId = async (word: string): Promise<number | null> => {
    // This would need to be implemented with a proper API endpoint
    // For now, return null
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <SkeletonCard variant="generic" count={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <button
            onClick={() => navigate(`/book/${bookId}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Book
          </button>
        </div>
      </div>
    );
  }

  const words = splitTextIntoWords(text);

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <LoadingOverlay isLoading={loadingWord} message="Loading word definition..." />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b animate-slide-up">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/book/${bookId}`)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Reading Mode</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Font size controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-all duration-200 transform hover:scale-110 active:scale-95"
                >
                  A-
                </button>
                <span className="text-sm text-gray-600">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-all duration-200 transform hover:scale-110 active:scale-95"
                >
                  A+
                </button>
              </div>
              {/* Bookmark button */}
              <button
                onClick={() => setShowBookmarkModal(true)}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300 transition-all duration-200 transform hover:scale-105 active:scale-95"
                title="Bookmark current position"
              >
                🔖 Bookmark
              </button>
              {/* Progress */}
              <div className="text-sm text-gray-600">
                {Math.round(progress * 100)}% complete
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2 relative">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              ></div>
              {/* Bookmark markers */}
              {bookmarks.map((bookmark, idx) => (
                <button
                  key={idx}
                  onClick={() => jumpToBookmark(bookmark.position)}
                  className="absolute top-0 w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2 hover:scale-150 transition-transform"
                  style={{ left: `${(bookmark.position / 1000000) * 100}%` }}
                  title={bookmark.label}
                />
              ))}
            </div>
          </div>
          {/* Bookmarks list */}
          {bookmarks.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Bookmarks:</div>
              <div className="flex flex-wrap gap-2">
                {bookmarks.map((bookmark, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToBookmark(bookmark.position)}
                    className="px-2 py-1 text-xs bg-yellow-50 text-yellow-800 rounded hover:bg-yellow-100 border border-yellow-200 flex items-center gap-1"
                  >
                    <span>🔖</span>
                    <span>{bookmark.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBookmark(idx);
                      }}
                      className="ml-1 text-yellow-600 hover:text-red-600"
                    >
                      ×
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reading Area */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div
          className="bg-white rounded-lg shadow-sm p-8 prose prose-lg max-w-none"
          style={{ fontFamily: 'Georgia, serif', fontSize: `${fontSize}px`, lineHeight: '1.75' }}
        >
          {words.map((word, index) => {
            // Match words including apostrophes (e.g., "nell'estate", "l'italiano")
            const isWord = /^[\w']+$/.test(word.trim()) && word.trim().replace(/'/g, '').length >= 2;
            if (isWord) {
              return (
                <span
                  key={index}
                  onClick={(e) => handleWordClick(word, e)}
                  className="cursor-pointer hover:bg-yellow-100 hover:underline transition-all duration-200"
                  title="Click for definition"
                >
                  {word}
                </span>
              );
            }
            return <span key={index}>{word}</span>;
          })}
        </div>

        {/* Load More Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loadingMore ? 'Loading...' : 'Load More Text'}
          </button>
        </div>
      </div>

      {/* Word Definition Popup */}
          {wordDefinition && definitionPosition && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md z-50 animate-slide-up"
          style={{
            left: `${definitionPosition.x}px`,
            top: `${definitionPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{wordDefinition.word}</h3>
              <AudioPlayer text={wordDefinition.word} language="en" />
            </div>
            <button
              onClick={closeDefinition}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 transform hover:scale-110 active:scale-95"
            >
              ×
            </button>
          </div>
          {wordDefinition.definitions.map((def, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                {def.pos && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {def.pos}
                  </span>
                )}
              </div>
              <p className="text-gray-700 mt-1 font-medium">{def.definition}</p>
              
              {def.morphology && def.morphology.forms && def.morphology.forms.length > 1 && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Word Forms:</span>{' '}
                  <span className="text-gray-700">{def.morphology.forms.join(', ')}</span>
                </div>
              )}
              
              {def.morphology && Object.keys(def.morphology).filter(k => k !== 'forms' && k !== 'form_count' && k !== 'root' && k !== 'prefixes' && k !== 'suffixes').length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Grammar:</span>{' '}
                  {Object.entries(def.morphology)
                    .filter(([key]) => {
                      const excludeKeys = ['forms', 'form_count', 'root', 'prefixes', 'suffixes', 'derivations', 'inflections'];
                      return !excludeKeys.includes(key);
                    })
                    .map(([key, value]) => {
                      const keyFormatted = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                      if (Array.isArray(value)) {
                        return `${keyFormatted}: ${value.join(', ')}`;
                      }
                      if (value === true || value === false) {
                        return value ? keyFormatted : '';
                      }
                      return `${keyFormatted}: ${value}`;
                    })
                    .filter(v => v)
                    .join(' • ')}
                </div>
              )}
              
              {def.context_sentence && (
                <p className="text-sm text-gray-500 italic mt-2">
                  "{def.context_sentence}"
                </p>
              )}
            </div>
          ))}
          {!wordDefinition.is_safe && (
            <div className="mt-2 text-xs text-amber-600">
              ⚠️ This word is from unread text
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={async () => {
                // Add word to SRS
                try {
                  const lemmaId = wordDefinition.definitions[0]?.lemma ? 
                    await findLemmaId(wordDefinition.word) : null;
                  if (lemmaId && token) {
                    await apiPost(`/srs/start/${lemmaId}?book_id=${bookId}`, {}, token);
                    alert('Word added to study queue!');
                  }
                } catch (err) {
                  console.error('Error adding to SRS:', err);
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm"
            >
              ➕ Add to Study Queue
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {wordDefinition && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeDefinition}
        ></div>
      )}

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Bookmark</h3>
            <input
              type="text"
              placeholder="Bookmark label (optional)"
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  saveBookmark();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={saveBookmark}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowBookmarkModal(false);
                  setBookmarkLabel('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingMode;

