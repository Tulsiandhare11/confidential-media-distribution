import React from 'react';

interface WatermarkOverlayProps {
  name: string;
  email: string;
  reference: string;
}

/** Tiled, per-recipient watermark drawn over the secure image. */
export function WatermarkOverlay({ name, email, reference }: WatermarkOverlayProps) {
  const text = [name, email, reference].filter(Boolean).join(' · ');
  const rows = Array.from({ length: 9 });
  const cols = Array.from({ length: 4 });

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden>
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-around">
        {rows.map((_, r) =>
        <div key={r} className={`flex gap-16 whitespace-nowrap ${r % 2 ? 'pl-24' : ''}`}>
            {cols.map((__, c) =>
          <span
            key={c}
            className="mono text-[11px] font-medium text-white/40 [text-shadow:0_1px_1px_rgba(42,27,20,0.35)]">
            
                {text}
              </span>
          )}
          </div>
        )}
      </div>
    </div>);

}