import React, { useState } from 'react';
import { ChevronDownIcon, KeyRoundIcon, LoaderCircleIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { createShare, errorMessage } from '../../api';
import type { AccessTier } from '../../types/api';
import { accessTiers } from '../../data/accessTiers';
import { expiryOptions, viewLimitOptions } from '../../data/shareOptions';
import { ErrorState } from '../ErrorState';

interface ShareFormProps {
  photoId: string;
  protectedFaceIndexes: number[];
  isVideo?: boolean;
  onShared: () => void;
}

export function ShareForm({ photoId, protectedFaceIndexes, isVideo = false, onShared }: ShareFormProps) {
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<AccessTier>('blurred');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [viewLimit, setViewLimit] = useState<number | null>(null);
  const [removeObjects, setRemoveObjects] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strongTier = tier === 'redacted' || tier === 'public_safe';
  const showRemoval = !isVideo && strongTier;
  const removal = showRemoval ? removeObjects.trim() : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createShare({
        photoId,
        viewerEmail: email.trim(),
        tier,
        blurFaceIndexes: protectedFaceIndexes,
        removeObjects: removal || undefined,
        expiresInHours,
        viewLimit
      });
      toast.success(`Shared securely with ${email.trim()}`);
      setEmail('');
      onShared();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-card p-6" aria-labelledby="step-share">
      <p className="text-sm font-bold text-terracotta-700">Step 2</p>
      <h2 id="step-share" className="text-xl font-extrabold text-ink">
        Choose who sees it
      </h2>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <label htmlFor="recipient" className="text-sm font-bold text-ink">
            Recipient email
          </label>
          <input
            id="recipient"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="field mt-1.5" />

        </div>

        <fieldset>
          <legend className="text-sm font-bold text-ink">Access level</legend>
          <div className="mt-2 grid gap-2">
            {accessTiers.map((t) => {
              const selected = tier === t.value;
              return (
                <label
                  key={t.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,box-shadow,background-color] duration-150 ${
                  selected ? 'glow-active border-terracotta bg-cream-50' : 'border-cream-300 hover:border-taupe-300'}`
                  }>

                  <input
                    type="radio"
                    name="tier"
                    value={t.value}
                    checked={selected}
                    onChange={() => setTier(t.value)}
                    className="mt-1 accent-espresso" />

                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                      {t.label}
                      {t.value === 'full' && <KeyRoundIcon className="h-3.5 w-3.5 text-terracotta-700" aria-label="Requires verification" />}
                    </span>
                    <span className="block text-xs text-taupe-700">{t.description}</span>
                  </span>
                </label>);

            })}
          </div>
        </fieldset>

        {showRemoval &&
        <div>
            <label htmlFor="remove-objects" className="text-sm font-bold text-ink">
              Objects for Cloudinary AI to remove <span className="font-semibold text-taupe-600">(optional)</span>
            </label>
            <input
            id="remove-objects"
            value={removeObjects}
            maxLength={120}
            onChange={(e) => setRemoveObjects(e.target.value)}
            placeholder="license plates, name badge"
            className="field mt-1.5" />

            <p className="mt-1.5 text-xs text-taupe-700">
              Separate items with commas. They are removed from this recipient's copy.
            </p>
          </div>
        }

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="expiry" className="text-sm font-bold text-ink">
              Expires after
            </label>
            <div className="relative mt-1.5">
              <select
                id="expiry"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="field appearance-none pr-9">

                {expiryOptions.map((o) =>
                <option key={o.hours} value={o.hours}>
                    {o.label}
                  </option>
                )}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe-600" aria-hidden />
            </div>
          </div>
          <div>
            <label htmlFor="view-limit" className="text-sm font-bold text-ink">
              View limit
            </label>
            <div className="relative mt-1.5">
              <select
                id="view-limit"
                value={viewLimit ?? ''}
                onChange={(e) => setViewLimit(e.target.value === '' ? null : Number(e.target.value))}
                className="field appearance-none pr-9">

                {viewLimitOptions.map((o) =>
                <option key={o.label} value={o.value ?? ''}>
                    {o.label}
                  </option>
                )}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe-600" aria-hidden />
            </div>
          </div>
        </div>

        <p className="text-xs text-taupe-700">
          {isVideo ?
          'Your recipient\u2019s name and share ID will be shown on their copy of the video.' :
          <>
              {protectedFaceIndexes.length > 0 ?
            `${protectedFaceIndexes.length} protected ${protectedFaceIndexes.length === 1 ? 'face' : 'faces'} will be blurred in this copy.` :
            'No faces are protected in this copy.'}{' '}
              {removal && `Cloudinary AI will remove: ${removal}. `}
              Every copy carries a watermark unique to this recipient.
            </>}
        </p>

        {error && <ErrorState message={error} compact />}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden /> : <SendIcon className="h-4 w-4" aria-hidden />}
          {submitting ? 'Sharing…' : 'Send secure share'}
        </button>
      </form>
    </section>);

}