import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

/**
 * Reveal — scroll-triggered fade-up. Uses IntersectionObserver so it is cheap
 * and supports every browser. Honors prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('is-visible'), delay);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '-50px 0px -50px 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const Comp = As as 'div';
  return (
    <Comp ref={ref as RefObject<HTMLDivElement>} className={`reveal ${className}`}>
      {children}
    </Comp>
  );
}
