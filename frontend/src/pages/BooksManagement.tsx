import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet, apiDelete } from "../utils/api";
import ErrorMessage from "../components/ErrorMessage";
import SkeletonLoader from "../components/SkeletonLoader";
import SearchBar from "../components/SearchBar";
import FilterDropdown, { FilterOption } from "../components/FilterDropdown";
import SortSelector, { SortOption } from "../components/SortSelector";

import { API_BASE_URL } from "../config/api";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial state from URL params
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [filterLanguage, setFilterLanguage] = useState(
    searchParams.get("language") || "",
  );
  const [filterStatus, setFilterStatus] = useState(
    searchParams.get("status") || "",
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "date-desc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<ErrorState | null>(null);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (filterLanguage) params.set("language", filterLanguage);
    if (filterStatus) params.set("status", filterStatus);
    if (sortBy !== "date-desc") params.set("sort", sortBy);
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

      const response = await apiGet("/books/", token);

      if (!response.ok) {
        let errorMessage = "";
        let errorDetails = "";
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
          suggestions.push("Try logging out and back in");
          suggestions.push("Check that your session hasn't expired");
        } else if (response.status >= 500) {
          suggestions.push("The server may be temporarily unavailable");
          suggestions.push("Try again in a few minutes");
        } else {
          suggestions.push("Try refreshing the page");
        }

        setError({
          title: "Failed to load books",
          message: errorMessage,
          details: errorDetails,
          suggestions,
        });
        return;
      }

      const data = await response.json();
      setBooks(data);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError({
        title: "Failed to load books",
        message: errorMessage,
        suggestions: [
          "Try refreshing the page",
          "Check your internet connection",
        ],
      });
      console.error("Error loading books:", err);
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
      fileInputRef.current.value = "";
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
      showToast("Please sign in again to upload a book.", "warning");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!token) {
      showToast("Please sign in again to upload a book.", "warning");
      resetFileInput();
      return;
    }

    const allowedExtensions = [".pdf", ".epub", ".txt", ".docx"];
    const lastDotIndex = file.name.lastIndexOf(".");
    const fileExtension =
      lastDotIndex !== -1
        ? file.name.toLowerCase().substring(lastDotIndex)
        : "";
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadError({
        title: "Unsupported file format",
        message: `We only support ${allowedExtensions.join(", ")} files.`,
        suggestions: [
          "Convert your file to PDF, EPUB, TXT, or DOCX format",
          "Check that the file extension is correct",
          "Try a different file",
        ],
      });
      resetFileInput();
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError({
        title: "File too large",
        message: "The file is larger than 50MB. Please use a smaller file.",
        suggestions: [
          "Try compressing the PDF",
          "Split the book into smaller parts",
          "Use a text file instead of PDF for smaller size",
        ],
      });
      resetFileInput();
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    startProgressSimulation();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const fetchOptions: RequestInit = {
        method: "POST",
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
        let errorDetails = "";

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
          suggestions.push("Try logging out and back in");
          suggestions.push("Check that your session hasn't expired");
        } else if (response.status === 413) {
          suggestions.push("The file is too large (max 50MB)");
          suggestions.push("Try compressing the file or splitting it");
        } else if (response.status === 415) {
          suggestions.push("The file format may not be supported");
          suggestions.push("Try converting to PDF or EPUB format");
        } else if (response.status >= 500) {
          suggestions.push("The server may be temporarily unavailable");
          suggestions.push("Try again in a few minutes");
        } else {
          suggestions.push("Try again in a few minutes");
        }

        throw {
          message: errorMessage,
          details: errorDetails,
          suggestions,
        };
      }

      let result: any;
      try {
        result = await response.json();
      } catch (parseError: unknown) {
        throw {
          message: "Server returned invalid response format",
          details:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          suggestions: [
            "Try the upload again",
            "If the issue persists, contact support",
          ],
        };
      }

      if (
        !result ||
        typeof result !== "object" ||
        result.book_id === undefined ||
        result.book_id === null
      ) {
        throw {
          message: "Server did not return a valid book ID",
          suggestions: [
            "Try the upload again",
            "If the issue persists, contact support",
          ],
        };
      }

      setUploadProgress(100);
      showToast(
        "Book uploaded successfully! Vocabulary processing in background.",
        "success",
      );
      await loadUserBooks();

      setTimeout(() => {
        navigate(`/book/${result.book_id}`);
      }, 500);
    } catch (err: any) {
      const errorMessage = err?.message || "Upload failed";
      setUploadError({
        title: "Upload failed",
        message: errorMessage,
        details: err?.details,
        suggestions: err?.suggestions,
      });
      showToast(errorMessage, "warning");
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
        const errorMessage = errorData.detail || "Failed to delete book";
        showToast(errorMessage, "warning");
        throw new Error(errorMessage);
      }

      const bookTitle = books.find((b) => b.id === bookId)?.title || "Book";
      setBooks(books.filter((book) => book.id !== bookId));
      setShowDeleteConfirm(null);
      showToast(`${bookTitle} deleted successfully`, "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete book";
      showToast(errorMessage, "warning");
      console.error("Error deleting book:", err);
    } finally {
      setDeletingBookId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getLanguageFlag = (language: string) => {
    const flags: { [key: string]: string } = {
      en: "🇺🇸",
      it: "🇮🇹",
      es: "🇪🇸",
      fr: "🇫🇷",
      de: "🇩🇪",
      pt: "🇵🇹",
      ru: "🇷🇺",
      zh: "🇨🇳",
      ja: "🇯🇵",
      ko: "🇰🇷",
    };
    return flags[language] || "🌍";
  };

  // Get unique languages and statuses for filters
  const languageOptions: FilterOption[] = useMemo(() => {
    const languages = Array.from(new Set(books.map((b) => b.language))).sort();
    return languages.map((lang) => ({
      value: lang,
      label: `${getLanguageFlag(lang)} ${lang.toUpperCase()}`,
    }));
  }, [books]);

  const statusOptions: FilterOption[] = [
    { value: "completed", label: "Completed" },
    { value: "processing", label: "Processing" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Failed" },
  ];

  const sortOptions: SortOption[] = [
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
    { value: "title-asc", label: "Title (A-Z)" },
    { value: "title-desc", label: "Title (Z-A)" },
    { value: "words-desc", label: "Most Words" },
    { value: "words-asc", label: "Fewest Words" },
    { value: "vocab-desc", label: "Most Vocabulary" },
    { value: "vocab-asc", label: "Least Vocabulary" },
  ];

  // Filter and sort books
  const filteredAndSortedBooks = useMemo(() => {
    let filtered = books.filter((book) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.author &&
          book.author.toLowerCase().includes(searchQuery.toLowerCase()));

      // Language filter
      const matchesLanguage =
        !filterLanguage || book.language === filterLanguage;

      // Status filter
      const matchesStatus =
        !filterStatus || book.processing_status === filterStatus;

      return matchesSearch && matchesLanguage && matchesStatus;
    });

    // Sort books
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.upload_date).getTime() -
            new Date(a.upload_date).getTime()
          );
        case "date-asc":
          return (
            new Date(a.upload_date).getTime() -
            new Date(b.upload_date).getTime()
          );
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "words-desc":
          return b.total_words - a.total_words;
        case "words-asc":
          return a.total_words - b.total_words;
        case "vocab-desc":
          return b.unique_lemmas - a.unique_lemmas;
        case "vocab-asc":
          return a.unique_lemmas - b.unique_lemmas;
        default:
          return 0;
      }
    });

    return filtered;
  }, [books, searchQuery, filterLanguage, filterStatus, sortBy]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterLanguage("");
    setFilterStatus("");
    setSortBy("date-desc");
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div
          className="mx-auto w-full space-y-4 px-4 phone:px-5 py-6"
          style={{ maxWidth: "var(--app-max-width)" }}
        >
          <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
            <SkeletonLoader variant="text" lines={2} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonLoader key={index} variant="card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="mx-auto w-full space-y-6 px-4 phone:px-5 pb-4"
        style={{ maxWidth: "var(--app-max-width)" }}
      >
        {/* Header */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Library
              </p>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span aria-hidden="true">📚</span> My Books
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage uploads and jump back into your personalized study
                sessions.
              </p>
            </div>
            <button
              onClick={loadUserBooks}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              aria-label="Refresh book list"
            >
              <span className="mr-2" aria-hidden="true">
                🔄
              </span>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <div className="grid grid-cols-2 gap-4 phone:grid-cols-4">
            {[
              {
                label: "Total Books",
                value: books.length.toString(),
                icon: "📖",
              },
              {
                label: "Languages",
                value: new Set(books.map((b) => b.language)).size.toString(),
                icon: "🌍",
              },
              {
                label: "Total Words",
                value: books
                  .reduce((sum, book) => sum + book.total_words, 0)
                  .toLocaleString(),
                icon: "📝",
              },
              {
                label: "Vocabulary",
                value: books
                  .reduce((sum, book) => sum + book.unique_lemmas, 0)
                  .toLocaleString(),
                icon: "🔤",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-gray-100 bg-white/90 p-4"
              >
                <div className="text-2xl" aria-hidden="true">
                  {stat.icon}
                </div>
                <p className="mt-3 text-xs uppercase tracking-wide text-gray-400">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Search, Filter, and Sort Controls */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchBar
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            />
            <div className="flex flex-wrap gap-3">
              <FilterDropdown
                label="Language"
                options={languageOptions}
                value={filterLanguage}
                onChange={setFilterLanguage}
                showClear={!!filterLanguage}
                onClear={() => setFilterLanguage("")}
              />
              <FilterDropdown
                label="Status"
                options={statusOptions}
                value={filterStatus}
                onChange={setFilterStatus}
                showClear={!!filterStatus}
                onClear={() => setFilterStatus("")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 phone:flex-row phone:items-center phone:justify-between">
            <SortSelector
              label="Sort by"
              options={sortOptions}
              value={sortBy}
              onChange={setSortBy}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {(searchQuery ||
                filterLanguage ||
                filterStatus ||
                sortBy !== "date-desc") && (
                <button
                  onClick={handleClearFilters}
                  className="rounded-full border border-gray-200 px-4 py-2 font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                  aria-label="Clear all filters"
                >
                  Clear filters
                </button>
              )}
              <span className="text-xs uppercase tracking-wide text-gray-400">
                Showing {filteredAndSortedBooks.length} of {books.length}
              </span>
            </div>
          </div>
        </div>

        {/* Upload New Book */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <div className="flex flex-col gap-3 phone:flex-row phone:items-center phone:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-400">
                Upload
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                Add a new book
              </h2>
              <p className="text-sm text-gray-500">
                PDF, EPUB, TXT, DOCX (max 50MB)
              </p>
            </div>
            <button
              onClick={handleUploadButtonClick}
              disabled={isUploading}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              <span className="mr-2" aria-hidden="true">
                {isUploading ? "⏳" : "📤"}
              </span>
              {isUploading ? "Uploading..." : "Upload Book"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.txt,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <div
                  className="mr-2 h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"
                  aria-hidden="true"
                />
                Uploading... {uploadProgress}%
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {uploadError && (
            <div className="mt-4">
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
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900">
              No books yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Start building your vocabulary library by uploading your first
              book.
            </p>
            <button
              onClick={handleUploadButtonClick}
              disabled={isUploading}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload your first book"}
            </button>
          </div>
        ) : filteredAndSortedBooks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900">
              No books match your filters
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Try adjusting your search or filter criteria.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredAndSortedBooks.map((book) => (
              <div
                key={book.id}
                className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card transition hover:-translate-y-1 hover:shadow-floating cursor-pointer"
                onClick={() => handleBookSelect(book.id)}
              >
                {/* Book Header */}
                <div className="flex items-start gap-3">
                  <div className="text-3xl" aria-hidden="true">
                    {getLanguageFlag(book.language)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-sm text-gray-500">{book.author}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      book.processing_status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {book.processing_status}
                  </span>
                </div>

                {/* Book Info */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🗓️</span>
                    {formatDate(book.upload_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">📄</span>
                    {book.total_words.toLocaleString()} words
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🔤</span>
                    {book.unique_lemmas.toLocaleString()} vocab
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">🌍</span>
                    {book.language.toUpperCase()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookSelect(book.id);
                      }}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={`Study vocabulary from ${book.title}`}
                    >
                      Study Vocabulary
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/book/${book.id}/vocabulary`);
                      }}
                      className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                      aria-label={`Explore vocabulary from ${book.title}`}
                    >
                      Explore Words
                    </button>
                  </div>
                  {showDeleteConfirm === book.id ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      <span className="flex-1 font-semibold">
                        Delete this book?
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfirm(book.id);
                        }}
                        disabled={deletingBookId === book.id}
                        className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {deletingBookId === book.id ? "Deleting…" : "Yes"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCancel();
                        }}
                        disabled={deletingBookId === book.id}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteClick(e, book.id)}
                      disabled={deletingBookId === book.id}
                      className="flex w-full items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                      aria-label={`Delete ${book.title}`}
                    >
                      <span className="mr-2" aria-hidden="true">
                        🗑️
                      </span>
                      Delete Book
                    </button>
                  )}
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
