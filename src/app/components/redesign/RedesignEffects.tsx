import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Fade-in `.animate-on-scroll` when they enter view. Retries briefly so lazy routes
 * (Landing, etc.) are in the DOM before we attach — otherwise sections stay opacity:0 forever.
 */
export function RedesignEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    const targetsEarly = document.querySelectorAll<HTMLElement>('.animate-on-scroll');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targetsEarly.forEach((t) => t.classList.add('visible'));
      return;
    }

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let tries = 0;
    const maxTries = 48;
    let rafId = 0;

    const attach = () => {
      const targets = document.querySelectorAll<HTMLElement>('.animate-on-scroll');

      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
          });
        },
        { threshold: 0.06, rootMargin: '0px 0px -4% 0px' },
      );
      targets.forEach((el) => observer!.observe(el));
    };

    const tick = () => {
      if (cancelled) return;
      const targets = document.querySelectorAll<HTMLElement>('.animate-on-scroll');
      if (targets.length === 0 && tries < maxTries) {
        tries += 1;
        rafId = requestAnimationFrame(tick);
        return;
      }
      attach();
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
