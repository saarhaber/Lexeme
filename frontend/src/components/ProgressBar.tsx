import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showTimeEstimate?: boolean;
  startTime?: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showTimeEstimate = false,
  startTime,
  className = '',
}) => {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (showTimeEstimate && startTime && progress > 0 && progress < 100) {
      const elapsed = Date.now() - startTime;
      const rate = progress / elapsed; // progress per millisecond
      const remaining = (100 - progress) / rate; // milliseconds remaining
      setEstimatedTimeRemaining(Math.max(0, Math.round(remaining / 1000))); // convert to seconds
    } else if (progress >= 100) {
      setEstimatedTimeRemaining(null);
    }
  }, [progress, startTime, showTimeEstimate]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`w-full ${className}`}>
      {message && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">{message}</p>
          {showTimeEstimate && estimatedTimeRemaining !== null && (
            <p className="text-xs text-gray-500">
              ~{formatTime(estimatedTimeRemaining)} remaining
            </p>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out relative"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={message || 'Progress'}
        >
          {progress > 0 && progress < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
          )}
        </div>
      </div>
      {progress > 0 && progress < 100 && (
        <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(progress)}%</p>
      )}
    </div>
  );
};

export default ProgressBar;

