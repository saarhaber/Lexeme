import React from 'react';

const marks = {
  books: (
    <>
      <path d="M4 6.5C4 5.5 4.8 5 6 5h5v14H6c-1.2 0-2-.5-2-1.5V6.5Z" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M20 6.5C20 5.5 19.2 5 18 5h-5v14h5c1.2 0 2-.5 2-1.5V6.5Z" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M11 5v14" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </>
  ),
  tap: (
    <>
      <ellipse cx="12" cy="11" rx="5" ry="3.25" stroke="currentColor" strokeWidth="1.25" fill="currentColor" fillOpacity="0.14" />
      <path d="M6.5 16.5h11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  sepia: (
    <>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path
        d="M12 4.5a7.5 7.5 0 0 1 0 15"
        stroke="currentColor"
        strokeWidth="1.25"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </>
  ),
  finish: (
    <>
      <path d="M6 5h8l4 4v10H6V5Z" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M14 5v4h4" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M9 13h6M9 16.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
} as const;

export type FeatureMarkId = keyof typeof marks;

const FeatureMark: React.FC<{ id: FeatureMarkId; className?: string }> = ({ id, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`h-6 w-6 shrink-0 text-primary ${className}`}
    fill="none"
  >
    {marks[id]}
  </svg>
);

export default FeatureMark;
