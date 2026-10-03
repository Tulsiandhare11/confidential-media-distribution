import React, { useEffect, useState } from 'react';
import { LoaderCircleIcon, RotateCcwIcon } from 'lucide-react';
import { errorMessage, verifyMedia } from '../api';
import type { VerifyResponse } from '../types/api';
import { CloudinaryTag } from '../components/CloudinaryTag';
import { DropZone } from '../components/DropZone';
import { ErrorState } from '../components/ErrorState';
import { VerifyResultCard } from '../components/verify/VerifyResultCard';

export function VerifyTrace() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const check = async (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setChecking(true);
    try {
      setResult(await verifyMedia(f));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Verify & Trace</h1>
          <p className="mt-2 max-w-xl text-[15px] text-taupe-700">
            Found a copy in the wild? Drop it here to check whether it's an original, a modified copy, or traceable to the
            recipient who leaked it.
          </p>
        </div>
        <CloudinaryTag />
      </div>

      <div className="surface-card mt-8 p-6 lg:p-8">
        {!file && <DropZone onFile={check} title="Drop a suspected copy here" hint="Screenshots, re-saves and crops all work" />}

        {file &&
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div>
              {preview &&
            <img src={preview} alt="File being verified" className="aspect-square w-full rounded-2xl bg-cream-200 object-cover" />
            }
              <p className="mt-2 truncate text-xs text-taupe-700">{file.name}</p>
              {!checking &&
            <button type="button" onClick={reset} className="btn-secondary mt-3 w-full !h-9 text-sm">
                  <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden /> Check another file
                </button>
            }
            </div>

            <div className="min-w-0">
              {checking &&
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-[20px] bg-cream-50 text-center ring-1 ring-inset ring-cream-300">
                  <LoaderCircleIcon className="h-6 w-6 animate-spin text-espresso" aria-hidden />
                  <p className="text-sm font-bold text-ink">Comparing against your distribution ledger…</p>
                  <p className="text-xs text-taupe-700">Checking fingerprints and recipient watermarks</p>
                </div>
            }
              {error && <ErrorState message={error} onRetry={() => check(file)} />}
              {result && <VerifyResultCard result={result} />}
            </div>
          </div>
        }
      </div>
    </div>);

}