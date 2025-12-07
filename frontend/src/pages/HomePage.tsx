import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ErrorMessage from '../components/ErrorMessage';
import ProgressBar from '../components/ProgressBar';
import { API_BASE_URL } from '../config/api';

const ACCEPTED_FORMATS = ['.pdf', '.epub', '.txt', '.docx'] as const;
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const HomePage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<{
    title?: string;
    message: string;
    details?: string;
    suggestions?: string[];
  } | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authErrors, setAuthErrors] = useState<{ login?: string; register?: string }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login, loginWithGoogle, register, isAuthenticated, user, token } = useAuth();
  const { showToast } = useToast();
  const acceptedFormatsLabel = ACCEPTED_FORMATS.map((ext) => ext.replace('.', '').toUpperCase()).join(', ');

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTryDemo = () => {
    navigate('/demo');
  };

  const processUpload = useCallback(
    async (file: File) => {
      if (!isAuthenticated) {
        setUploadError({
          title: 'Sign in required',
          message: 'Please sign in before uploading a book.',
          suggestions: ['Create a free account above', 'Sign in if you already have an account'],
        });
        return;
      }

      if (isUploading) {
        return;
      }

      const dotIndex = file.name.lastIndexOf('.');
      const fileExtension = dotIndex !== -1 ? file.name.slice(dotIndex).toLowerCase() : '';

      if (!ACCEPTED_FORMATS.includes(fileExtension as (typeof ACCEPTED_FORMATS)[number])) {
        setUploadError({
          title: 'Unsupported file format',
          message: `We currently support ${ACCEPTED_FORMATS.join(', ')} files.`,
          suggestions: [
            `Convert your file to ${acceptedFormatsLabel} format`,
            'Check that the file extension is correct',
            'Try a different file',
          ],
        });
        setSelectedFileName(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError({
          title: 'File too large',
          message: `The file is larger than ${MAX_FILE_SIZE_MB}MB. Please use a smaller file.`,
          suggestions: [
            'Try compressing the PDF',
            'Split the book into smaller parts',
            'Use a text file instead of PDF for smaller size',
          ],
        });
        setSelectedFileName(null);
        return;
      }

      setSelectedFileName(file.name);
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadStartTime(Date.now());

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

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
              errorDetails = await response.text();
            }
          } catch (e) {
            errorDetails = response.statusText;
          }

          const suggestions: string[] = [];
          if (response.status === 401 || response.status === 403) {
            suggestions.push('Try logging out and back in');
            suggestions.push('Check that your session hasn\'t expired');
          } else if (response.status === 413) {
            suggestions.push('The file is too large');
            suggestions.push('Try a smaller file or compress the PDF');
          } else if (response.status === 415) {
            suggestions.push('The file format may not be supported');
            suggestions.push('Try converting to PDF or EPUB format');
          } else if (response.status >= 500) {
            suggestions.push('The server may be temporarily unavailable');
            suggestions.push('Try again in a few minutes');
          }

          const enhancedError = Object.assign(new Error(errorMessage), {
            details: errorDetails,
            suggestions,
            status: response.status,
          });
          throw enhancedError;
        }

        let result: any;
        try {
          result = await response.json();
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          throw new Error(`Invalid response format: ${errorMessage}`);
        }

        if (!result || typeof result !== 'object') {
          throw new Error('Server returned invalid response structure');
        }

        if (result.book_id === undefined || result.book_id === null) {
          throw new Error('Server did not return valid book ID');
        }

        if (result.status === 'error' || result.status === 'failed') {
          throw new Error(result.message || 'Upload failed on server');
        }

        setUploadProgress(100);
        showToast('Book uploaded successfully! Vocabulary processing in background.', 'success');

        setTimeout(() => {
          setSelectedFileName(null);
          navigate(`/book/${result.book_id}`);
        }, 600);
      } catch (error: any) {
        if (error && typeof error === 'object' && error.message) {
          setUploadError({
            title: 'Upload failed',
            message: error.message,
            details: error.details,
            suggestions: error.suggestions || [],
          });
        } else {
          const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
          setUploadError({
            title: 'Upload failed',
            message: errorMsg,
            suggestions: [],
          });
        }
      } finally {
        setIsUploading(false);
        setUploadStartTime(null);
        setIsDragActive(false);
        clearInterval(progressInterval);
        resetFileInput();
      }
    },
    [acceptedFormatsLabel, isAuthenticated, isUploading, navigate, showToast, token]
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    processUpload(file);
  };

  const handleManualUpload = () => {
    fileInputRef.current?.click();
  };

  const handleZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleManualUpload();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isAuthenticated || isUploading) {
      return;
    }
    setIsDragActive(true);
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (!isAuthenticated || isUploading) {
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Google sign-in failed';
      setAuthErrors((prev) => ({ ...prev, login: errorMsg }));
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setAuthErrors((prev) => ({ ...prev, login: undefined }));
      setIsLoggingIn(true);
      await login(loginData.username, loginData.password);
      setIsLoggingIn(false);
      showToast('Welcome back!', 'success');
      navigate('/books');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setAuthErrors((prev) => ({ ...prev, login: errorMsg }));
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setAuthErrors((prev) => ({ ...prev, register: undefined }));
      setIsRegistering(true);
      await register(registerData.username, registerData.email, registerData.password);
      setIsRegistering(false);
      showToast('Account created successfully!', 'success');
      navigate('/books');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      setAuthErrors((prev) => ({ ...prev, register: errorMsg }));
      setIsRegistering(false);
    }
  };

  const handleAuthTabChange = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthErrors({});
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 md:gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 sm:p-8 shadow-[0_18px_55px_rgba(15,23,42,0.12)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -left-10 top-0 h-32 w-32 rounded-full bg-white/40 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1 space-y-4 text-center md:text-left">
            {isAuthenticated && user ? (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold leading-tight text-gray-900">
                  Welcome back, {user.username}! 🎉
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto md:mx-0">
                  Jump into your library, keep your streak alive, or add a new book without digging through menus.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                  <button
                    onClick={() => navigate('/books')}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    📚 Go to Library
                  </button>
                  <button
                    onClick={() => navigate('/review')}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    ✅ Start Review
                  </button>
                  <button
                    onClick={handleManualUpload}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    ⬆️ Upload a Book
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                  Built for readers, not flashcards
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold leading-tight text-gray-900">
                  Master vocabulary through real books
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto md:mx-0">
                  Upload any book (PDF, EPUB, or text) in any language. Lexeme extracts every word, teaches you in context, and never spoils the story.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <button
                    onClick={handleTryDemo}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    🎯 Try the interactive demo
                  </button>
                </div>
              </>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-2 text-xs sm:text-sm text-gray-700">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 shadow-sm">
                ⚡ Contextual definitions
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 shadow-sm">
                🎧 Audio where available
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-3 py-1 shadow-sm">
                🎯 Spaced repetition built-in
              </span>
            </div>
          </div>

          <div className="flex-1">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-soft-card backdrop-blur">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white/80 px-3 py-3 text-center shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{acceptedFormatsLabel}</p>
                  <p className="text-xs text-gray-500">Formats</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white/80 px-3 py-3 text-center shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{MAX_FILE_SIZE_MB}MB</p>
                  <p className="text-xs text-gray-500">File limit</p>
                </div>
                <div className="col-span-2 rounded-xl border border-gray-100 bg-white/80 px-3 py-3 text-center shadow-sm sm:col-span-1">
                  <p className="text-sm font-semibold text-gray-900">Zero spoilers</p>
                  <p className="text-xs text-gray-500">Vocabulary only</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleTryDemo}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  👀 See a sample flow
                </button>
                {isAuthenticated && (
                  <button
                    onClick={handleManualUpload}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    ⬆️ Upload now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card w-full max-w-3xl mx-auto space-y-6 p-6 sm:p-7 lg:p-8 text-left">
        {uploadError && (
          <div>
            <ErrorMessage
              title={uploadError.title}
              message={uploadError.message}
              details={uploadError.details}
              suggestions={uploadError.suggestions}
              onRetry={() => {
                setUploadError(null);
                if (isAuthenticated) {
                  handleManualUpload();
                } else {
                  handleAuthTabChange('login');
                }
              }}
              onDismiss={() => setUploadError(null)}
            />
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-5">
            <div role="tablist" aria-label="Authentication options" className="grid grid-cols-2 gap-2">
              <button
                id="login-tab"
                role="tab"
                type="button"
                aria-selected={authMode === 'login'}
                aria-controls="login-panel"
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  authMode === 'login' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => handleAuthTabChange('login')}
              >
                I already have an account
              </button>
              <button
                id="register-tab"
                role="tab"
                type="button"
                aria-selected={authMode === 'register'}
                aria-controls="register-panel"
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  authMode === 'register' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => handleAuthTabChange('register')}
              >
                I'm new to Lexeme
              </button>
            </div>

            <section
              id="login-panel"
              role="tabpanel"
              aria-labelledby="login-tab"
              hidden={authMode !== 'login'}
              className={authMode === 'login' ? 'space-y-4' : 'hidden'}
            >
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                {authErrors.login && (
                  <div
                    className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    role="alert"
                    aria-live="assertive"
                  >
                    {authErrors.login}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-medium transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wide text-gray-500">
                    <span className="bg-white px-2">Or continue with</span>
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Username
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="username"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="current-password"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isLoggingIn ? 'Signing in...' : 'Sign In'}
                </button>

                <p className="text-xs text-gray-500">
                  We'll take you straight to your personalized library once you're in.
                </p>
              </form>
            </section>

            <section
              id="register-panel"
              role="tabpanel"
              aria-labelledby="register-tab"
              hidden={authMode !== 'register'}
              className={authMode === 'register' ? 'space-y-4' : 'hidden'}
            >
              <form className="space-y-4" onSubmit={handleRegisterSubmit}>
                {authErrors.register && (
                  <div
                    className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    role="alert"
                    aria-live="assertive"
                  >
                    {authErrors.register}
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700">
                  Username
                  <input
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="username"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Password (min 6 characters)
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isRegistering ? 'Creating your space...' : 'Create Account'}
                </button>
                <p className="text-xs text-gray-500">
                  Start uploading books and building your vocabulary library.
                </p>
              </form>
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            {!isUploading ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  aria-describedby="upload-hint"
                  aria-label="Upload a book file"
                  onClick={handleManualUpload}
                  onKeyDown={handleZoneKeyDown}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed p-5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isDragActive ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <p className="text-lg font-semibold text-gray-900">Drop your book here</p>
                  <p className="text-sm text-gray-600" id="upload-hint">
                    Accepted formats: {acceptedFormatsLabel} • Max {MAX_FILE_SIZE_MB}MB
                  </p>
                  {selectedFileName && (
                    <p className="mt-3 text-sm text-gray-700" aria-live="polite">
                      Selected file: <span className="font-medium">{selectedFileName}</span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleManualUpload}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Browse files
                    </button>
                    <span className="text-xs text-gray-500">
                      Drag & drop supported. Processing continues even if you leave this page.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate('/books')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-gray-700 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:w-1/2"
                  >
                    Go to My Books
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/progress')}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-gray-700 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:w-1/2"
                  >
                    Review Progress
                  </button>
                </div>

                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>We'll toast you when vocabulary extraction finishes.</li>
                  <li>Uploads support PDF, EPUB, DOCX, and TXT up to {MAX_FILE_SIZE_MB}MB.</li>
                </ul>
              </>
            ) : (
              <div className="space-y-4" aria-live="polite">
                <ProgressBar
                  progress={uploadProgress}
                  message={
                    uploadProgress < 30
                      ? 'Uploading file...'
                      : uploadProgress < 60
                      ? 'Extracting text...'
                      : uploadProgress < 90
                      ? 'Analyzing vocabulary...'
                      : 'Processing complete!'
                  }
                  showTimeEstimate={uploadProgress > 0 && uploadProgress < 100}
                  startTime={uploadStartTime || undefined}
                />
                {selectedFileName && (
                  <p className="text-center text-sm text-gray-600">
                    Working on <span className="font-medium">{selectedFileName}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          id="file-upload-input"
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold text-gray-900">Why readers pick Lexeme</h2>
          <span className="hidden text-sm text-gray-500 sm:inline">Built for focus</span>
        </div>
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200/80 bg-white/80 p-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col items-center rounded-xl bg-white px-4 py-4 text-center shadow-sm">
            <div className="mb-2 text-3xl" aria-hidden="true">
              ✅
            </div>
            <h3 className="mb-1 text-base font-semibold text-gray-900">Learn from real literature</h3>
            <p className="text-sm text-gray-600">Not textbooks—real books you want to read.</p>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white px-4 py-4 text-center shadow-sm">
            <div className="mb-2 text-3xl" aria-hidden="true">
              🚫
            </div>
            <h3 className="mb-1 text-base font-semibold text-gray-900">Zero spoilers</h3>
            <p className="text-sm text-gray-600">We only show vocabulary, never plot details.</p>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white px-4 py-4 text-center shadow-sm">
            <div className="mb-2 text-3xl" aria-hidden="true">
              🌍
            </div>
            <h3 className="mb-1 text-base font-semibold text-gray-900">Any language</h3>
            <p className="text-sm text-gray-600">50+ languages supported with native-level NLP.</p>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white px-4 py-4 text-center shadow-sm">
            <div className="mb-2 text-3xl" aria-hidden="true">
              🎯
            </div>
            <h3 className="mb-1 text-base font-semibold text-gray-900">Spaced repetition</h3>
            <p className="text-sm text-gray-600">Smart review system for long-term memory.</p>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto rounded-2xl border border-gray-200 bg-white/90 p-6 md:p-8 shadow-soft-card">
        <h2 className="mb-4 text-center text-xl md:text-2xl font-bold text-gray-900">How it works</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 text-4xl md:text-5xl" aria-hidden="true">
              1️⃣
            </div>
            <h3 className="mb-1 font-semibold text-gray-900">Upload your book</h3>
            <p className="text-sm text-gray-600">PDF, EPUB, or text file in any language.</p>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl md:text-5xl" aria-hidden="true">
              2️⃣
            </div>
            <h3 className="mb-1 font-semibold text-gray-900">Read & click</h3>
            <p className="text-sm text-gray-600">Tap words to see definitions and context.</p>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl md:text-5xl" aria-hidden="true">
              3️⃣
            </div>
            <h3 className="mb-1 font-semibold text-gray-900">Review & remember</h3>
            <p className="text-sm text-gray-600">Use spaced repetition to master vocabulary.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
