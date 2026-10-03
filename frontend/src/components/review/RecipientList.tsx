import React, { useState } from 'react';
import { LoaderCircleIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, revokeShare } from '../../api';
import type { Share } from '../../types/api';
import { tierMeta } from '../../data/accessTiers';
import { useNow } from '../../hooks/useNow';
import { formatCountdown } from '../../utils/format';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { StatusBadge } from '../StatusBadge';

interface RecipientListProps {
  shares: Share[] | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

export function RecipientList({ shares, loading, error, onReload }: RecipientListProps) {
  const now = useNow();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const revoke = async (share: Share) => {
    setRevoking(share.id);
    try {
      await revokeShare(share.id);
      toast.success(`Access revoked for ${share.viewerEmail}`);
      onReload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRevoking(null);
      setConfirming(null);
    }
  };

  return (
    <section className="surface-card" aria-labelledby="recipients-heading">
      <div className="flex items-center justify-between border-b border-cream-300 px-6 py-4">
        <h2 id="recipients-heading" className="text-base font-extrabold text-ink">
          Recipients
        </h2>
        {shares && <span className="mono text-xs text-taupe-600">{shares.length}</span>}
      </div>

      {error &&
      <div className="p-5">
          <ErrorState message={error} onRetry={onReload} compact />
        </div>
      }
      {loading && !shares &&
      <div className="space-y-2 p-5">
          {[0, 1].map((i) =>
        <div key={i} className="h-10 animate-pulse rounded-xl bg-cream-200" />
        )}
        </div>
      }
      {shares && shares.length === 0 &&
      <EmptyState icon={UsersIcon} title="Not shared yet" body="Recipients you add will appear here. You can revoke access at any time." />
      }
      {shares && shares.length > 0 &&
      <ul className="divide-y divide-cream-300">
          {shares.map((share) => {
          const tier = tierMeta(share.tier);
          const countdown = formatCountdown(share.expiresAt, now);
          const state = share.revoked ?
          { label: 'Revoked', tone: 'danger' as const } :
          countdown.expired ?
          { label: 'Expired', tone: 'neutral' as const } :
          { label: 'Active', tone: 'safe' as const };
          const canRevoke = !share.revoked && !countdown.expired;

          return (
            <li key={share.id} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-ink">{share.viewerName || share.viewerEmail}</p>
                  <p className="mono mt-0.5 truncate text-[11px] text-taupe-600">
                    {share.viewerName && `${share.viewerEmail} · `}share {share.id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  <StatusBadge tone={tier.tone}>{tier.label}</StatusBadge>
                  <span className="mono whitespace-nowrap text-xs text-taupe-700">
                    {share.viewCount}
                    {share.viewLimit ? ` / ${share.viewLimit}` : ''} views
                  </span>
                  {!share.revoked && <span className="mono whitespace-nowrap text-xs text-taupe-700">{countdown.label}</span>}
                  {canRevoke && (
                confirming === share.id ?
                <span className="flex items-center gap-1">
                        <button
                    type="button"
                    onClick={() => revoke(share)}
                    disabled={revoking === share.id}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-brick-600 px-2.5 py-1 text-xs font-extrabold text-white transition-colors hover:bg-brick-700">
                    
                          {revoking === share.id && <LoaderCircleIcon className="h-3 w-3 animate-spin" aria-hidden />}
                          Revoke access
                        </button>
                        <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-taupe-700 hover:bg-cream-200">
                    
                          Cancel
                        </button>
                      </span> :

                <button
                  type="button"
                  onClick={() => setConfirming(share.id)}
                  className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-extrabold text-brick-700 transition-colors hover:bg-brick-50">
                  
                        Revoke
                      </button>)
                }
                </div>
              </li>);

        })}
        </ul>
      }
    </section>);

}