import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Navigation from './components/Navigation';
import ToastContainer from './components/ToastContainer';
import SkeletonLoader from './components/SkeletonLoader';
import PageTransition from './components/PageTransition';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const BookDashboard = lazy(() => import('./pages/BookDashboard'));
const VocabularyExplorer = lazy(() => import('./pages/VocabularyExplorer'));
const StudySession = lazy(() => import('./pages/StudySession'));
const SwipeStudySession = lazy(() => import('./pages/SwipeStudySession'));
const ReadingMode = lazy(() => import('./pages/ReadingMode'));
const BooksManagement = lazy(() => import('./pages/BooksManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ProgressDashboard = lazy(() => import('./pages/ProgressDashboard'));
const VocabLists = lazy(() => import('./pages/VocabLists'));
const SRSReview = lazy(() => import('./pages/SRSReview'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated (loading is complete)
    if (!loading && !isAuthenticated && location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location.pathname]); // Use location.pathname instead of location object

  if (loading) {
    return <SkeletonLoader />;
  }

  // Show loading during redirect transition
  if (!isAuthenticated) {
    return <SkeletonLoader />;
  }

  return <>{children}</>;
};

const OnboardingCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only check onboarding after authentication is confirmed and loading is complete
    if (!loading && isAuthenticated) {
      const onboardingCompleted = localStorage.getItem('onboarding_completed');
      // Only redirect to onboarding if not already there and onboarding not completed
      if (!onboardingCompleted && location.pathname !== '/onboarding' && location.pathname !== '/auth/callback') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isAuthenticated, loading, navigate, location.pathname]);

  return <>{children}</>;
};

function AppRoutes() {
  const { toasts, dismissToast } = useToast();

  return (
    <OnboardingCheck>
      <div className="min-h-screen bg-background">
        <Navigation />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <main className="container mx-auto px-4 py-8">
          <Suspense fallback={<SkeletonLoader />}>
            <PageTransition>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route
                path="/books"
                element={
                  <ProtectedRoute>
                    <BooksManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:bookId"
                element={
                  <ProtectedRoute>
                    <BookDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:bookId/vocabulary"
                element={
                  <ProtectedRoute>
                    <VocabularyExplorer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:bookId/study"
                element={
                  <ProtectedRoute>
                    <StudySession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:bookId/study/swipe"
                element={
                  <ProtectedRoute>
                    <SwipeStudySession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book/:bookId/reading"
                element={
                  <ProtectedRoute>
                    <ReadingMode />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <ProgressDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vocab-lists"
                element={
                  <ProtectedRoute>
                    <VocabLists />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vocab-lists/:listId"
                element={
                  <ProtectedRoute>
                    <VocabLists />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review"
                element={
                  <ProtectedRoute>
                    <SRSReview />
                  </ProtectedRoute>
                }
              />
              </Routes>
            </PageTransition>
          </Suspense>
        </main>
      </div>
    </OnboardingCheck>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
