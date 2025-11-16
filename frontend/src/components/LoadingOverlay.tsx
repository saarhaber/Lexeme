import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  progress,
  showProgress = false,
}) => {
  if (!isLoading) return null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      style={{
        animation: prefersReducedMotion ? 'none' : 'fadeIn 0.2s ease-in',
      }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {!prefersReducedMotion && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          )}
          <p className="text-gray-700 text-lg font-medium mb-2">{message}</p>
          
          {showProgress && progress !== undefined && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;

