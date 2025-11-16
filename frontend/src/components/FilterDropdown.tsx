import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label?: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allOption?: FilterOption;
  showClear?: boolean;
  onClear?: () => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
  allOption = { value: '', label: 'All' },
  showClear = false,
  onClear,
}) => {
  const displayOptions = allOption.value ? [allOption, ...options] : options;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label={label || 'Filter'}
        >
          {displayOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {showClear && value && onClear && (
          <button
            onClick={onClear}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            aria-label="Clear filter"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(FilterDropdown);

