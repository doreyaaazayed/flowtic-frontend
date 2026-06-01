import { useEffect, useState } from 'react';
import { isLitePerformance } from '../lib/performanceProfile';

/**
 * Cinematic backdrop — pure CSS gradient orbs + soft grid.
 *
 * On mobile (`perf-lite`) we show one orb and a static grid to save GPU.
 */
export function CinematicBackdrop({ intensity = 0.7 }: { intensity?: number }) {
  const [reduced, setReduced] = useState(false);
  const lite = isLitePerformance();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const still = reduced;
  const effectiveIntensity = lite ? Math.min(intensity, 0.55) : intensity;

  return (
    <div
      className={`lg-backdrop ${lite ? 'lg-backdrop--lite' : ''}`}
      aria-hidden
      style={{
        opacity: effectiveIntensity,
      }}
    >
      <div className="lg-backdrop__grid" />
      <div
        className={`lg-backdrop__orb lg-backdrop__orb--a ${still ? 'lg-backdrop__orb--still' : ''}`}
      />
      {!lite && (
        <>
          <div
            className={`lg-backdrop__orb lg-backdrop__orb--b ${still ? 'lg-backdrop__orb--still' : ''}`}
          />
          <div
            className={`lg-backdrop__orb lg-backdrop__orb--c ${still ? 'lg-backdrop__orb--still' : ''}`}
          />
        </>
      )}
    </div>
  );
}
