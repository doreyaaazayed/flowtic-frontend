import { useEffect, useState } from 'react';

export type PerformanceTier = 'full' | 'lite';

/** Phones, tablets, coarse pointer, or low RAM → lighter FX, still animated. */
export function getPerformanceTier(): PerformanceTier {
  if (typeof window === 'undefined') return 'full';

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const lowMem =
    typeof navigator !== 'undefined' &&
    // @ts-expect-error non-standard
    typeof navigator.deviceMemory === 'number' &&
    // @ts-expect-error non-standard
    navigator.deviceMemory < 4;

  if (coarse || narrow || mobileUa || lowMem) return 'lite';
  return 'full';
}

export function isLitePerformance(): boolean {
  return getPerformanceTier() === 'lite';
}

export function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>(() =>
    typeof window !== 'undefined' ? getPerformanceTier() : 'full',
  );

  useEffect(() => {
    const update = () => setTier(getPerformanceTier());
    update();
    window.matchMedia('(max-width: 768px)').addEventListener('change', update);
    window.matchMedia('(pointer: coarse)').addEventListener('change', update);
    return () => {
      window.matchMedia('(max-width: 768px)').removeEventListener('change', update);
      window.matchMedia('(pointer: coarse)').removeEventListener('change', update);
    };
  }, []);

  return tier;
}

/** Apply `perf-lite` on <html> for CSS hooks (mobile / low-end). */
export function usePerformanceClass(): void {
  useEffect(() => {
    const lite = isLitePerformance();
    document.documentElement.classList.toggle('perf-lite', lite);
    return () => document.documentElement.classList.remove('perf-lite');
  }, []);
}
