import React from 'react';
import { LockKeyholeIcon } from 'lucide-react';

export function BrandMark({ size = 'md' }: {size?: 'md' | 'lg';}) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${box} border border-espresso-800 bg-[linear-gradient(180deg,#6c4837_0%,#4a3024_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_14px_-6px_rgba(42,27,20,0.6)]`}
      aria-hidden>
      
      <LockKeyholeIcon className={size === 'lg' ? 'h-5 w-5 text-cream-100' : 'h-4 w-4 text-cream-100'} />
    </span>);

}