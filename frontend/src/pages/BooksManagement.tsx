import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiGet, apiDelete } from '../utils/api';
import ErrorMessage from '../components/ErrorMessage';
import SkeletonLoader from '../components/SkeletonLoader';
import SearchBar from '../components/SearchBar';
import FilterDropdown, { FilterOption } from '../components/FilterDropdown';
import SortSelector, { SortOption } from '../components/SortSelector';

import { API_BASE_URL } from '../config/api';

interface Book {
  id: number;
  title: string;
  author: string;
  language: string;
  upload_date: string;
  processing_status: string;
  total_words: number;
  unique_lemmas: number;
}

type ErrorState = {
  title?: string;
  message: string;
  details?: string;
  suggestions?: string[];
};

const BooksManagement: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterLanguage, setFilterLanguage] = useState(searchParams.get('language') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'date-desc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<ErrorState | null>(null);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterLanguage) params.set('language', filterLanguage);
    if (filterStatus) params.set('status', filterStatus);
    if (sortBy !== 'date-desc') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [searchQuery, filterLanguage, filterStatus, sortBy, setSearchParams]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const loadUserBooks = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet('/books/', token);
      
      if (!response.ok) {
        let errorMessage = '';
        let errorDetails = '';
        try {
          const errorData = await response.json().catch(() => null);
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else {
            const errorText = await response.text();
            errorDetails = errorText;
            errorMessage = `Failed to load books (${response.status})`;
          }
        } catch (e) {
          errorMessage = `Failed to load books (${response.status})`;
          errorDetails = response.statusText;
        }

        const suggestions: string[] = [];
        if (response.status === 401 || response.status === 403) {
          suggestions.push('Try logging out and back in');
          suggestions.push('Check that your session hasn\'t expired');
        } else if (response.status >= 500) {
          suggestions.push('The server may be temporarily unavailable');
          suggestions.push('Try again in a few minutes');
        } else {
          suggestions.push('Try refreshing the page');
        }

        setError({
          title: 'Failed to load books',
          message: errorMessage,
          details: errorDetails,
          suggestions
        });
        return;
      }
      
      const data = await response.json();
      setBooks(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError({
        title: 'Failed to load books',
        message: errorMessage,
        suggestions: ['Try refreshing the page', 'Check your internet connection']
      });
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Only load books if we have a token
    if (token) {
      loadUserBooks();
    } else {
      setLoading(false);
    }
  }, [token, loadUserBooks]);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startProgressSimulation = () => {
    setUploadProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 5));
    }, 200);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleUploadButtonClick = () => {
    setUploadError(null);
    if (!token) {
      showToast('Please sign in again to upload a book.', 'warning');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!token) {
      showToast('Please sign in again to upload a book.', 'warning');
      resetFileInput();
      return;
    }

    const allowedExtensions = ['.pdf', '.epub', '.txt', '.docx'];
    const lastDotIndex = file.name.lastIndexOf('.');
    const fileExtension = lastDotIndex !== -1 ? file.name.toLowerCase().substring(lastDotIndex) : '';
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadError({
        title: 'Unsupported file format',
        message: `We only support ${allowedExtensions.join(', ')} files.`,
        suggestions: [
          'Convert your file to PDF, EPUB, TXT, or DOCX format',
          'Check that the file extension is correct',
          'Try a different file'
        ]
      });
      resetFileInput();
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError({
        title: 'File too large',
        message: 'The file is larger than 50MB. Please use a smaller file.',
        suggestions: [
          'Try compressing the PDF',
          'Split the book into smaller parts',
          'Use a text file instead of PDF for smaller size'
        ]
      });
      resetFileInput();
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    startProgressSimulation();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const fetchOptions: RequestInit = {
        method: 'POST',
        body: formData,
      };

      if (token) {
        fetchOptions.headers = {
          Authorization: `Bearer ${token}`,
        };
      }

      const response = await fetch(`${API_BASE_URL}/upload/book`, fetchOptions);

      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`;
        let errorDetails = '';

        try {
          const errorData = await response.json().catch(() => null);
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else {
            const errorText = await response.text();
            errorDetails = errorText;
          }
        } catch (err) {
          errorDetails = response.statusText;
        }

        const suggestions: string[] = [];
        if (response.status === 401 || response.status === 403) {
          suggestions.push('Try logging out and back in');
          suggestions.push('Check that your session hasn\'t expired');
        } else if (response.status === 413) {
          suggestions.push('The file is too large (max 50MB)');
          suggestions.push('Try compressing the file or splitting it');
        } else if (response.status === 415) {
          suggestions.push('The file format may not be supported');
          suggestions.push('Try converting to PDF or EPUB format');
        } else if (response.status >= 500) {
          suggestions.push('The server may be temporarily unavailable');
          suggestions.push('Try again in a few minutes');
        } else {
          suggestions.push('Try again in a few minutes');
        }

        throw {
          message: errorMessage,
          details: errorDetails,
          suggestions
        };
      }

      let result: any;
      try {
        result = await response.json();
      } catch (parseError: unknown) {
        throw {
          message: 'Server returned invalid response format',
          details: parseError instanceof Error ? parseError.message : String(parseError),
          suggestions: ['Try the upload again', 'If the issue persists, contact support']
        };
      }

      if (!result || typeof result !== 'object' || result.book_id === undefined || result.book_id === null) {
        throw {
          message: 'Server did not return a valid book ID',
          suggestions: ['Try the upload again', 'If the issue persists, contact support']
        };
      }

      setUploadProgress(100);
      showToast('Book uploaded successfully! Vocabulary processing in background.', 'success');
      await loadUserBooks();

      setTimeout(() => {
        navigate(`/book/${result.book_id}`);
      }, 500);
    } catch (err: any) {
      const errorMessage = err?.message || 'Upload failed';
      setUploadError({
        title: 'Upload failed',
        message: errorMessage,
        details: err?.details,
        suggestions: err?.suggestions
      });
      showToast(errorMessage, 'warning');
    } finally {
      stopProgressSimulation();
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
      resetFileInput();
    }
  };

  const handleBookSelect = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, bookId: number) => {
    e.stopPropagation();
    setShowDeleteConfirm(bookId);
  };

  const handleDeleteConfirm = async (bookId: number) => {
    try {
      setDeletingBookId(bookId);
      const response = await apiDelete(`/books/${bookId}`, token);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Failed to delete book';
        showToast(errorMessage, 'warning');
        throw new Error(errorMessage);
      }

      const bookTitle = books.find(b => b.id === bookId)?.title || 'Book';
      setBooks(books.filter(book => book.id !== bookId));
      setShowDeleteConfirm(null);
      showToast(`${bookTitle} deleted successfully`, 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete book';
      showToast(errorMessage, 'warning');
      console.error('Error deleting book:', err);
    } finally {
      setDeletingBookId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageFlag = (language: string) => {
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'it': '🇮🇹',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷'
    };
    return flags[language] || '🌍';
  };

  // Get unique languages and statuses for filters
  const languageOptions: FilterOption[] = useMemo(() => {
    const languages = Array.from(new Set(books.map(b => b.language))).sort();
    return languages.map(lang => ({
      value: lang,
      label: `${getLanguageFlag(lang)} ${lang.toUpperCase()}`
    }));
  }, [books]);

  const statusOptions: FilterOption[] = [
    { value: 'completed', label: 'Completed' },
    { value: 'processing', label: 'Processing' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' }
  ];

  const sortOptions: SortOption[] = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'words-desc', label: 'Most Words' },
    { value: 'words-asc', label: 'Fewest Words' },
    { value: 'vocab-desc', label: 'Most Vocabulary' },
    { value: 'vocab-asc', label: 'Least Vocabulary' }
  ];

  // Filter and sort books
  const filteredAndSortedBooks = useMemo(() => {
    let filtered = books.filter(book => {
      // Search filter
      const matchesSearch = !searchQuery || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Language filter
      const matchesLanguage = !filterLanguage || book.language === filterLanguage;
      
      // Status filter
      const matchesStatus = !filterStatus || book.processing_status === filterStatus;
      
      return matchesSearch && matchesLanguage && matchesStatus;
    });

    // Sort books
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        case 'date-asc':
          return new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'words-desc':
          return b.total_words - a.total_words;
        case 'words-asc':
          return a.total_words - b.total_words;
        case 'vocab-desc':
          return b.unique_lemmas - a.unique_lemmas;
        case 'vocab-asc':
          return a.unique_lemmas - b.unique_lemmas;
        default:
          return 0;
      }
    });

    return filtered;
  }, [books, searchQuery, filterLanguage, filterStatus, sortBy]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterLanguage('');
    setFilterStatus('');
    setSortBy('date-desc');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg mb-8 p-6">
            <SkeletonLoader variant="text" lines={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonLoader key={index} variant="card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span aria-hidden="true">📚</span> My Library
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your uploaded books and continue learning vocabulary from any text.
              </p>
            </div>
            <button
              onClick={loadUserBooks}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Refresh book list"
            >
              <span className="mr-2" aria-hidden="true">🔄</span>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📖</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Books
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {books.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🌍</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Languages
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(books.map(b => b.language)).size}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📝</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Words
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {books.reduce((sum, book) => sum + book.total_words, 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🔤</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Vocabulary Words
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {books.reduce((sum, book) => sum + book.unique_lemmas, 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter, and Sort Controls */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-2">
              <SearchBar
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
            </div>
            <FilterDropdown
              label="Language"
              options={languageOptions}
              value={filterLanguage}
              onChange={setFilterLanguage}
              showClear={!!filterLanguage}
              onClear={() => setFilterLanguage('')}
            />
            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={filterStatus}
              onChange={setFilterStatus}
              showClear={!!filterStatus}
              onClear={() => setFilterStatus('')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SortSelector
              label="Sort by"
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
            />
            {(searchQuery || filterLanguage || filterStatus || sortBy !== 'date-desc') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            )}
            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredAndSortedBooks.length} of {books.length} books
            </div>
          </div>
        </div>

        {/* Upload New Book */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4">
            <button
              onClick={handleUploadButtonClick}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="mr-2" aria-hidden="true">{isUploading ? '⏳' : '📤'}</span>
              {isUploading ? 'Uploading...' : 'Upload New Book'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.txt,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
            <p className="text-sm text-gray-500 mt-3">
              Supports PDF, EPUB, TXT, DOCX (max 50MB)
            </p>
          </div>
          {isUploading && (
            <div className="px-6 pb-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <div
                  className="h-4 w-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2"
                  aria-hidden="true"
                />
                Uploading... {uploadProgress}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden="true">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {uploadError && (
            <div className="px-6 pb-4">
              <ErrorMessage
                title={uploadError.title}
                message={uploadError.message}
                details={uploadError.details}
                suggestions={uploadError.suggestions}
                onRetry={() => {
                  setUploadError(null);
                  handleUploadButtonClick();
                }}
                onDismiss={() => setUploadError(null)}
              />
            </div>
          )}
        </div>

        {/* Books Grid */}
        {error && (
          <div className="mb-6">
            <ErrorMessage
              title={error.title}
              message={error.message}
              details={error.details}
              suggestions={error.suggestions}
              onRetry={loadUserBooks}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {books.length === 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-12 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
                <p className="text-gray-500 mb-6">
                  Start building your vocabulary library by uploading your first book.
                </p>
                <button
                  onClick={handleUploadButtonClick}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Your First Book'}
                </button>
              </div>
            </div>
        ) : filteredAndSortedBooks.length === 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No books match your filters</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search or filter criteria.
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => handleBookSelect(book.id)}
              >
                <div className="p-6">
                  {/* Book Header */}
                  <div className="flex items-center mb-4">
                    <div className="text-3xl mr-3">
                      {getLanguageFlag(book.language)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-sm text-gray-500">{book.author}</p>
                      )}
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🗓️</span>
                      {formatDate(book.upload_date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">📄</span>
                      {book.total_words.toLocaleString()} words
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🔤</span>
                      {book.unique_lemmas.toLocaleString()} vocabulary words
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">⚙️</span>
                      Status: 
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                        book.processing_status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {book.processing_status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookSelect(book.id);
                        }}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label={`Study vocabulary from ${book.title}`}
                      >
                        Study Vocabulary
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book/${book.id}/vocabulary`);
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        aria-label={`Explore vocabulary from ${book.title}`}
                      >
                        Explore Words
                      </button>
                    </div>
                    {showDeleteConfirm === book.id ? (
                      <div className="flex space-x-2 bg-red-50 p-2 rounded-md">
                        <span className="flex-1 text-sm text-red-800 font-medium">
                          Delete this book?
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConfirm(book.id);
                          }}
                          disabled={deletingBookId === book.id}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingBookId === book.id ? 'Deleting...' : 'Yes'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCancel();
                          }}
                          disabled={deletingBookId === book.id}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(e, book.id)}
                        disabled={deletingBookId === book.id}
                        className="w-full bg-red-50 text-red-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        aria-label={`Delete ${book.title}`}
                      >
                        <span className="mr-2" aria-hidden="true">🗑️</span>
                        Delete Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksManagement;
