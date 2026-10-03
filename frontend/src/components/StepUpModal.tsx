import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CircleAlertIcon, KeyRoundIcon, LoaderCircleIcon } from 'lucide-react';
import { ApiError } from '../api';

interface StepUpModalProps {
  email: string;
  sending: boolean;
  sendError: string | null;
  onResend: () => void;
  onConfirm: (code: string) => Promise<void>;
}

export function StepUpModal({ email, sending, sendError, onResend, onConfirm }: StepUpModalProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(code.trim());
    } catch (err) {
      const network = err instanceof ApiError && err.status === 0;
      setError(network ? err.message : 'Invalid or expired code');
      inputRef.current?.select();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-espresso-900/25 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        aria-hidden />
      
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stepup-title"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className="surface-card relative w-full max-w-md p-7">
        
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-terracotta-50 text-terracotta-700 ring-1 ring-inset ring-terracotta/25">
          <KeyRoundIcon className="h-5 w-5" aria-hidden />
        </span>
        <h2 id="stepup-title" className="mt-4 text-xl font-extrabold text-ink">
          Confirm it's you
        </h2>
        <p className="mt-1.5 text-sm text-taupe-700">
          This asset is shared at Full access. Enter the verification code sent to confirm it's you
          {email &&
          <>
              {' '}
              — we sent it to <span className="font-bold text-ink">{email}</span>
            </>
          }
          .
        </p>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="stepup-code" className="text-sm font-bold text-ink">
            Verification code
          </label>
          <input
            id="stepup-code"
            ref={inputRef}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\s/g, '').toUpperCase());
              if (error) setError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="••••••"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'stepup-error' : undefined}
            className="field mono mt-2 !h-14 text-center !text-2xl tracking-[0.45em]" />
          
          {error &&
          <p id="stepup-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-bold text-brick-700">
              <CircleAlertIcon className="h-4 w-4" aria-hidden /> {error}
            </p>
          }
          {sendError &&
          <p role="alert" className="mt-2 text-sm font-semibold text-brick-700">
              Couldn't send a code: {sendError}
            </p>
          }

          <button type="submit" disabled={submitting || !code.trim()} className="btn-primary mt-5 w-full">
            {submitting && <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? 'Confirming…' : 'Unlock secure view'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/" className="font-bold text-taupe-700 hover:text-espresso">
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={onResend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 font-bold text-terracotta-700 hover:text-terracotta-600 disabled:opacity-60">
            
            {sending && <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {sending ? 'Sending…' : 'Send a new code'}
          </button>
        </div>
      </motion.div>
    </div>);

}