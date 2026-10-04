import React, { useState } from 'react';
import { CloudUploadIcon } from 'lucide-react';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 40;
const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');

function validate(file: File): string | null {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return 'Use a JPG, PNG or WebP image, or an MP4, MOV or WebM video.';
  }
  const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024) {
    return `${isVideo ? 'Videos' : 'Images'} must be under ${maxMb} MB.`;
  }
  return null;
}

interface DropZoneProps {
  onFile: (file: File) => void;
  title: string;
  hint: string;
  disabled?: boolean;
}

export function DropZone({ onFile, title, hint, disabled = false }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const problem = validate(file);
    if (problem) {
      setLocalError(problem);
      return;
    }
    setLocalError(null);
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-6 py-14 text-center transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-terracotta ${
      dragging ? 'glow-active border-terracotta bg-terracotta-50/70' : 'border-taupe-300 bg-cream-50/70 hover:border-taupe-500'} ${
      disabled ? 'pointer-events-none opacity-60' : ''}`}>

      <input
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }} />

      <span className="surface-card flex h-14 w-14 items-center justify-center !rounded-2xl">
        <CloudUploadIcon className="h-6 w-6 text-espresso" aria-hidden />
      </span>
      <span className="mt-4 text-base font-extrabold text-ink">{title}</span>
      <span className="mt-1 text-sm text-taupe-700">{hint}</span>
      {localError &&
      <span role="alert" className="mt-3 text-sm font-bold text-red-700">{localError}</span>
      }
    </label>);

}