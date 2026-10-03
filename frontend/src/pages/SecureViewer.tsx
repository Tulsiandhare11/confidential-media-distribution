import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeftIcon, LoaderCircleIcon, LockKeyholeIcon, ShieldCheckIcon } from 'lucide-react';
import {
  ApiError,
  confirmStepUp,
  errorMessage,
  getMe,
  getViewImage,
  getViewMeta,
  requestStepUp } from
'../api';
import type { User, ViewMeta } from '../types/api';
import { tierMeta } from '../data/accessTiers';
import { useNow } from '../hooks/useNow';
import { formatCountdown } from '../utils/format';
import { CustodyTimeline } from '../components/CustodyTimeline';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { StepUpModal } from '../components/StepUpModal';
import { WatermarkOverlay } from '../components/WatermarkOverlay';

type Phase = 'loading' | 'stepup' | 'image' | 'ready' | 'error';

function needsStepUp(error: unknown) {
  return error instanceof ApiError && error.status === 403 && /step|verif|otp/i.test(`${error.code} ${error.message}`);
}

export function SecureViewer() {
  const { photoId = '' } = useParams();
  const location = useLocation();
  const fallbackTitle = (location.state as {title?: string;} | null)?.title ?? '';
  const now = useNow();

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<User | null>(null);
  const [meta, setMeta] = useState<ViewMeta | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const sendCode = useCallback(async () => {
    setSending(true);
    setSendError(null);
    try {
      await requestStepUp(photoId);
    } catch (e) {
      setSendError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }, [photoId]);

  const loadImage = useCallback(async () => {
    setPhase('image');
    try {
      const blob = await getViewImage(photoId);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setImageUrl(urlRef.current);
      setPhase('ready');
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  }, [photoId]);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setError(null);
    (async () => {
      try {
        const [me, metaResult] = await Promise.all([
        getMe(),
        getViewMeta(photoId).catch((e: unknown) => {
          if (needsStepUp(e)) return null;
          throw e;
        })]
        );
        if (cancelled) return;
        setViewer(me);
        const resolved: ViewMeta = metaResult ?? { url: '', tier: 'full', title: '', shareId: '', expiresAt: '' };
        setMeta(resolved);
        if (resolved.tier === 'full') {
          setPhase('stepup');
          sendCode();
        } else {
          loadImage();
        }
      } catch (e) {
        if (cancelled) return;
        setError(errorMessage(e));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoId, sendCode, loadImage]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const confirm = async (code: string) => {
    await confirmStepUp(photoId, code);
    try {
      setMeta(await getViewMeta(photoId));
    } catch {

      // Metadata refresh is best-effort; the image request below is authoritative.
    }await loadImage();
  };

  const tier = meta ? tierMeta(meta.tier) : null;
  const title = meta?.title || fallbackTitle || 'Secure asset';
  const countdown = meta ? formatCountdown(meta.expiresAt, now) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-taupe-700 hover:text-espresso">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="truncate text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {tier && <StatusBadge tone={tier.tone}>{tier.label} access</StatusBadge>}
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="surface-card overflow-hidden p-3" aria-label="Secure image">
          <div
            className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[14px] bg-espresso-900"
            onContextMenu={(e) => e.preventDefault()}>
            
            {phase === 'ready' && imageUrl && viewer ?
            <>
                <img src={imageUrl} alt={title} draggable={false} className="block max-h-[72vh] w-full select-none object-contain" />
                <WatermarkOverlay name={viewer.name} email={viewer.email} reference={meta?.shareId ? `share ${meta.shareId}` : photoId} />
                <div className="absolute bottom-3 left-3 rounded-lg bg-espresso-900/70 px-2.5 py-1.5 backdrop-blur">
                  <p className="text-[11px] font-bold text-cream-100">Licensed to {viewer.name || viewer.email}</p>
                </div>
              </> :
            phase === 'error' ?
            <div className="w-full max-w-md p-6">
                <ErrorState message={error ?? 'This asset could not be opened.'} />
              </div> :

            <div className="flex flex-col items-center gap-3 text-cream-200">
                {phase === 'stepup' ?
              <LockKeyholeIcon className="h-8 w-8" aria-hidden /> :

              <LoaderCircleIcon className="h-6 w-6 animate-spin" aria-hidden />
              }
                <p className="text-sm font-semibold">
                  {phase === 'stepup' ? 'Locked until you confirm your identity' : 'Opening secure copy…'}
                </p>
              </div>
            }
          </div>
        </section>

        <aside className="space-y-6">
          <section className="surface-card p-5">
            <p className="text-xs font-bold text-taupe-600">Viewing as</p>
            {viewer ?
            <>
                <p className="mt-1 text-lg font-extrabold text-ink">{viewer.name || viewer.email}</p>
                {viewer.name && <p className="text-sm text-taupe-700">{viewer.email}</p>}
              </> :

            <div className="mt-2 h-5 w-32 animate-pulse rounded bg-cream-200" />
            }
            <dl className="mt-4 space-y-2.5 border-t border-cream-300 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-taupe-700">Access</dt>
                <dd className="font-bold text-ink">{tier?.label ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-taupe-700">Expiry</dt>
                <dd className="mono text-xs text-ink">{countdown?.label ?? '—'}</dd>
              </div>
              {meta?.shareId &&
              <div className="flex justify-between gap-3">
                  <dt className="text-taupe-700">Share ID</dt>
                  <dd className="mono truncate text-xs text-ink">{meta.shareId}</dd>
                </div>
              }
            </dl>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-sage-50 p-3 text-xs font-semibold text-sage-700">
              <ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              This copy is watermarked to you. If it leaks, it can be traced back to this view.
            </p>
          </section>

          <section className="surface-card p-5">
            <CustodyTimeline photoId={photoId} collapsible />
          </section>
        </aside>
      </div>

      {phase === 'stepup' &&
      <StepUpModal email={viewer?.email ?? ''} sending={sending} sendError={sendError} onResend={sendCode} onConfirm={confirm} />
      }
    </div>);

}