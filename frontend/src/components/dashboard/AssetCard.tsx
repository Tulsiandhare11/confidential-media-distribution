import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, FilmIcon, LoaderCircleIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Photo } from '../../types/api';
import { photoStatusMeta, shortHash } from '../../utils/format';
import { deletePhoto, errorMessage } from '../../api';
import { AuthImage } from '../AuthImage';
import { StatusBadge } from '../StatusBadge';

export function AssetCard({ photo, onDeleted }: {photo: Photo; onDeleted?: () => void;}) {
  const status = photoStatusMeta(photo.status);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isVideo = photo.mediaType === 'video';

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await deletePhoto(photo.id);
      toast.success('Asset deleted');
      onDeleted?.();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <Link
      to={`/review/${photo.id}`}
      state={{ photo }}
      className="surface-card group relative flex flex-col overflow-hidden transition-transform duration-200 ease-out hover:-translate-y-0.5">

      <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
        <AuthImage
          photoId={photo.id}
          alt={photo.title}
          mediaType={photo.mediaType}
          posterUrl={photo.previewUrl} />
        <div className="absolute left-3 top-3">
          <StatusBadge tone={status.tone} className="bg-opacity-95 shadow-sm">
            {status.label}
          </StatusBadge>
        </div>
        {isVideo &&
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-extrabold text-white">
            <FilmIcon className="h-3 w-3" aria-hidden /> Video
          </span>
        }
        <button
          type="button"
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          disabled={deleting}
          title={confirming ? 'Click again to confirm delete' : 'Delete asset'}
          className={`absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-extrabold shadow-sm transition-colors ${
          confirming ?
          'bg-brick-600 text-white' :
          'bg-cream-50/95 text-taupe-700 hover:bg-brick-50 hover:text-brick-700'}`
          }>

          {deleting ?
          <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" aria-hidden /> :

          <Trash2Icon className="h-3.5 w-3.5" aria-hidden />
          }
          {confirming && !deleting && 'Confirm'}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-[15px] font-extrabold text-ink">{photo.title}</h3>
        {photo.filename && <p className="mt-0.5 truncate text-xs text-taupe-700">{photo.filename}</p>}
        <p className="mono mt-3 truncate text-[11px] text-taupe-600" title={photo.sha256}>
          sha256 {shortHash(photo.sha256)}
        </p>
        <div className="mt-auto flex items-center gap-4 border-t border-cream-300 pt-3 text-sm text-taupe-700">
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5" aria-hidden />
            <span className="font-bold text-ink">{photo.recipientCount}</span>
            {photo.recipientCount === 1 ? 'recipient' : 'recipients'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <EyeIcon className="h-3.5 w-3.5" aria-hidden />
            <span className="font-bold text-ink">{photo.viewCount}</span>
            {photo.viewCount === 1 ? 'view' : 'views'}
          </span>
        </div>
      </div>
    </Link>);

}