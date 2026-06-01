import { useEffect, useRef } from 'react';
import { useLenis, useLenisScrollProgress } from './lenis/LenisProvider';

/** Top plasma progress bar — Lenis progress or native fallback. */
export function ScrollProgress() {
  const lenis = useLenis();
  const progress = useLenisScrollProgress();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof window === 'undefined') return;
    if (lenis) {
      el.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
      return;
    }
    const handler = () => {
      const h = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const p = window.scrollY / h;
      el.style.width = `${Math.min(100, Math.max(0, p * 100))}%`;
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [lenis, progress]);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[10001] h-0.5 w-full overflow-hidden"
      aria-hidden
    >
      <div
        ref={barRef}
        className="h-full rounded-r-full cosmic-scroll-bar-fill"
        style={{ width: '0%' }}
      />
    </div>
  );
}
