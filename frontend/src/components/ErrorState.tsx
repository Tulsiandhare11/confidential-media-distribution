import React from 'react';
import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-2xl border border-brick-100 bg-brick-50/70 text-brick-700 ${compact ? 'p-3 text-sm' : 'p-4'}`}>
      
      <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1 font-semibold">{message}</p>
      {onRetry &&
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-bold transition-colors hover:bg-brick-100">
        
          <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden />
          Retry
        </button>
      }
    </div>);

}