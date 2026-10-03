import React from 'react';
import type { BadgeTone } from '../types/ui';

interface StatusBadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, {wrap: string;dot: string;}> = {
  safe: { wrap: 'bg-sage-50 text-sage-700 ring-sage-600/20', dot: 'bg-sage-600' },
  review: { wrap: 'bg-honey-50 text-honey-700 ring-honey-600/20', dot: 'bg-honey-600' },
  danger: { wrap: 'bg-brick-50 text-brick-700 ring-brick-600/20', dot: 'bg-brick-600' },
  neutral: { wrap: 'bg-cream-200 text-taupe-700 ring-taupe-500/25', dot: 'bg-taupe-500' },
  accent: { wrap: 'bg-terracotta-50 text-terracotta-700 ring-terracotta/30', dot: 'bg-terracotta' }
};

export function StatusBadge({ tone, children, className = '' }: StatusBadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${t.wrap} ${className}`}>
      
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
      {children}
    </span>);

}