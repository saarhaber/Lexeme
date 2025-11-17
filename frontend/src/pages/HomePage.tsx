import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ErrorMessage from '../components/ErrorMessage';
import ProgressBar from '../components/ProgressBar';
import { API_BASE_URL } from '../config/api';

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
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login, loginWithGoogle, register, isAuthenticated, user, token } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/books', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileUpload called', event);
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('=== BULLETPROOF UPLOAD START ===');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified)
    });

    // Validate file type
    const allowedExtensions = ['.pdf', '.epub', '.txt', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
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
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
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
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStartTime(Date.now());

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      console.log('Creating FormData...');
      const formData = new FormData();
      formData.append('file', file);

      console.log('Making request to:', `${API_BASE_URL}/upload/book`);
      const startTime = Date.now();
      
      // For FormData, don't set Content-Type - browser will set it with boundary
      // Only include Authorization header if token exists
      const fetchOptions: RequestInit = {
        method: 'POST',
        body: formData,
      };
      
      if (token) {
        fetchOptions.headers = {
          'Authorization': `Bearer ${token}`,
        };
      }
      
      const response = await fetch(`${API_BASE_URL}/upload/book`, fetchOptions);
      
      const endTime = Date.now();

      console.log('=== RESPONSE ANALYSIS ===');
      console.log('Status:', response.status, response.statusText);
      console.log('OK:', response.ok);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Duration:', endTime - startTime, 'ms');

      // Handle non-OK responses
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
            errorMessage = `Upload failed (${response.status})`;
          }
        } catch (e) {
          errorMessage = `Upload failed (${response.status})`;
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

        throw {
          message: errorMessage,
          details: errorDetails,
          suggestions,
          status: response.status
        };
      }

      // Parse JSON response
      let result: any;
      try {
        result = await response.json();
        console.log('✅ SUCCESS RESPONSE PARSED:', result);
      } catch (parseError: unknown) {
        console.error('JSON parsing failed:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Invalid response format: ${errorMessage}`);
      }

      // Validate response structure
      if (!result || typeof result !== 'object') {
        console.error('Invalid response structure:', result);
        throw new Error('Server returned invalid response structure');
      }

      // Check for application-level errors
      if (result.book_id === undefined || result.book_id === null) {
        console.error('Missing book_id in response:', result);
        throw new Error('Server did not return valid book ID');
      }

      if (result.status === 'error' || result.status === 'failed') {
        console.error('Application error in response:', result);
        throw new Error(result.message || 'Upload failed on server');
      }

      // Success!
      console.log('🎉 UPLOAD COMPLETELY SUCCESSFUL!');
      console.log('Book ID:', result.book_id);
      console.log('Title:', result.message);
      console.log('Status:', result.status);
      
      setUploadProgress(100);
      showToast('Book uploaded successfully! Vocabulary processing in background.', 'success');
      
      // Small delay to show success feedback before navigation
      setTimeout(() => {
        navigate(`/book/${result.book_id}`);
      }, 500);

    } catch (error: any) {
      console.error('❌ UPLOAD ERROR:', error);
      
      if (error && typeof error === 'object' && error.message) {
        setUploadError({
          title: 'Upload failed',
          message: error.message,
          details: error.details,
          suggestions: error.suggestions || []
        });
      } else {
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        setUploadError({
          title: 'Upload failed',
          message: errorMsg,
          suggestions: []
        });
      }
    } finally {
      setIsUploading(false);
      setUploadStartTime(null);
      clearInterval(progressInterval);
      // Reset file input so it can be used again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.log('=== BULLETPROOF UPLOAD END ===');
    }
  };

  const handleTryDemo = () => {
    alert('Demo functionality coming soon!');
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

        <p className="text-base md:text-lg text-gray-600 mb-12 max-w-2xl mx-auto px-4">
          Upload any book (PDF, EPUB, or text) in any language. Lexeme extracts every word,
          teaches you vocabulary in context, and never spoils the story.
        </p>

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

        <div className="card max-w-md mx-auto mb-8">
          <h2 className="text-2xl font-heading font-semibold mb-6 text-gray-900">
            Get Started
          </h2>

          {/* Upload Error */}
          {uploadError && (
            <div className="mb-4">
              <ErrorMessage
                title={uploadError.title}
                message={uploadError.message}
                details={uploadError.details}
                suggestions={uploadError.suggestions}
                onRetry={() => {
                  setUploadError(null);
                  fileInputRef.current?.click();
                }}
                onDismiss={() => setUploadError(null)}
              />
            </div>
          )}

          {!isAuthenticated ? (
            <div className="space-y-4">
              {!showLogin && !showRegister && (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="btn-primary w-full py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Sign in to your account"
                  >
                    <span aria-hidden="true">🔐</span> Sign In
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="btn-secondary w-full py-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    aria-label="Create a new account"
                  >
                    <span aria-hidden="true">✨</span> Create Account
                  </button>
                </>
              )}

              {showLogin && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">Sign In</h3>
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {authError}
                    </div>
                  )}
                  
                  {/* Google Sign In Button */}
                  <button
                    onClick={loginWithGoogle}
                    className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowLogin(false);
                        setAuthError('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setAuthError('');
                          setIsLoggingIn(true);
                          
                          await login(loginData.username, loginData.password);
                          setShowLogin(false);
                          setIsLoggingIn(false);
                          showToast('Welcome back!', 'success');
                          // Check onboarding status before navigating
                          const onboardingCompleted = localStorage.getItem('onboarding_completed');
                          if (onboardingCompleted) {
                            navigate('/books');
                          } else {
                            navigate('/onboarding');
                          }
                        } catch (err) {
                          console.error('Login error in handler:', err);
                          const errorMsg = err instanceof Error ? err.message : 'Login failed';
                          setAuthError(errorMsg);
                          setIsLoggingIn(false);
                        }
                      }}
                      disabled={isLoggingIn}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingIn ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                </div>
              )}

              {showRegister && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">Create Account</h3>
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {authError}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRegister(false);
                        setAuthError('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await register(registerData.username, registerData.email, registerData.password);
                          setShowRegister(false);
                          showToast('Account created successfully!', 'success');
                          navigate('/onboarding');
                        } catch (err) {
                          const errorMsg = err instanceof Error ? err.message : 'Registration failed';
                          setAuthError(errorMsg);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !isUploading ? (
            <div className="space-y-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Upload button clicked');
                  
                  if (isUploading) {
                    console.warn('Upload already in progress');
                    return;
                  }
                  
                  // Try multiple methods to trigger file input
                  const fileInput = fileInputRef.current || document.getElementById('file-upload-input') as HTMLInputElement;
                  
                  if (fileInput) {
                    try {
                      // Ensure input is accessible
                      fileInput.style.display = 'none';
                      fileInput.click();
                      console.log('File input click triggered successfully');
                    } catch (error) {
                      console.error('Error triggering file input:', error);
                      setUploadError({
                        title: 'Upload Error',
                        message: 'Failed to open file picker. Please try again.',
                        suggestions: ['Refresh the page and try again', 'Check browser console for details']
                      });
                    }
                  } else {
                    console.error('File input not found!');
                    setUploadError({
                      title: 'Upload Error',
                      message: 'File input not available. Please refresh the page.',
                      suggestions: ['Refresh the page', 'Check that JavaScript is enabled']
                    });
                  }
                }}
                disabled={isUploading}
                className="btn-primary w-full py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload a book file"
                type="button"
              >
                <span aria-hidden="true">📖</span> {isUploading ? 'Uploading...' : 'Upload Your Book'}
              </button>

              <button
                onClick={() => navigate('/books')}
                className="btn-secondary w-full py-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                aria-label="View your library"
              >
                <span aria-hidden="true">📚</span> My Books
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <ProgressBar
                progress={uploadProgress}
                message={
                  uploadProgress < 30 
                    ? "Uploading file..." 
                    : uploadProgress >= 30 && uploadProgress < 60 
                    ? "Extracting text..." 
                    : uploadProgress >= 60 && uploadProgress < 90 
                    ? "Analyzing vocabulary..." 
                    : "Processing complete!"
                }
                showTimeEstimate={uploadProgress > 0 && uploadProgress < 100}
                startTime={uploadStartTime || undefined}
              />
            </div>
          )}

          {/* File input - always rendered so ref works properly */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,.txt,.docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            aria-label="Upload book file"
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
