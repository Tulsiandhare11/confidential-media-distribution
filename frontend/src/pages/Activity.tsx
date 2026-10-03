import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HistoryIcon, LoaderCircleIcon } from 'lucide-react';
import { getMyPhotos } from '../api';
import { useApiResource } from '../hooks/useApiResource';
import { shortHash } from '../utils/format';
import { AuthImage } from '../components/AuthImage';
import { CustodyTimeline } from '../components/CustodyTimeline';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

export function Activity() {
  const photos = useApiResource(getMyPhotos, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && photos.data && photos.data.length > 0) setSelectedId(photos.data[0].id);
  }, [photos.data, selectedId]);

  const selected = photos.data?.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Activity</h1>
      <p className="mt-2 text-[15px] text-taupe-700">Every upload, share, view and revocation, signed and in order.</p>

      <div className="mt-8">
        {photos.error && <ErrorState message={photos.error} onRetry={photos.reload} />}
        {photos.loading && !photos.data &&
        <div className="flex items-center gap-2 text-sm font-semibold text-taupe-700">
            <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden /> Loading your assets…
          </div>
        }
        {photos.data && photos.data.length === 0 &&
        <div className="surface-card">
            <EmptyState
            icon={HistoryIcon}
            title="No activity yet"
            body="Once you distribute an asset, its full chain of custody shows up here."
            action={
            <Link to="/distribute" className="btn-primary">
                  Distribute new asset
                </Link>
            } />
          
          </div>
        }

        {photos.data && photos.data.length > 0 &&
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <nav aria-label="Assets" className="surface-card p-2">
              <ul className="space-y-1">
                {photos.data.map((p) => {
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                      <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      aria-current={active}
                      className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-[background-color,box-shadow] duration-150 ${
                      active ? 'glow-active bg-cream-50' : 'hover:bg-cream-100'}`
                      }>
                      
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                          <AuthImage photoId={p.id} alt="" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-ink">{p.title}</span>
                          <span className="mono block truncate text-[11px] text-taupe-600">{shortHash(p.sha256, 8)}</span>
                        </span>
                      </button>
                    </li>);

              })}
              </ul>
            </nav>

            {selected &&
          <section className="surface-card p-6" aria-labelledby="timeline-heading">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-300 pb-4">
                  <h2 id="timeline-heading" className="text-xl font-extrabold text-ink">
                    {selected.title}
                  </h2>
                  <Link to={`/review/${selected.id}`} state={{ photo: selected }} className="btn-secondary !h-9 text-sm">
                    Manage sharing
                  </Link>
                </div>
                <CustodyTimeline key={selected.id} photoId={selected.id} />
              </section>
          }
          </div>
        }
      </div>
    </div>);

}