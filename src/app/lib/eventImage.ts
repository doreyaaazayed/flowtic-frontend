import { resolveApiBase } from './api';

export const EVENT_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';

/**
 * Turn API imageUrl into a browser-loadable src (handles /api/uploads/... paths via dev proxy or API host).
 */
export function resolveEventImageSrc(imageUrl?: string | null): string {
  const raw = imageUrl?.trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/api/')) {
    const base = resolveApiBase();
    return base ? `${base}${raw}` : raw;
  }
  if (raw.startsWith('/uploads/')) {
    const base = resolveApiBase();
    const path = `/api${raw}`;
    return base ? `${base}${path}` : path;
  }
  return raw;
}

export function eventCardImageSrc(imageUrl?: string | null): string {
  return resolveEventImageSrc(imageUrl) || EVENT_PLACEHOLDER_IMAGE;
}
