import React from 'react';

interface SkeletonCardProps {
  variant?: 'book' | 'vocab' | 'study' | 'generic';
  count?: number;
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
  variant = 'generic', 
  count = 1,
  className = '' 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'book':
        return (
          <div className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="p-6">
              {/* Book Header */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              
              {/* Book Info */}
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/6"></div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        );
      
      case 'vocab':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        );
      
      case 'study':
        return (
          <div className="bg-white rounded-lg shadow-md p-8 animate-pulse">
            <div className="text-center">
              <div className="h-16 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
              <div className="space-y-3">
                <div className="h-12 bg-gray-200 rounded w-full"></div>
                <div className="h-12 bg-gray-200 rounded w-full"></div>
                <div className="h-12 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        );
    }
  };

  if (count > 1) {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="mb-4">
            {renderSkeleton()}
          </div>
        ))}
      </div>
    );
  }

  return <div className={className}>{renderSkeleton()}</div>;
};

export default SkeletonCard;

