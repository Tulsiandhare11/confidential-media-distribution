import React, { useEffect, useState } from 'react';
import { ImageOffIcon } from 'lucide-react';
import { getViewImage } from '../api';

interface AuthImageProps {
  photoId: string;
  alt: string;
  /** "cover" fills its parent; "natural" keeps the image's own aspect ratio. */
  fit?: 'cover' | 'natural';
  className?: string;
}

/** Loads an image through the authenticated /view/:id/image endpoint as a blob. */
export function AuthImage({ photoId, alt, fit = 'cover', className = '' }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
  }, [photoId]);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-cream-200 text-taupe-600 ${fit === 'cover' ? 'h-full w-full' : 'aspect-[4/3] w-full'} ${className}`}>
        
        <ImageOffIcon className="h-5 w-5" aria-hidden />
        <span className="text-xs font-semibold">Preview unavailable</span>
      </div>);

  }

  if (!src) {
    return (
      <div
        className={`animate-pulse bg-cream-200 ${fit === 'cover' ? 'h-full w-full' : 'aspect-[4/3] w-full'} ${className}`}
        aria-label="Loading image" />);


  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className={`${fit === 'cover' ? 'h-full w-full object-cover' : 'block h-auto w-full'} select-none ${className}`} />);


}