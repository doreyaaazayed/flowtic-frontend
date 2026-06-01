import { lazy, Suspense, useEffect, useState } from 'react';

const CosmicCanvas = lazy(() =>
  import('./canvas/CosmicCanvas').then((m) => ({ default: m.CosmicCanvas })),
);

function StaticBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 'var(--z-canvas)', background: '#000008' }}
      aria-hidden
    />
  );
}

/**
 * Defers loading three/postprocessing until after first paint (idle).
 * Skips WebGL when reduced motion.
 */
export function DeferredCosmicCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(enable, { timeout: 2800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const tid = window.setTimeout(enable, 1);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return <StaticBackdrop />;
  }

  if (!ready) {
    return <StaticBackdrop />;
  }

  return (
    <Suspense fallback={<StaticBackdrop />}>
      <CosmicCanvas />
    </Suspense>
  );
}
