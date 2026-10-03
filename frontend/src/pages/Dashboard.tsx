
import { Link } from 'react-router-dom';
import { ImagePlusIcon, InboxIcon, PlusIcon } from 'lucide-react';
import { getMyPhotos, getSharedWithMe } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { useNow } from '../hooks/useNow';
import { AssetCard } from '../components/dashboard/AssetCard';
import { SharedWithMeRow } from '../components/dashboard/SharedWithMeRow';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

export function Dashboard() {
  const { user } = useAuth();
  const now = useNow();
  const photos = useApiResource(getMyPhotos, []);
  const shared = useApiResource(getSharedWithMe, []);

  const firstName = user?.name?.split(' ')[0];
  const recipientTotal = (photos.data ?? []).reduce((sum, p) => sum + p.recipientCount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
      <section className="surface-card hero-surface flex flex-col gap-6 p-7 sm:flex-row sm:items-end sm:justify-between lg:p-9">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="mt-2 max-w-lg text-[15px] text-taupe-700">
            {photos.data ?
            `${photos.data.length} ${photos.data.length === 1 ? 'asset' : 'assets'} under protection, distributed to ${recipientTotal} ${recipientTotal === 1 ? 'recipient' : 'recipients'}.` :
            'Every copy you share is watermarked, access-controlled, and traceable.'}
          </p>
        </div>
        <Link to="/distribute" className="btn-primary self-start sm:self-auto">
          <PlusIcon className="h-4 w-4" aria-hidden />
          Distribute new asset
        </Link>
      </section>

      <section className="mt-10" aria-labelledby="assets-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="assets-heading" className="text-xl font-extrabold text-ink">
            Your assets
          </h2>
          {photos.data && photos.data.length > 0 &&
          <span className="text-sm text-taupe-700">{photos.data.length} total</span>
          }
        </div>
        <div className="mt-4">
          {photos.error && <ErrorState message={photos.error} onRetry={photos.reload} />}
          {photos.loading && !photos.data &&
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) =>
            <div key={i} className="surface-card overflow-hidden">
                  <div className="aspect-[4/3] animate-pulse bg-cream-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-cream-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-cream-200" />
                  </div>
                </div>
            )}
            </div>
          }
          {photos.data && photos.data.length === 0 &&
          <div className="surface-card">
              <EmptyState
              icon={ImagePlusIcon}
              title="No assets yet"
              body="Upload a sensitive image to choose what to hide, who sees it, and how long access lasts."
              action={
              <Link to="/distribute" className="btn-primary">
                    <PlusIcon className="h-4 w-4" aria-hidden /> Distribute new asset
                  </Link>
              } />
            
            </div>
          }
          {photos.data && photos.data.length > 0 &&
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
             {photos.data.map((photo) =>
  <AssetCard key={photo.id} photo={photo} onDeleted={photos.reload} />
)}
            </div>
          }
        </div>
      </section>

      <section className="mt-12" aria-labelledby="shared-heading">
        <h2 id="shared-heading" className="text-xl font-extrabold text-ink">
          Shared with you
        </h2>
        <div className="mt-4">
          {shared.error && <ErrorState message={shared.error} onRetry={shared.reload} />}
          {shared.loading && !shared.data &&
          <div className="surface-card space-y-3 p-5">
              {[0, 1].map((i) =>
            <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-200" />
            )}
            </div>
          }
          {shared.data && shared.data.length === 0 &&
          <div className="surface-card">
              <EmptyState
              icon={InboxIcon}
              title="Nothing shared with you"
              body="When someone distributes an asset to your email, it will appear here with its access level and expiry." />
            
            </div>
          }
          {shared.data && shared.data.length > 0 &&
          <ul className="surface-card divide-y divide-cream-300">
              {shared.data.map((share) =>
            <SharedWithMeRow key={share.id} share={share} now={now} />
            )}
            </ul>
          }
        </div>
      </section>
    </div>);

}