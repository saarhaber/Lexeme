import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../utils/api';

import { API_BASE_URL } from '../config/api';

interface SRSStats {
  user_id: number;
  total_reviews: number;
  due_today: number;
  learned_today: number;
  streak_days: number;
  total_items: number;
}

interface BookProgress {
  book_id: number;
  title: string;
  progress: number;
  words_read: number;
  vocabulary_encountered: number;
}

const ProgressDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [srsStats, setSrsStats] = useState<SRSStats | null>(null);
  const [bookProgress, setBookProgress] = useState<BookProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      loadStats();
    }
  }, [token]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Load SRS stats
      const srsResponse = await apiGet('/srs/stats', token);
      if (srsResponse.ok) {
        const srsData = await srsResponse.json();
        setSrsStats(srsData);
      }

      // Load books and their progress
      const booksResponse = await apiGet('/books/', token);
      if (booksResponse.ok) {
        const books = await booksResponse.json();
        const progressPromises = books.map(async (book: any) => {
            try {
              const progressResponse = await apiGet(`/reading/book/${book.id}/progress`, token);
            if (progressResponse.ok) {
              const progress = await progressResponse.json();
              return {
                book_id: book.id,
                title: book.title,
                progress: progress.progress || 0,
                words_read: progress.words_read || 0,
                vocabulary_encountered: progress.vocabulary_encountered || 0,
              };
            }
          } catch (err) {
            console.error(`Error loading progress for book ${book.id}:`, err);
          }
          return {
            book_id: book.id,
            title: book.title,
            progress: 0,
            words_read: 0,
            vocabulary_encountered: 0,
          };
        });
        const progressData = await Promise.all(progressPromises);
        setBookProgress(progressData);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div
          className="mx-auto w-full space-y-6 px-4 phone:px-5 py-6"
          style={{ maxWidth: "var(--app-max-width)" }}
        >
          <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
                <div className="animate-pulse space-y-3">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
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
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <div className="mb-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Progress
            </p>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span aria-hidden="true">📊</span> Your Progress Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Track your vocabulary learning journey
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/review"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                ✅ Start Review
              </a>
              <a
                href="/books"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                📚 Open Library
              </a>
            </div>
          </div>
        </div>

        {/* SRS Statistics */}
        {srsStats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl">📚</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Words Learning
                      </dt>
                      <dd className="text-2xl font-medium text-gray-900">
                        {srsStats.total_items}
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
                    <div className="text-3xl">⏰</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Due Today
                      </dt>
                      <dd className="text-2xl font-medium text-blue-600">
                        {srsStats.due_today}
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
                    <div className="text-3xl">✅</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Learned Today
                      </dt>
                      <dd className="text-2xl font-medium text-green-600">
                        {srsStats.learned_today}
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
                    <div className="text-3xl">🔥</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Streak
                      </dt>
                      <dd className="text-2xl font-medium text-orange-600">
                        {srsStats.streak_days} days
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-sm">
            <div className="text-6xl mb-4" aria-hidden="true">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No progress data yet
            </h3>
            <p className="mt-2 text-sm text-gray-600 mb-6">
              Start studying vocabulary to see your progress here. Your stats will appear once you begin learning words.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/books"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <span className="mr-2" aria-hidden="true">📚</span>
                Go to My Books
              </a>
              <a
                href="/vocab-lists"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
              >
                <span className="mr-2" aria-hidden="true">📝</span>
                View Vocabulary Lists
              </a>
            </div>
          </div>
        )}

        {/* Book Progress */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Reading Progress</h2>
            <p className="text-sm text-gray-600 mt-1">Track your progress through each book</p>
          </div>
          <div>
            {bookProgress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-5xl mb-4" aria-hidden="true">📖</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No reading progress yet
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Start reading a book to see your progress here. Your reading statistics will appear as you make progress.
                </p>
                <a
                  href="/books"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <span className="mr-2" aria-hidden="true">📚</span>
                  Start Reading
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {bookProgress.map((book) => (
                  <div key={book.book_id} className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
                      <span className="text-sm font-semibold text-gray-600">
                        {Math.round(book.progress * 100)}% complete
                      </span>
                    </div>
                    <div className="mb-4">
                      <div className="bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${book.progress * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">📄</span>
                        <span className="text-gray-600">Words Read:</span>
                        <span className="font-semibold text-gray-900">
                          {book.words_read.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">🔤</span>
                        <span className="text-gray-600">Vocabulary:</span>
                        <span className="font-semibold text-gray-900">
                          {book.vocabulary_encountered}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">✓</span>
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-semibold ${
                          book.progress === 1 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {book.progress === 1 ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;

