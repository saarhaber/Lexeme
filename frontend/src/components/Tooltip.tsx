import React, { useState, useEffect } from 'react';

interface TooltipProps {
  /** Tooltip content */
  content: string;
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Whether tooltip is visible */
  visible?: boolean;
  /** Callback when tooltip should be dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Children element that triggers the tooltip */
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  visible = false,
  onDismiss,
  className = '',
  children,
}) => {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg max-w-xs transition-opacity duration-200`}
          role="tooltip"
          aria-live="polite"
        >
          {content}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-1 right-1 text-white hover:text-gray-300 focus:outline-none"
              aria-label="Dismiss tooltip"
            >
              ×
            </button>
          )}
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;

