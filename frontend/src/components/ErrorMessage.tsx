import React from 'react';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  suggestions?: string[];
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  details,
  suggestions = [],
  onRetry,
  onDismiss,
  className = '',
}) => {
  const getDefaultSuggestions = (errorMessage: string): string[] => {
    const lowerMessage = errorMessage.toLowerCase();
    const suggestions: string[] = [];

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
    } else if (lowerMessage.includes('file') || lowerMessage.includes('upload')) {
      suggestions.push('Make sure the file is not corrupted');
      suggestions.push('Try a different file format');
      suggestions.push('Check that the file size is not too large');
    } else if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
      suggestions.push('Try logging out and back in');
      suggestions.push('Check that your session hasn\'t expired');
    } else if (lowerMessage.includes('server') || lowerMessage.includes('500')) {
      suggestions.push('The server may be temporarily unavailable');
      suggestions.push('Try again in a few minutes');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('If the problem persists, contact support');
    }

    return suggestions;
  };

  const displaySuggestions = suggestions.length > 0 ? suggestions : getDefaultSuggestions(message);

  return (
    <div
      className={`bg-red-50 border-l-4 border-red-400 p-4 rounded-lg ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">{title}</h3>
          <p className="text-sm text-red-700 mb-2">{message}</p>
          
          {details && (
            <details className="mb-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Technical details
              </summary>
              <p className="text-xs text-red-600 mt-1 ml-4 font-mono">{details}</p>
            </details>
          )}

          {displaySuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-800 mb-1">What you can do:</p>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {displaySuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                aria-label="Retry the operation"
              >
                <svg
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                aria-label="Dismiss error message"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;

