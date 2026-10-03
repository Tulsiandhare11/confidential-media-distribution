import React from 'react';
import { EyeIcon, ShieldIcon } from 'lucide-react';
import type { Photo } from '../../types/api';
import { AuthImage } from '../AuthImage';
import { CloudinaryTag } from '../CloudinaryTag';

interface FaceProtectionEditorProps {
  photo: Photo;
  protectedFaces: Set<number>;
  onToggle: (index: number, protect: boolean) => void;
}

export function FaceProtectionEditor({ photo, protectedFaces, onToggle }: FaceProtectionEditorProps) {
  const faces = photo.analysis.faces;

  return (
    <section className="surface-card p-6" aria-labelledby="step-hide">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-terracotta-700">Step 1</p>
          <h2 id="step-hide" className="text-xl font-extrabold text-ink">
            Choose what to hide
          </h2>
          <p className="mt-1 text-sm text-taupe-700">Click a face on the image to switch it between protected and visible.</p>
        </div>
        <CloudinaryTag label="Faces by Cloudinary" />
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl bg-cream-200">
        <AuthImage photoId={photo.id} alt={photo.title} fit="natural" />
        {faces.map((face, i) => {
          const isProtected = protectedFaces.has(i);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={isProtected}
              aria-label={`Face ${i + 1}: ${isProtected ? 'protected' : 'visible'}`}
              onClick={() => onToggle(i, !isProtected)}
              style={{
                left: `${face.x * 100}%`,
                top: `${face.y * 100}%`,
                width: `${face.width * 100}%`,
                height: `${face.height * 100}%`
              }}
              className={`absolute rounded-xl transition-[background-color,border-color,backdrop-filter] duration-200 ${
              isProtected ?
              'border-2 border-terracotta bg-espresso-900/20 backdrop-blur-md' :
              'border-2 border-dashed border-white/90 hover:bg-white/10'}`
              }>
              
              <span
                className={`absolute left-1 top-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold shadow-sm ${
                isProtected ? 'bg-terracotta text-white' : 'bg-cream-50 text-espresso'}`
                }>
                
                {i + 1} · {isProtected ? 'Protected' : 'Visible'}
              </span>
            </button>);

        })}
      </div>

      {faces.length === 0 ?
      <p className="mt-4 text-sm text-taupe-700">No faces detected — nothing needs hiding automatically.</p> :

      <ul className="mt-5 grid gap-2">
          {faces.map((_, i) => {
          const isProtected = protectedFaces.has(i);
          return (
            <li key={i} className="surface-soft flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-bold text-ink">Face {i + 1}</span>
                <div className="flex flex-wrap rounded-lg bg-cream-200 p-0.5" role="group" aria-label={`Face ${i + 1} visibility`}>
                  
                  <button
                  type="button"
                  onClick={() => onToggle(i, true)}
                  aria-pressed={isProtected}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-extrabold transition-colors ${
                  isProtected ? 'bg-cream-50 text-espresso shadow-sm' : 'text-taupe-700'}`
                  }>
                  
                    <ShieldIcon className="h-3 w-3" aria-hidden /> Protect
                  </button>
                  <button
                  type="button"
                  onClick={() => onToggle(i, false)}
                  aria-pressed={!isProtected}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-extrabold transition-colors ${
                  !isProtected ? 'bg-cream-50 text-espresso shadow-sm' : 'text-taupe-700'}`
                  }>
                  
                    <EyeIcon className="h-3 w-3" aria-hidden /> Keep visible
                  </button>
                </div>
              </li>);

        })}
        </ul>
      }
    </section>);

}