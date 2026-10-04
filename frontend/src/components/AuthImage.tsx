import React, { useEffect, useState } from 'react';
import { FilmIcon, ImageOffIcon, PlayIcon } from 'lucide-react';
import { getViewImage } from '../api';
import type { MediaType } from '../types/api';

interface AuthImageProps {
  photoId: string;
  alt: string;
  /** "cover" fills its parent; "natural" keeps the image's own aspect ratio. */
  fit?: 'cover' | 'natural';
  className?: string;
  /** For videos, no bytes are downloaded: the poster frame (or a placeholder) is shown. */
  mediaType?: MediaType;
  posterUrl?: string;
}

/** Loads an image through the authenticated /view/:id/image endpoint as a blob. */
export function AuthImage({
  photoId,
  alt,
  fit = 'cover',
  className = '',
  mediaType = 'image',
  posterUrl
}: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const isVideo = mediaType === 'video';
  const box = fit === 'cover' ? 'h-full w-full' : 'aspect-[4/3] w-full';

  useEffect(() => {
    // Never download a whole video just to draw a thumbnail
    if (isVideo) return undefined;
    let url: string | null = null;
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    getViewImage(photoId).
    then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    }).
    catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photoId, isVideo]);

  if (isVideo) {
    return (
      <div className={`relative overflow-hidden bg-espresso-900 ${box} ${className}`}>
        {posterUrl && !posterFailed ?
        <img
          src={posterUrl}
          alt={alt}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onError={() => setPosterFailed(true)}
          className="h-full w-full select-none object-cover" /> :

        <div className="flex h-full w-full items-center justify-center text-cream-200">
            <FilmIcon className="h-8 w-8" aria-hidden />
          </div>
        }
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/50 p-2.5 text-white">
            <PlayIcon className="h-5 w-5" aria-hidden />
          </span>
        </span>
      </div>);

  }

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-cream-200 text-taupe-600 ${box} ${className}`}>
        <ImageOffIcon className="h-5 w-5" aria-hidden />
        <span className="text-xs font-semibold">Preview unavailable</span>
      </div>);

  }

  if (!src) {
    return <div className={`animate-pulse bg-cream-200 ${box} ${className}`} aria-label="Loading image" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className={`${fit === 'cover' ? 'h-full w-full object-cover' : 'block h-auto w-full'} select-none ${className}`} />);

}