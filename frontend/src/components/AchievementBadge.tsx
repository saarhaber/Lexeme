import React, { useState } from 'react';

interface AchievementBadgeProps {
  /** Achievement title */
  title: string;
  /** Achievement description */
  description: string;
  /** Icon emoji or text */
  icon: string;
  /** Whether the achievement is unlocked */
  unlocked: boolean;
  /** Date when achievement was unlocked */
  unlockedDate?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show celebration animation when unlocked */
  showAnimation?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  title,
  description,
  icon,
  unlocked,
  unlockedDate,
  size = 'md',
  showAnimation = true,
  className = '',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  React.useEffect(() => {
    if (unlocked && showAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unlocked, showAnimation]);

  const sizeClasses = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-24 h-24 text-4xl',
    lg: 'w-32 h-32 text-6xl',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={`relative flex flex-col items-center p-4 rounded-lg transition-all duration-300 ${
        unlocked
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-lg'
          : 'bg-gray-100 border-2 border-gray-300 opacity-60'
      } ${isAnimating ? 'animate-bounce scale-110' : ''} ${className}`}
      role="article"
      aria-label={unlocked ? `Achievement unlocked: ${title}` : `Achievement locked: ${title}`}
    >
      {/* Icon */}
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full mb-2 ${
          unlocked ? 'bg-gradient-to-br from-yellow-200 to-orange-200' : 'bg-gray-300'
        } transition-all duration-300`}
      >
        <span className={unlocked ? '' : 'grayscale'}>{icon}</span>
      </div>

      {/* Title */}
      <h3
        className={`font-semibold text-gray-900 mb-1 ${textSizeClasses[size]} text-center`}
      >
        {title}
      </h3>

      {/* Description */}
      <p className={`text-gray-600 ${textSizeClasses[size]} text-center mb-2`}>
        {description}
      </p>

      {/* Unlocked Date */}
      {unlocked && unlockedDate && (
        <p className={`text-gray-500 ${textSizeClasses[size]} text-center italic`}>
          Unlocked: {new Date(unlockedDate).toLocaleDateString()}
        </p>
      )}

      {/* Lock overlay for locked achievements */}
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50 rounded-lg">
          <span className="text-2xl" aria-hidden="true">🔒</span>
        </div>
      )}

      {/* Celebration particles animation */}
      {unlocked && isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                animationDelay: `${i * 0.1}s`,
                animation: 'celebration 1s ease-out forwards',
                transform: `rotate(${i * 60}deg) translateY(-40px)`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes celebration {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AchievementBadge;

