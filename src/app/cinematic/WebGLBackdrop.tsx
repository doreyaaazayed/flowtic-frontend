import { useEffect } from 'react';
import { WebGLBackground } from './webglBackground';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Optional legacy backdrop — prefers native scroll (no Lenis pairing). Not mounted in App. */
export function WebGLBackdrop() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const count = window.innerWidth < 768 ? 1000 : 3000;

    let bg: WebGLBackground | null = null;

    try {
      bg = new WebGLBackground(count);
    } catch {
      return;
    }

    const onNative = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bg?.updateScroll(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener('scroll', onNative, { passive: true });
    onNative();

    return () => {
      window.removeEventListener('scroll', onNative);
      bg?.dispose();
    };
  }, []);

  return null;
}
