import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import ProgressIndicator from '../components/ProgressIndicator';

const API_BASE_URL = 'http://localhost:8000/api';

interface SRSItem {
  id: number;
  user_id: number;
  lemma_id: number;
  lemma_text: string;
  definition?: string;
  interval: number;
  stability: number;
  difficulty: number;
  due_date: string;
  review_count: number;
  state: string;
}

const SRSReview: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<SRSItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionComplete, setSessionComplete] = useState<boolean>(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  useEffect(() => {
    if (token) {
      loadDueItems();
    }
  }, [token]);

  const loadDueItems = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/srs/due?limit=20', token);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        if (data.length === 0) {
          setSessionComplete(true);
        }
      }
    } catch (err) {
      console.error('Error loading due items:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (quality: number) => {
    if (currentIndex >= items.length) return;

    const currentItem = items[currentIndex];
    
    try {
      const response = await apiPost(
        `/srs/review/${currentItem.id}`,
        { quality },
        token
      );

      if (response.ok) {
        // Update stats
        if (quality >= 3) {
          setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
          setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        }

        // Move to next item
        if (currentIndex + 1 >= items.length) {
          setSessionComplete(true);
        } else {
          setCurrentIndex(currentIndex + 1);
          setShowAnswer(false);
        }
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading review queue...</p>
        </div>
      </div>
    );
  }

  if (sessionComplete || items.length === 0) {
    const totalReviewed = stats.correct + stats.incorrect;
    const accuracyRate = totalReviewed > 0 ? (stats.correct / totalReviewed) * 100 : 0;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-xl p-8 max-w-md animate-bounce">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Complete!</h2>
          
          {/* Accuracy Score */}
          <div className="mb-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {Math.round(accuracyRate)}%
            </div>
            <p className="text-sm text-gray-600">Accuracy Rate</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
              <div className="text-xs text-gray-600 mt-1">Correct</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{stats.incorrect}</div>
              <div className="text-xs text-gray-600 mt-1">Incorrect</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{items.length}</div>
              <div className="text-xs text-gray-600 mt-1">Reviewed</div>
            </div>
          </div>

          {/* Encouraging Message */}
          {accuracyRate >= 80 && (
            <div className="mb-6 p-3 bg-green-100 rounded-lg">
              <p className="text-green-800 font-semibold">🌟 Excellent work! Keep it up!</p>
            </div>
          )}
          {accuracyRate >= 60 && accuracyRate < 80 && (
            <div className="mb-6 p-3 bg-blue-100 rounded-lg">
              <p className="text-blue-800 font-semibold">👍 Great progress! You're improving!</p>
            </div>
          )}

          <button
            onClick={() => {
              setCurrentIndex(0);
              setShowAnswer(false);
              setSessionComplete(false);
              setStats({ correct: 0, incorrect: 0 });
              loadDueItems();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Review More Words
          </button>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                📚 SRS Review Session
              </h1>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {currentIndex + 1} of {items.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {items.length - currentIndex - 1} remaining
                </div>
              </div>
            </div>
            <ProgressIndicator
              value={currentIndex + 1}
              max={items.length}
              label="Review Progress"
              showValues={true}
              showPercentage={true}
              variant="blue"
              size="md"
              ariaLabel={`Review progress: ${currentIndex + 1} of ${items.length} words reviewed`}
            />
          </div>
        </div>

        {/* Review Card */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-12">
            {!showAnswer ? (
              <div className="text-center">
                <h2 className="text-5xl font-bold text-gray-900 mb-8">
                  {currentItem.lemma_text}
                </h2>
                <button
                  onClick={() => setShowAnswer(true)}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
                >
                  Show Answer
                </button>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-5xl font-bold text-green-600 mb-6">
                  {currentItem.lemma_text}
                </h2>
                {currentItem.definition && (
                  <p className="text-xl text-gray-700 mb-8">
                    {currentItem.definition}
                  </p>
                )}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-4">
                    How well did you know this word?
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <button
                      onClick={() => submitReview(0)}
                      className="px-6 py-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium"
                    >
                      0 - Blackout
                    </button>
                    <button
                      onClick={() => submitReview(1)}
                      className="px-6 py-3 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 font-medium"
                    >
                      1 - Incorrect
                    </button>
                    <button
                      onClick={() => submitReview(2)}
                      className="px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium"
                    >
                      2 - Hard
                    </button>
                    <button
                      onClick={() => submitReview(3)}
                      className="px-6 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-medium"
                    >
                      3 - Good
                    </button>
                    <button
                      onClick={() => submitReview(4)}
                      className="px-6 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium"
                    >
                      4 - Easy
                    </button>
                    <button
                      onClick={() => submitReview(5)}
                      className="px-6 py-3 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 font-medium"
                    >
                      5 - Perfect
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Session Statistics</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.incorrect}</div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentItem.review_count}</div>
              <div className="text-sm text-gray-600">Total Reviews</div>
            </div>
          </div>
          {/* Accuracy Progress */}
          {stats.correct + stats.incorrect > 0 && (
            <div className="mt-4">
              <ProgressIndicator
                value={(stats.correct / (stats.correct + stats.incorrect)) * 100}
                max={100}
                label="Session Accuracy"
                showPercentage={true}
                variant={(stats.correct / (stats.correct + stats.incorrect)) >= 0.7 ? 'green' : (stats.correct / (stats.correct + stats.incorrect)) >= 0.5 ? 'yellow' : 'red'}
                size="sm"
                ariaLabel={`Session accuracy: ${Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)}%`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SRSReview;

