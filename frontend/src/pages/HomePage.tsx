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
    <div className="text-center">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-heading font-bold text-gray-900 mb-6">
          Master Vocabulary Through Real Books
        </h1>

        <p className="text-xl md:text-2xl text-gray-700 mb-4 max-w-3xl mx-auto font-medium">
          The only vocabulary app that learns from YOUR reading
        </p>

        <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl mx-auto px-4">
          Upload any book (PDF, EPUB, or text) in any language. Lexeme extracts every word,
          teaches you vocabulary in context, and never spoils the story.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12 px-4">
          <button
            onClick={handleTryDemo}
            className="px-6 py-3 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span aria-hidden="true">🎯</span> Try the interactive demo
          </button>
        </div>

        {isAuthenticated && user && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              Welcome back, <strong>{user.username}</strong>! 
              <button
                onClick={() => navigate('/books')}
                className="ml-2 text-green-600 hover:text-green-800 underline"
              >
                Go to My Books →
              </button>
            </p>
          </div>
        )}

          <div className="card max-w-2xl mx-auto mb-10 text-left">

            {uploadError && (
              <div className="mb-4">
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
              <div className="space-y-6">
                <div
                  role="tablist"
                  aria-label="Authentication options"
                  className="grid grid-cols-2 gap-2"
                >
                  <button
                    id="login-tab"
                    role="tab"
                    type="button"
                    aria-selected={authMode === 'login'}
                    aria-controls="login-panel"
                    className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      authMode === 'login'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
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
                    className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      authMode === 'register'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:text-gray-900'
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
                        className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
                        role="alert"
                        aria-live="assertive"
                      >
                        {authErrors.login}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                      </div>
                    </div>

                    <label className="block text-sm font-medium text-gray-700">
                      Username
                      <input
                        type="text"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoComplete="current-password"
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                        className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
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
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoComplete="new-password"
                        required
                        minLength={6}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              <div className="space-y-6">
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
                      className={`rounded-2xl border-2 border-dashed p-6 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isDragActive ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <p className="text-lg font-semibold text-gray-900">Drop your book here</p>
                      <p className="text-sm text-gray-600" id="upload-hint">
                        Accepted formats: {acceptedFormatsLabel} • Max {MAX_FILE_SIZE_MB}MB
                      </p>
                      {selectedFileName && (
                        <p className="text-sm text-gray-700 mt-3" aria-live="polite">
                          Selected file: <span className="font-medium">{selectedFileName}</span>
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3 items-center">
                        <button
                          type="button"
                          onClick={handleManualUpload}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                        className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg text-center text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Go to My Books
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/progress')}
                        className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg text-center text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Review Progress
                      </button>
                    </div>

                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
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
                      <p className="text-sm text-gray-600 text-center">
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
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12 px-4">
          <div className="card text-center">
            <div className="text-4xl mb-3" aria-hidden="true">✅</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Learn from Real Literature</h3>
            <p className="text-gray-600 text-sm">
              Not textbooks—real books you want to read
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-3" aria-hidden="true">🚫</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Zero Spoilers</h3>
            <p className="text-gray-600 text-sm">
              We only show vocabulary, never plot details
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-3" aria-hidden="true">🌍</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Works with Any Language</h3>
            <p className="text-gray-600 text-sm">
              50+ languages supported with native-level NLP
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-3" aria-hidden="true">🎯</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Spaced Repetition</h3>
            <p className="text-gray-600 text-sm">
              Smart review system for long-term memory
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-3xl mx-auto mb-8 px-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-3" aria-hidden="true">1️⃣</div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload Your Book</h3>
              <p className="text-gray-600 text-sm">
                PDF, EPUB, or text file in any language
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-3" aria-hidden="true">2️⃣</div>
              <h3 className="font-semibold text-gray-900 mb-2">Read & Click</h3>
              <p className="text-gray-600 text-sm">
                Click words you don't know to see definitions
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl mb-3" aria-hidden="true">3️⃣</div>
              <h3 className="font-semibold text-gray-900 mb-2">Review & Remember</h3>
              <p className="text-gray-600 text-sm">
                Use spaced repetition to master vocabulary
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
