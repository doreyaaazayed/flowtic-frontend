import { useEffect, useRef, type MutableRefObject } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from './lenis/LenisProvider';
import { mountCinematicLanding, prefersReducedMotion } from './landingCinematic';

/**
 * Mount after Lenis + ScrollTrigger.scrollerProxy are active.
 */
export function useLandingCinematicRoot(): MutableRefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion() || !lenis) return undefined;

    const teardown = mountCinematicLanding(root);
    const refreshId = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => {
      cancelAnimationFrame(refreshId);
      teardown();
    };
  }, [lenis]);

  return ref;
}
