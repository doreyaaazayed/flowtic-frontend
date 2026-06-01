import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scoped scroll reveals (SplitType + ScrollTrigger). Call with a container (e.g. `<main>`).
 * Does not run on `/` where the landing cinematic controller owns ScrollTrigger.
 */
export function initCosmicReveals(scope: HTMLElement | null, pathname: string): () => void {
  if (!scope || reducedMotion() || pathname === '/') {
    return () => {};
  }

  const splits: SplitType[] = [];

  const ctx = gsap.context(() => {
    scope.querySelectorAll('.reveal-chars').forEach((el) => {
      try {
        const split = new SplitType(el as HTMLElement, { types: 'chars' });
        splits.push(split);
        gsap.from(split.chars, {
          scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none reverse' },
          y: '110%',
          opacity: 0,
          rotateZ: 5,
          stagger: 0.025,
          duration: 0.65,
          ease: 'back.out(1.6)',
        });
      } catch {
        /* empty */
      }
    });

    scope.querySelectorAll('.reveal-up').forEach((el) => {
      const delay = parseFloat((el as HTMLElement).dataset.delay || '0') || 0;
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
        y: 56,
        opacity: 0,
        duration: 0.75,
        delay,
        ease: 'power3.out',
      });
    });

    scope.querySelectorAll('.reveal-grid').forEach((grid) => {
      const cards = grid.querySelectorAll('.event-card');
      if (!cards.length) return;
      gsap.from(cards, {
        scrollTrigger: { trigger: grid, start: 'top 82%' },
        y: 72,
        opacity: 0,
        scale: 0.96,
        stagger: { amount: 0.45, grid: 'auto', from: 'start' },
        duration: 0.65,
        ease: 'power3.out',
      });
    });
  }, scope);

  return () => {
    ctx.revert();
    splits.forEach((s) => {
      try {
        s.revert();
      } catch {
        /* noop */
      }
    });
    ScrollTrigger.refresh();
  };
}
