import type { AccessTier } from '../types/api';
import type { BadgeTone } from '../types/ui';

export const accessTiers: {value: AccessTier;label: string;description: string;tone: BadgeTone;}[] = [
{
  value: 'full',
  label: 'Full',
  description: 'Original image. Recipient confirms with a one-time code first.',
  tone: 'accent'
},
{
  value: 'blurred',
  label: 'Blurred',
  description: 'Protected faces are blurred; everything else stays clear.',
  tone: 'neutral'
},
{
  value: 'redacted',
  label: 'Heavily redacted',
  description: 'Faces and detected text are masked out.',
  tone: 'review'
},
{
  value: 'public_safe',
  label: 'Public-safe',
  description: 'Low-resolution, fully anonymised preview.',
  tone: 'safe'
}];


export function tierMeta(tier: AccessTier) {
  return accessTiers.find((t) => t.value === tier) ?? accessTiers[1];
}