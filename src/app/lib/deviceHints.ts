/** True on phones/tablets — used to relax face liveness thresholds. */
export function isLikelyMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}
