import React from 'react';

export function CloudinaryMark({ className = 'h-4 w-4' }: {className?: string;}) {
  return (
    <svg viewBox="0 0 32 24" fill="none" className={`text-cloudinary ${className}`} aria-hidden>
      <path
        d="M8.5 20.5H7.6A5.6 5.6 0 0 1 6.9 9.35 8.6 8.6 0 0 1 23.4 7.4a6.6 6.6 0 0 1 1.3 13.1h-.9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round" />
      
      <path d="M12 14.5v7M16 12.5v9M20 14.5v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>);

}