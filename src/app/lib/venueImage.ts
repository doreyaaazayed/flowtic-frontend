import { resolveApiBase } from './api';

export function resolveVenueImageSrc(imageUrl?: string | null): string {
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
