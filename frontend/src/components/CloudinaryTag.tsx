
import { CloudinaryMark } from './CloudinaryMark';

export function CloudinaryTag({ label = 'Cloudinary AI' }: {label?: string;}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-taupe-700 ring-1 ring-inset ring-taupe-500/20">
      <CloudinaryMark className="h-3 w-3.5" />
      {label}
    </span>);

}