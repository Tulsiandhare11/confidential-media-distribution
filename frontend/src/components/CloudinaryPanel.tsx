import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CircleCheckIcon,
  LoaderCircleIcon,
  ScanFaceIcon,
  ScanTextIcon,
  ShieldCheckIcon,
  TagIcon,
  XIcon } from
'lucide-react';
import { CloudinaryMark } from './CloudinaryMark';
import type { PhotoAnalysis } from '../types/api';

export type AnalysisPhase = 'idle' | 'processing' | 'done' | 'error';

interface CloudinaryPanelProps {
  phase: AnalysisPhase;
  analysis: PhotoAnalysis | null;
}

const STAGES = [
{ label: 'Scanning for malware', icon: ShieldCheckIcon },
{ label: 'Detecting faces', icon: ScanFaceIcon },
{ label: 'Reading text', icon: ScanTextIcon },
{ label: 'Tagging content', icon: TagIcon }];


export function CloudinaryPanel({ phase, analysis }: CloudinaryPanelProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (phase === 'processing') {
      setActive(0);
      const id = window.setInterval(() => setActive((a) => Math.min(a + 1, STAGES.length - 1)), 1100);
      return () => window.clearInterval(id);
    }
    if (phase === 'done') setActive(STAGES.length);
    if (phase === 'idle') setActive(0);
    return undefined;
  }, [phase]);

  const faces = analysis?.faces.length ?? 0;
  const texts = analysis?.textRegions ?? 0;

  return (
    <>
      <AnimatePresence>
        {!open &&
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="surface-card fixed right-0 top-1/3 z-30 flex flex-col items-center gap-2 !rounded-l-2xl !rounded-r-none border-r-0 px-2.5 py-4"
          aria-label="Open Cloudinary AI panel"
          aria-expanded={false}>
          
            <span className="relative">
              <CloudinaryMark className="h-5 w-6" />
              {phase === 'processing' &&
            <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-terracotta" />
            }
            </span>
            <span className="text-xs font-extrabold tracking-wide text-espresso" style={{ writingMode: 'vertical-rl' }}>
              Cloudinary AI
            </span>
          </motion.button>
        }
      </AnimatePresence>

      <AnimatePresence>
        {open &&
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[340px] flex-col border-l border-cream-400 bg-cream-50 shadow-[0_0_0_1px_rgba(74,48,36,0.04),-24px_0_48px_-24px_rgba(74,48,36,0.35)]"
          aria-label="Cloudinary AI analysis">
          
            <header className="flex items-center justify-between border-b border-cream-300 px-5 py-4">
              <div className="flex items-center gap-2">
                <CloudinaryMark className="h-5 w-6" />
                <div>
                  <p className="text-[11px] font-bold text-taupe-600">Powered by</p>
                  <p className="-mt-0.5 text-sm font-extrabold text-ink">Cloudinary</p>
                </div>
              </div>
              <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-taupe-700 transition-colors hover:bg-cream-200"
              aria-label="Collapse panel">
              
                <XIcon className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section>
                <h3 className="text-sm font-extrabold text-ink">Processing</h3>
                {phase === 'idle' &&
              <p className="mt-2 text-sm text-taupe-700">Upload an image to start the analysis.</p>
              }
                {phase !== 'idle' &&
              <ol className="mt-3 space-y-1">
                    {STAGES.map((stage, i) => {
                  const done = i < active;
                  const running = phase === 'processing' && i === active;
                  const Icon = stage.icon;
                  return (
                    <li
                      key={stage.label}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${running ? 'glow-active bg-white' : ''}`}>
                      
                          <Icon className={`h-4 w-4 ${done || running ? 'text-espresso' : 'text-taupe-500'}`} aria-hidden />
                          <span className={`flex-1 text-sm font-semibold ${done || running ? 'text-ink' : 'text-taupe-600'}`}>
                            {stage.label}
                          </span>
                          {done && <CircleCheckIcon className="h-4 w-4 text-sage-600" aria-label="Complete" />}
                          {running && <LoaderCircleIcon className="h-4 w-4 animate-spin text-terracotta" aria-label="Running" />}
                        </li>);

                })}
                  </ol>
              }
                {phase === 'error' &&
              <p className="mt-3 text-sm font-semibold text-brick-700">Analysis stopped because the upload failed.</p>
              }
              </section>

              {phase === 'done' && analysis &&
            <section>
                  <h3 className="text-sm font-extrabold text-ink">Results</h3>
                  <dl className="surface-card mt-3 divide-y divide-cream-300 !rounded-2xl">
                    <div className="flex items-center justify-between px-4 py-3">
                      <dt className="text-sm text-taupe-700">Faces</dt>
                      <dd className="text-sm font-extrabold text-ink">
                        {faces} {faces === 1 ? 'face' : 'faces'} detected
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <dt className="text-sm text-taupe-700">Text</dt>
                      <dd className="text-sm font-extrabold text-ink">
                        {texts} text {texts === 1 ? 'region' : 'regions'} found
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <dt className="text-sm text-taupe-700">Safety scan</dt>
                      <dd className="text-sm font-extrabold capitalize text-sage-700">{analysis.moderation ?? 'Clean'}</dd>
                    </div>
                  </dl>
                  {analysis.tags.length > 0 &&
              <div className="mt-4">
                      <p className="text-xs font-bold text-taupe-600">Tags</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {analysis.tags.map((tag) =>
                  <li key={tag} className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-bold text-espresso-700">
                            {tag}
                          </li>
                  )}
                      </ul>
                    </div>
              }
                </section>
            }
            </div>
          </motion.aside>
        }
      </AnimatePresence>
    </>);

}