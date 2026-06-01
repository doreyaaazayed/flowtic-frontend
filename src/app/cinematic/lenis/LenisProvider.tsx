import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const LenisInstanceContext = createContext<Lenis | null>(null);
const LenisScrollProgressContext = createContext<number>(0);

export function useLenis(): Lenis | null {
  return useContext(LenisInstanceContext);
}

export function useLenisScrollProgress(): number {
  return useContext(LenisScrollProgressContext);
}

/** @deprecated Parallax measures via rAF; kept for API compatibility. */
export function useScrollFrame(): number {
  return 0;
}

/**
 * Lenis smooth-scroll provider.
 * Progress stays in a ref (no ~60fps React rerenders). ScrollProgress is omitted in MainLayout for perf.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) return;

    const root = document.documentElement;
    root.classList.add('lenis', 'lenis-smooth');

    const lenis = new Lenis({
      duration: 0.9,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
      lerp: 0.18,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      syncTouch: false,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onScroll = ({ progress: p }: { progress: number }) => {
      progressRef.current = p;
    };
    lenis.on('scroll', onScroll);

    return () => {
      lenis.off('scroll', onScroll);
      lenis.destroy();
      cancelAnimationFrame(raf);
      root.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
      lenisRef.current = null;
    };
  }, []);

  return (
    <LenisInstanceContext.Provider value={lenisRef.current}>
      <LenisScrollProgressContext.Provider value={0}>
        {children}
      </LenisScrollProgressContext.Provider>
    </LenisInstanceContext.Provider>
  );
}
