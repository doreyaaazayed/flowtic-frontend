import { resolveApiBase } from './api';

export function resolveProfilePhotoSrc(photoUrl?: string | null): string {
  const raw = photoUrl?.trim();
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

export function profileInitials(firstName?: string, lastName?: string, username?: string): string {
  const a = (firstName ?? '').trim().charAt(0);
  const b = (lastName ?? '').trim().charAt(0);
  if (a || b) return `${a}${b}`.toUpperCase();
  return (username ?? '?').charAt(0).toUpperCase();
}
