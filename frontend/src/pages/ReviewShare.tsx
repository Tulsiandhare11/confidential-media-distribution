import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeftIcon, LoaderCircleIcon } from 'lucide-react';
import { getMyPhotos, getPhotoShares } from '../api';
import type { Photo } from '../types/api';
import { useApiResource } from '../hooks/useApiResource';
import { photoStatusMeta, shortHash } from '../utils/format';
import { CloudinaryPanel } from '../components/CloudinaryPanel';
import { CustodyTimeline } from '../components/CustodyTimeline';
import { ErrorState } from '../components/ErrorState';
import { FaceProtectionEditor } from '../components/review/FaceProtectionEditor';
import { RecipientList } from '../components/review/RecipientList';
import { ShareForm } from '../components/review/ShareForm';
import { StatusBadge } from '../components/StatusBadge';

export function ReviewShare() {
  const { photoId = '' } = useParams();
  const location = useLocation();
  const statePhoto = (location.state as {photo?: Photo;} | null)?.photo;

  const photo = useApiResource(async () => {
    if (statePhoto && statePhoto.id === photoId) return statePhoto;
    const mine = await getMyPhotos();
    const found = mine.find((p) => p.id === photoId);
    if (!found) throw new Error('This asset was not found in your library.');
    return found;
  }, [photoId]);

  const shares = useApiResource(() => getPhotoShares(photoId), [photoId]);

  const [protectedFaces, setProtectedFaces] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (photo.data) setProtectedFaces(new Set(photo.data.analysis.faces.map((_, i) => i)));
  }, [photo.data]);

  const protectedList = useMemo(() => Array.from(protectedFaces).sort((a, b) => a - b), [protectedFaces]);

  const toggleFace = (index: number, protect: boolean) => {
    setProtectedFaces((prev) => {
      const next = new Set(prev);
      if (protect) next.add(index);else
      next.delete(index);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10 lg:py-10 lg:pr-20">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-taupe-700 hover:text-espresso">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      {photo.loading && !photo.data &&
      <div className="mt-10 flex items-center gap-2 text-sm font-semibold text-taupe-700">
          <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden /> Loading asset…
        </div>
      }
      {photo.error &&
      <div className="mt-6">
          <ErrorState message={photo.error} onRetry={photo.reload} />
        </div>
      }

      {photo.data &&
      <>
          <header className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-extrabold tracking-tight text-ink">{photo.data.title}</h1>
              <p className="mono mt-1 truncate text-xs text-taupe-600" title={photo.data.sha256}>
                sha256 {shortHash(photo.data.sha256, 20)}
              </p>
            </div>
            <StatusBadge tone={photoStatusMeta(photo.data.status).tone}>{photoStatusMeta(photo.data.status).label}</StatusBadge>
          </header>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <FaceProtectionEditor photo={photo.data} protectedFaces={protectedFaces} onToggle={toggleFace} />
              <RecipientList shares={shares.data} loading={shares.loading} error={shares.error} onReload={shares.reload} />
              <section className="surface-card p-6">
                <CustodyTimeline photoId={photo.data.id} collapsible />
              </section>
            </div>
            <div className="lg:sticky lg:top-8">
              <ShareForm photoId={photo.data.id} protectedFaceIndexes={protectedList} onShared={shares.reload} />
            </div>
          </div>
        </>
      }

      <CloudinaryPanel phase={photo.data ? 'done' : 'idle'} analysis={photo.data?.analysis ?? null} />
    </div>);

}