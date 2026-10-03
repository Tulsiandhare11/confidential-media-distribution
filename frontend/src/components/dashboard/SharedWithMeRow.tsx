
import { Link } from 'react-router-dom';
import { ClockIcon, LockKeyholeIcon } from 'lucide-react';
import type { SharedWithMe } from '../../types/api';
import { tierMeta } from '../../data/accessTiers';
import { formatCountdown } from '../../utils/format';
import { StatusBadge } from '../StatusBadge';

export function SharedWithMeRow({ share, now }: {share: SharedWithMe;now: number;}) {
  const tier = tierMeta(share.tier);
  const countdown = formatCountdown(share.expiresAt, now);
  const sender = share.senderName || share.senderEmail || 'Unknown sender';

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-200 text-espresso">
        <LockKeyholeIcon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold text-ink">{share.photoTitle}</p>
        <p className="truncate text-sm text-taupe-700">
          From <span className="font-bold text-espresso-700">{sender}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`mono inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${
          countdown.expired ? 'text-brick-700' : countdown.urgent ? 'text-honey-700' : 'text-taupe-700'}`
          }>
          
          <ClockIcon className="h-3.5 w-3.5" aria-hidden />
          {countdown.label}
        </span>
        <StatusBadge tone={tier.tone}>{tier.label}</StatusBadge>
        {countdown.expired ?
        <span className="btn-secondary pointer-events-none !h-9 opacity-60">Expired</span> :

        <Link to={`/viewer/${share.photoId}`} state={{ title: share.photoTitle }} className="btn-primary !h-9 !px-3.5 text-sm">
            Open in secure viewer
          </Link>
        }
      </div>
    </li>);

}