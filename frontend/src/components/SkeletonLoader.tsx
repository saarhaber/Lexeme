import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'list' | 'table' | 'book' | 'stats';
  lines?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  lines = 3,
  className = '',
}) => {
  if (variant === 'card') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'book') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-6 shadow-soft-card">
          <div className="flex gap-4">
            <div className="h-16 w-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'stats') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-4">
              <div className="h-8 w-8 bg-gray-200 rounded mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="divide-y divide-gray-200">
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="p-4 flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default: text variant
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 rounded ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
};

export default SkeletonLoader;

