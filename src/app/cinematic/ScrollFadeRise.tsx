import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Scroll-triggered fade-up (IntersectionObserver).
 * Reliable with Lenis, nested layouts, and all browsers — unlike motion whileInView.
 */
export function ScrollFadeRise({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('scroll-rise-visible');
      return;
    }

    const reveal = (target: Element) => {
      const show = () => target.classList.add('scroll-rise-visible');
      if (delay > 0) window.setTimeout(show, delay);
      else show();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    io.observe(el);

    // Elements already in view on first paint (IO can miss the initial frame).
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      if (rect.top < vh * 0.92 && rect.bottom > vh * 0.08) {
        reveal(el);
        io.unobserve(el);
      }
    });

    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`scroll-fade-rise ${className}`.trim()}>
      {children}
    </div>
  );
}
