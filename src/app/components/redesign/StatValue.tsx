import { useEffect, useRef, useState } from 'react';

type Props = { value: number; className?: string };

export function StatValue({ value, className = 'redesign-stat-value' }: Props) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    const node = ref.current;
    if (!node) return;
    setDisplay(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 850;
        const animate = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const ease = 1 - (1 - t) * (1 - t);
          setDisplay(Math.round(value * ease));
          if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <p ref={ref} className={className}>
      {display}
    </p>
  );
}
