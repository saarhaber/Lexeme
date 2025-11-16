import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ErrorMessage from '../components/ErrorMessage';

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { register, login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<{
    title?: string;
    message: string;
    details?: string;
    suggestions?: string[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Skip onboarding if already authenticated AND onboarding is completed
  React.useEffect(() => {
    if (isAuthenticated) {
      const onboardingCompleted = localStorage.getItem('onboarding_completed');
      if (onboardingCompleted) {
        navigate('/books');
      }
      // If authenticated but onboarding not completed, stay on onboarding page
    }
  }, [isAuthenticated, navigate]);

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'username':
        if (!value.trim()) {
          return 'Username is required';
        }
        if (value.length < 3) {
          return 'Username must be at least 3 characters';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          return 'Username can only contain letters, numbers, and underscores';
        }
        return undefined;
      case 'email':
        if (!value.trim()) {
          return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        return undefined;
      case 'password':
        if (!value) {
          return 'Password is required';
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters';
        }
        return undefined;
      case 'confirmPassword':
        if (!value) {
          return 'Please confirm your password';
        }
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user starts typing
    if (name in fieldErrors && fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors({ ...fieldErrors, [name]: undefined });
    }
    
    // Validate field in real-time if it's been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors({ ...fieldErrors, [name]: error });
    }
  };

  const handleFieldBlur = (name: string) => {
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, formData[name as keyof typeof formData]);
    setFieldErrors({ ...fieldErrors, [name]: error });
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        errors[key as keyof FieldErrors] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    return isValid;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleRegister = async () => {
    setError(null);
    
    if (!validateForm()) {
      setError({
        title: 'Please fix the errors below',
        message: 'Some fields have validation errors. Please check and correct them.',
        suggestions: []
      });
      return;
    }

    setLoading(true);
    try {
      await register(formData.username, formData.email, formData.password);
      showToast('Account created successfully!', 'success');
      setStep(5);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      const suggestions: string[] = [];
      
      if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('taken')) {
        suggestions.push('Try a different username');
        suggestions.push('The username may already be in use');
      } else if (errorMessage.toLowerCase().includes('email')) {
        suggestions.push('Check that the email is correct');
        suggestions.push('The email may already be registered');
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
        suggestions.push('Check your internet connection');
        suggestions.push('Try again in a few moments');
      }

      setError({
        title: 'Registration failed',
        message: errorMessage,
        suggestions
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/books');
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">📘</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Lexeme
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Learn vocabulary from books you love—without spoilers.
          </p>
          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📖</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Read Any Book</h3>
                <p className="text-gray-600">Upload PDFs, EPUBs, or text files in any language</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-3xl">🔍</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Click to Learn</h3>
                <p className="text-gray-600">Click any word while reading to see its definition</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-3xl">🚫</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Zero Spoilers</h3>
                <p className="text-gray-600">We only show vocabulary from text you've already read</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Smart Review</h3>
                <p className="text-gray-600">Spaced repetition helps you remember words long-term</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleSkip}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">👤</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
            <p className="text-gray-600">Start your vocabulary learning journey</p>
          </div>

          {error && (
            <div className="mb-4">
              <ErrorMessage
                title={error.title}
                message={error.message}
                details={error.details}
                suggestions={error.suggestions}
                onDismiss={() => setError(null)}
              />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                onBlur={() => handleFieldBlur('username')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Choose a username"
                aria-invalid={!!fieldErrors.username}
                aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              />
              {fieldErrors.username && (
                <p id="username-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.username}
                </p>
              )}
              {!fieldErrors.username && touched.username && (
                <p className="mt-1 text-xs text-gray-500">Username looks good!</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="your@email.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.email}
                </p>
              )}
              {!fieldErrors.email && touched.email && (
                <p className="mt-1 text-xs text-gray-500">Email looks good!</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                onBlur={() => handleFieldBlur('password')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="At least 6 characters"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.password}
                </p>
              )}
              {!fieldErrors.password && touched.password && formData.password.length >= 6 && (
                <p className="mt-1 text-xs text-gray-500">Password strength: Good</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                onBlur={() => handleFieldBlur('confirmPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  fieldErrors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Re-enter password"
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p id="confirmPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}
              {!fieldErrors.confirmPassword && touched.confirmPassword && formData.confirmPassword === formData.password && (
                <p className="mt-1 text-xs text-gray-500">Passwords match!</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📤</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your First Book</h2>
            <p className="text-gray-600">Let's get started with your first book</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-gray-600 mb-4">
                Supported formats: PDF, EPUB, TXT, DOCX
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Book
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tip</h3>
              <p className="text-sm text-blue-800">
                Upload any book in the language you're learning. Lexeme will automatically
                extract vocabulary and prepare it for learning.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Learning</h2>
            <p className="text-gray-600">Here's how to use Lexeme</p>
          </div>

          <div className="space-y-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Read Your Book</h3>
                <p className="text-gray-600 text-sm">
                  Click "Start Reading" on any book to open reading mode
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Click Words</h3>
                <p className="text-gray-600 text-sm">
                  Click any word you don't know to see its definition instantly
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Study Vocabulary</h3>
                <p className="text-gray-600 text-sm">
                  Use spaced repetition to review words and remember them long-term
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Track Progress</h3>
                <p className="text-gray-600 text-sm">
                  Watch your vocabulary grow as you read more books
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                localStorage.setItem('onboarding_completed', 'true');
                navigate('/books');
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Reading →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Success
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">You're All Set!</h2>
        <p className="text-gray-600 mb-8">
          Your account has been created. Start uploading books and learning vocabulary!
        </p>
        <button
          onClick={() => {
            localStorage.setItem('onboarding_completed', 'true');
            navigate('/books');
          }}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Go to My Books →
        </button>
      </div>
    </div>
  );
};

export default Onboarding;

