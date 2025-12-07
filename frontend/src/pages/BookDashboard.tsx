import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../utils/api";
import { requestCache } from "../utils/requestCache";
import ProgressIndicator from "../components/ProgressIndicator";
import AchievementBadge from "../components/AchievementBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import LoadingOverlay from "../components/LoadingOverlay";

interface Book {
  id: number;
  title: string;
  author: string;
  language: string;
  upload_date: string;
  processing_status: string;
  file_path?: string;
  total_words?: number;
  unique_lemmas?: number;
}

interface BookPreview {
  text: string;
  position: number;
  total_length: number;
  progress?: number;
}

interface ReadingProgress {
  position: number;
  progress: number;
  chapter: number;
  words_read: number;
  vocabulary_encountered: number;
}

interface VocabularyStats {
  learned: number;
  unknown: number;
  total: number;
  ignored?: number;
}

const BookDashboard: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookPreview, setBookPreview] = useState<BookPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [readingProgress, setReadingProgress] =
    useState<ReadingProgress | null>(null);
  const [vocabStats, setVocabStats] = useState<VocabularyStats | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setError(null);

        const [bookData, progressData, vocabStatsData] = await Promise.all([
          requestCache.get(`book-${bookId}`, async () => {
            const bookResponse = await apiGet(`/books/${bookId}`, token);
            if (!bookResponse.ok) {
              throw new Error("Failed to load book");
            }
            return bookResponse.json();
          }),
          apiGet(`/reading/book/${bookId}/progress`, token)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          apiGet(`/vocab/book/${bookId}/stats`, token)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        setBook(bookData);
        setLoading(false); // Show UI immediately with book info

        if (progressData) {
          setReadingProgress(progressData);
        }
        if (vocabStatsData) {
          setVocabStats({
            learned: vocabStatsData.learned || 0,
            unknown: vocabStatsData.unknown || 0,
            total: vocabStatsData.total || 0,
            ignored: vocabStatsData.ignored || 0,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book");
        setLoading(false);
      }
    };

    if (bookId && token) {
      fetchBook();
    }
  }, [bookId, token]);

  // Poll for processing status if book is still processing
  useEffect(() => {
    if (!bookId || !token || !book) return;

    // Only poll if status is processing
    if (book.processing_status !== "processing") {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await apiGet(`/upload/status/${bookId}`, token);
        if (response.ok) {
          const statusData = await response.json();
          setProcessingProgress(statusData.progress || 0);

          // Update book status if it changed
          if (statusData.status !== book.processing_status) {
            const bookResponse = await apiGet(`/books/${bookId}`, token);
            if (bookResponse.ok) {
              const updatedBook = await bookResponse.json();
              setBook(updatedBook);
              // Refresh vocabulary stats when processing completes
              if (updatedBook.processing_status === "completed") {
                const vocabResponse = await apiGet(
                  `/vocab/book/${bookId}/stats`,
                  token,
                );
                if (vocabResponse.ok) {
                  const statsData = await vocabResponse.json();
                  setVocabStats({
                    learned: statsData.learned || 0,
                    unknown: statsData.unknown || 0,
                    total: statsData.total || 0,
                    ignored: statsData.ignored || 0,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll processing status:", err);
      }
    };

    // Poll immediately, then every 3 seconds
    pollStatus();
    const intervalId = setInterval(pollStatus, 3000);

    return () => clearInterval(intervalId);
  }, [bookId, token, book]);

  // Poll for vocabulary updates when processing (only if not already loaded)
  useEffect(() => {
    if (!book || book.processing_status !== "processing" || vocabStats) return;
    
    const fetchVocabStats = async () => {
      if (!bookId || !token) return;
      try {
        const response = await apiGet(
          `/vocab/book/${bookId}/stats`,
          token,
        );
        if (response.ok) {
          const statsData = await response.json();
          setVocabStats({
            learned: statsData.learned || 0,
            unknown: statsData.unknown || 0,
            total: statsData.total || 0,
            ignored: statsData.ignored || 0,
          });
        }
      } catch (err) {
        // Silently handle errors - vocabulary might not be ready yet
        console.error("Failed to load vocabulary stats:", err);
      }
    };

    const intervalId = setInterval(fetchVocabStats, 2000); // Poll every 2 seconds
    return () => clearInterval(intervalId);
  }, [bookId, token, book?.processing_status, vocabStats]);

  // Calculate vocabulary mastery level
  const getMasteryLevel = (): {
    level: string;
    percentage: number;
    color: string;
  } => {
    if (!vocabStats || vocabStats.total === 0) {
      return { level: "Beginner", percentage: 0, color: "gray" };
    }
    const effectiveTotal = Math.max(
      vocabStats.total - (vocabStats.ignored || 0),
      0,
    );
    const masteredPercentage =
      effectiveTotal > 0 ? (vocabStats.learned / effectiveTotal) * 100 : 0;
    if (masteredPercentage >= 80) {
      return {
        level: "Advanced",
        percentage: masteredPercentage,
        color: "green",
      };
    } else if (masteredPercentage >= 50) {
      return {
        level: "Intermediate",
        percentage: masteredPercentage,
        color: "blue",
      };
    } else {
      return {
        level: "Beginner",
        percentage: masteredPercentage,
        color: "yellow",
      };
    }
  };

  const loadBookPreview = async () => {
    if (!bookId || !token) return;
    try {
      setLoadingPreview(true);
      const response = await apiGet(
        `/reading/book/${bookId}/text?length=1000`,
        token,
      );
      if (response.ok) {
        const preview = await response.json();
        setBookPreview(preview);
        setShowPreview(true);
      }
    } catch (err) {
      console.error("Failed to load book preview:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const exploreVocabulary = () => {
    navigate(`/book/${bookId}/vocabulary`);
  };

  const startReading = () => {
    navigate(`/book/${bookId}/reading`);
  };

  if (loading) {
    return (
      <div
        className="mx-auto w-full space-y-6 px-4 phone:px-5 py-6"
        style={{ maxWidth: "var(--app-max-width)" }}
      >
        <SkeletonLoader variant="book" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mx-auto w-full px-4 phone:px-5 py-6"
        style={{ maxWidth: "var(--app-max-width)" }}
      >
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error loading book</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <span className="mr-2" aria-hidden="true">🔄</span>
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div
        className="mx-auto w-full px-4 phone:px-5 py-6"
        style={{ maxWidth: "var(--app-max-width)" }}
      >
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-sm">
          <div className="text-6xl mb-4" aria-hidden="true">📚</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Book not found</h2>
          <p className="text-sm text-gray-600 mb-6">
            The book you're looking for doesn't exist or may have been deleted.
          </p>
          <a
            href="/books"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <span className="mr-2" aria-hidden="true">←</span>
            Back to My Books
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full space-y-6 px-4 phone:px-5 animate-fade-in"
      style={{ maxWidth: "var(--app-max-width)" }}
    >
      <LoadingOverlay
        isLoading={loadingPreview}
        message="Loading book preview..."
      />

      {/* Book Header */}
      <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card animate-slide-up">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div
            className="text-6xl md:text-8xl flex-shrink-0"
            aria-hidden="true"
          >
            📚
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {book.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-4">
              by {book.author}
            </p>

            <div className="flex flex-wrap gap-3 md:gap-4 text-sm text-gray-500">
              <span
                aria-label={`Uploaded on ${new Date(book.upload_date).toLocaleDateString()}`}
              >
                <span aria-hidden="true">📅</span> Uploaded:{" "}
                {new Date(book.upload_date).toLocaleDateString()}
              </span>
              <span aria-label={`Language: ${book.language.toUpperCase()}`}>
                <span aria-hidden="true">🌍</span> Language:{" "}
                {book.language.toUpperCase()}
              </span>
              <span aria-label={`Status: ${book.processing_status}`}>
                <span aria-hidden="true">⚡</span> Status:{" "}
                {book.processing_status}
              </span>
            </div>

            {/* Reading Progress */}
            {readingProgress && readingProgress.progress > 0 && (
              <div className="mt-4">
                <ProgressIndicator
                  value={readingProgress.progress * 100}
                  max={100}
                  label="Reading Progress"
                  showPercentage={true}
                  variant="blue"
                  size="md"
                  ariaLabel={`Reading progress: ${Math.round(readingProgress.progress * 100)}% complete`}
                />
                <div className="mt-2 text-xs text-gray-600">
                  {readingProgress.words_read.toLocaleString()} words read •
                  Chapter {readingProgress.chapter}
                </div>
              </div>
            )}

            {/* Vocabulary Mastery Level */}
            {vocabStats && vocabStats.total > 0 && (
              <div className="mt-4">
                {(() => {
                  const mastery = getMasteryLevel();
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Vocabulary Mastery
                        </span>
                        <span
                          className={`text-sm font-semibold px-3 py-1 rounded-full ${
                            mastery.color === "green"
                              ? "bg-green-100 text-green-800"
                              : mastery.color === "blue"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {mastery.level}
                        </span>
                      </div>
                      <ProgressIndicator
                        value={mastery.percentage}
                        max={100}
                        showPercentage={true}
                        variant={
                          mastery.color === "green"
                            ? "green"
                            : mastery.color === "blue"
                              ? "blue"
                              : "yellow"
                        }
                        size="md"
                        ariaLabel={`Vocabulary mastery: ${mastery.level} level, ${Math.round(mastery.percentage)}% mastered`}
                      />
                      <div className="mt-2 text-xs text-gray-600">
                        {vocabStats.learned} learned • {vocabStats.unknown}{" "}
                        unknown
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swipe Study Mode - Featured */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 md:p-8 shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="text-4xl md:text-5xl mb-3" aria-hidden="true">
            💫
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Swipe Study Mode
          </h2>
          <p className="text-base md:text-lg opacity-90">
            The fastest way to review vocabulary - swipe through words like
            Tinder!
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/book/${bookId}/study/swipe`)}
            className="bg-white text-purple-600 py-3 md:py-4 px-6 md:px-8 rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-base md:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600"
            aria-label="Start Swipe Study Mode"
          >
            <span aria-hidden="true">🚀</span> Start Swipe Study
          </button>
        </div>
      </div>

      {/* Reading Mode Callout */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 md:p-8 mb-8 border-2 border-indigo-200 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="text-5xl md:text-6xl" aria-hidden="true">
            📖
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Reading Mode
            </h2>
            <p className="text-gray-700 mb-4 text-sm md:text-base">
              Need contextual practice? Jump into reading mode to encounter vocabulary inside full sentences with instant lookups.
            </p>
            <button
              onClick={startReading}
              className="bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Start Reading Mode"
            >
              Launch Reading Mode
            </button>
          </div>
        </div>
      </div>

      {/* Additional Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Explore Vocabulary Card */}
        <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-5 shadow-soft-card">
          <div className="text-3xl md:text-4xl mb-3" aria-hidden="true">
            🔍
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Explore Vocabulary
          </h3>
          <p className="mt-2 text-sm text-gray-700">
            Browse and search every word extracted from your book. Mark words as
            learned or unknown.
          </p>
          <button
            onClick={exploreVocabulary}
            className="mt-4 w-full rounded-2xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Explore vocabulary from this book"
          >
            <span aria-hidden="true">📚</span> View Vocabulary List
          </button>
        </div>

        {/* Book Info Card */}
        <div className="rounded-3xl border border-gray-200 bg-white/95 p-5 shadow-soft-card">
          <div className="text-3xl md:text-4xl mb-3" aria-hidden="true">
            📊
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Book Statistics
          </h3>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Total Words</span>
              <span className="font-semibold">
                {book.total_words?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unique Vocabulary</span>
              <span className="font-semibold">
                {book.unique_lemmas?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Language</span>
              <span className="font-semibold">
                {book.language.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span
                className={`font-semibold ${
                  book.processing_status === "completed"
                    ? "text-green-600"
                    : book.processing_status === "processing"
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
                aria-label={`Processing status: ${book.processing_status}`}
              >
                {book.processing_status}
              </span>
            </div>
          </div>
          {/* Processing Progress */}
          {book.processing_status === "processing" && (
            <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
              <ProgressIndicator
                value={
                  processingProgress ||
                  (book.total_words && book.total_words > 0 ? 50 : 25)
                }
                max={100}
                label="Processing Book"
                showPercentage={true}
                variant="yellow"
                size="sm"
                ariaLabel={`Book processing in progress: ${processingProgress || 50}%`}
              />
              <p className="mt-2 text-xs text-gray-500">
                Extracting vocabulary... This may take a few minutes for large
                books.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Book Preview */}
      <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Book Preview</h3>
          {!showPreview ? (
            <button
              onClick={loadBookPreview}
              disabled={loadingPreview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
            >
              {loadingPreview ? "Loading..." : "Show Preview"}
            </button>
          ) : (
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Hide Preview
            </button>
          )}
        </div>
        {showPreview && bookPreview && (
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {bookPreview.text}
              </p>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Showing first {bookPreview.text.length} characters of{" "}
              {bookPreview.total_length.toLocaleString()} total
            </div>
          </div>
        )}
        {showPreview && !bookPreview && loadingPreview && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading preview...</p>
          </div>
        )}
        {!showPreview && (
          <p className="text-sm text-gray-600">
            Click "Show Preview" to see a preview of your uploaded book content.
          </p>
        )}
      </div>

      {/* Achievements Section */}
      {vocabStats && vocabStats.learned > 0 && (
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Achievements
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <AchievementBadge
              title="First Words"
              description="Learn your first 10 words"
              icon="🌱"
              unlocked={vocabStats.learned >= 10}
              size="sm"
            />
            <AchievementBadge
              title="Vocabulary Builder"
              description="Master 50 words"
              icon="📚"
              unlocked={vocabStats.learned >= 50}
              size="sm"
            />
            <AchievementBadge
              title="Word Master"
              description="Master 100 words"
              icon="⭐"
              unlocked={vocabStats.learned >= 100}
              size="sm"
            />
            <AchievementBadge
              title="Book Explorer"
              description="Read 25% of the book"
              icon="📖"
              unlocked={
                readingProgress ? readingProgress.progress >= 0.25 : false
              }
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/")}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
          >
            ← Upload Another Book
          </button>
          <button
            onClick={() => navigate("/progress")}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
          >
            📊 Progress
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDashboard;
