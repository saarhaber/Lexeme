import React from 'react';

export interface SortOption {
  value: string;
  label: string;
}

interface SortSelectorProps {
  label?: string;
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const SortSelector: React.FC<SortSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label={label || 'Sort by'}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default React.memo(SortSelector);

