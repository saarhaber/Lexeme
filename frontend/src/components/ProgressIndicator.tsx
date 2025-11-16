import React from 'react';

interface ProgressIndicatorProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (for calculating percentage) */
  max?: number;
  /** Label to display above the progress bar */
  label?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Show current/max values */
  showValues?: boolean;
  /** Color variant */
  variant?: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  showValues = false,
  variant = 'blue',
  size = 'md',
  className = '',
  ariaLabel,
}) => {
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Size classes
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  // Color classes
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
  };

  const bgColorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
  };

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={ariaLabel || label || 'Progress'}>
      {(label || showValues || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          <div className="flex items-center gap-2">
            {showValues && (
              <span className="text-sm text-gray-600">
                {value} / {max}
              </span>
            )}
            {showPercentage && (
              <span className="text-sm font-semibold text-gray-700">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className={`w-full ${heightClasses[size]} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${heightClasses[size]} ${colorClasses[variant]} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
          style={{ width: `${percentage}%` }}
        >
          {/* Animated shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            style={{
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressIndicator;

