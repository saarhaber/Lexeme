import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import Navigation from "./components/Navigation";
import ToastContainer from "./components/ToastContainer";
import SkeletonLoader from "./components/SkeletonLoader";
import PageTransition from "./components/PageTransition";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const BookDashboard = lazy(() => import("./pages/BookDashboard"));
const VocabularyExplorer = lazy(() => import("./pages/VocabularyExplorer"));
const StudySession = lazy(() => import("./pages/StudySession"));
const SwipeStudySession = lazy(() => import("./pages/SwipeStudySession"));
const ReadingMode = lazy(() => import("./pages/ReadingMode"));
const BooksManagement = lazy(() => import("./pages/BooksManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ProgressDashboard = lazy(() => import("./pages/ProgressDashboard"));
const VocabLists = lazy(() => import("./pages/VocabLists"));
const SRSReview = lazy(() => import("./pages/SRSReview"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated (loading is complete)
    if (!loading && !isAuthenticated && location.pathname !== "/") {
      navigate("/", { replace: true });
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

function AppRoutes() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="min-h-screen bg-background text-gray-900">
      <div className="flex min-h-screen flex-col">
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to content
        </a>
        <Navigation />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <main
          id="app-main"
          className="flex-1 w-full mx-auto px-4 phone:px-5 sm:px-6 lg:px-8 py-8 pt-24 sm:pt-28 pb-16"
          style={{
            maxWidth: "var(--app-max-width)",
            paddingBottom: "calc(6rem + var(--safe-area-bottom))",
          }}
        >
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
    </div>
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
