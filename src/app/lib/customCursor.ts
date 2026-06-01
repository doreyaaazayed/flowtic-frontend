/** True when a mouse/trackpad is available (not touch-only). */
export function supportsCustomCursor(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const hover = window.matchMedia('(hover: hover)').matches;
  if (!hover) return false;
  if (coarse && !fine) return false;
  return true;
}
