import { format } from 'date-fns';
import type { BadgeTone } from '../types/ui';

export function formatCountdown(expiresAt: string, now: number) {
  const time = expiresAt ? new Date(expiresAt).getTime() : NaN;
  if (Number.isNaN(time)) return { label: 'No expiry', expired: false, urgent: false };
  const diff = time - now;
  if (diff <= 0) return { label: 'Expired', expired: true, urgent: false };
  const mins = Math.floor(diff / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor(mins % 1440 / 60);
  const m = mins % 60;
  const label = d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${Math.max(m, 1)}m left`;
  return { label, expired: false, urgent: diff < 6 * 3600 * 1000 };
}

export function formatDateTime(iso: string): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return format(d, "MMM d, yyyy '·' HH:mm:ss");
}

export function shortHash(hash: string, head = 10): string {
  if (!hash) return '—';
  return hash.length > head + 8 ? `${hash.slice(0, head)}…${hash.slice(-6)}` : hash;
}

export function initials(name: string, fallback = '?'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function humanize(value: string): string {
  const s = value.replace(/[_.-]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function photoStatusMeta(status: string): {label: string;tone: BadgeTone;} {
  const s = status.toLowerCase();
  if (s.includes('revok') || s.includes('denied') || s.includes('blocked')) return { label: 'Revoked', tone: 'danger' };
  if (s.includes('review') || s.includes('flag') || s.includes('pending')) return { label: 'Needs review', tone: 'review' };
  if (s.includes('process')) return { label: 'Processing', tone: 'neutral' };
  return { label: 'Released', tone: 'safe' };
}