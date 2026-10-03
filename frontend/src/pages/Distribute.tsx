import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, uploadPhoto } from '../api';
import type { Photo } from '../types/api';
import { CloudinaryPanel } from '../components/CloudinaryPanel';
import type { AnalysisPhase } from '../components/CloudinaryPanel';
import { CloudinaryTag } from '../components/CloudinaryTag';
import { DropZone } from '../components/DropZone';
import { ErrorState } from '../components/ErrorState';
import { shortHash } from '../utils/format';

export function Distribute() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ''));
    setError(null);
    setPhoto(null);
    setPhase('idle');
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setPhase('processing');
    setError(null);
    try {
      const result = await uploadPhoto(file, title.trim() || file.name);
      setPhoto(result);
      setPhase('done');
      toast.success('Upload complete — analysis ready');
    } catch (err) {
      setPhase('error');
      setError(errorMessage(err));
    }
  };

  const busy = phase === 'processing';

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 lg:px-10 lg:py-10 lg:pr-20">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-taupe-700 hover:text-espresso">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">Distribute new asset</h1>
      <p className="mt-2 text-[15px] text-taupe-700">
        Upload the original. It's scanned and fingerprinted before anyone can receive a copy.
      </p>

      <div className="surface-card mt-8 p-6 lg:p-8">
        {!file && <DropZone onFile={chooseFile} title="Drop an image here, or browse" hint="JPG, PNG, HEIC or WebP" />}

        {file && preview &&
        <form onSubmit={upload} className="grid gap-6 sm:grid-cols-[220px_1fr]">
            <div className="relative overflow-hidden rounded-2xl bg-cream-200">
              <img src={preview} alt="Selected file preview" className="aspect-square w-full object-cover" />
              {!busy && !photo &&
            <button
              type="button"
              onClick={() => setFile(null)}
              className="absolute right-2 top-2 rounded-full bg-cream-50/90 p-1.5 text-espresso shadow-sm"
              aria-label="Remove file">
              
                  <XIcon className="h-3.5 w-3.5" />
                </button>
            }
            </div>

            <div className="flex flex-col">
              <label htmlFor="asset-title" className="text-sm font-bold text-ink">
                Asset title
              </label>
              <input
              id="asset-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy || Boolean(photo)}
              required
              className="field mt-1.5" />
            
              <p className="mt-2 truncate text-xs text-taupe-700">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              {busy &&
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-espresso">
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
                  Uploading and analysing — open the Cloudinary AI tab for live status.
                </p>
            }

              {photo &&
            <div className="mt-5 rounded-2xl bg-sage-50 p-4 ring-1 ring-inset ring-sage-600/20">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-sage-700">
                      <CircleCheckIcon className="h-4 w-4" aria-hidden /> Fingerprinted & analysed
                    </p>
                    <CloudinaryTag />
                  </div>
                  <p className="mt-2 text-sm text-ink">
                    {photo.analysis.faces.length} {photo.analysis.faces.length === 1 ? 'face' : 'faces'} ·{' '}
                    {photo.analysis.textRegions} text {photo.analysis.textRegions === 1 ? 'region' : 'regions'}
                  </p>
                  <p className="mono mt-1 truncate text-[11px] text-taupe-700" title={photo.sha256}>
                    sha256 {shortHash(photo.sha256, 16)}
                  </p>
                </div>
            }

              {error &&
            <div className="mt-5">
                  <ErrorState message={error} compact />
                </div>
            }

              <div className="mt-auto flex justify-end pt-6">
                {photo ?
              <button type="button" className="btn-primary" onClick={() => navigate(`/review/${photo.id}`, { state: { photo } })}>
                    Continue to review & share <ArrowRightIcon className="h-4 w-4" aria-hidden />
                  </button> :

              <button type="submit" className="btn-primary" disabled={busy}>
                    {busy && <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />}
                    {busy ? 'Analysing…' : phase === 'error' ? 'Try upload again' : 'Upload & analyse'}
                  </button>
              }
              </div>
            </div>
          </form>
        }
        {!file && error &&
        <div className="mt-4">
            <ErrorState message={error} compact />
          </div>
        }
      </div>

      <CloudinaryPanel phase={phase} analysis={photo?.analysis ?? null} />
    </div>);

}