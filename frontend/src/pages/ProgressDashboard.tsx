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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Your Progress Dashboard
          </h1>
          <p className="text-gray-600">
            Track your vocabulary learning journey
          </p>
        </div>

        {/* SRS Statistics */}
        {srsStats && (
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
        )}

        {/* Book Progress */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Reading Progress</h2>
          </div>
          <div className="p-6">
            {bookProgress.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📖</div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No reading progress yet</h3>
                <p className="text-gray-500">
                  Start reading a book to see your progress here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {bookProgress.map((book) => (
                  <div key={book.book_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
                      <span className="text-sm text-gray-600">
                        {Math.round(book.progress * 100)}% complete
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${book.progress * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Words Read:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {book.words_read.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Vocabulary:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {book.vocabulary_encountered}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 font-medium ${
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

