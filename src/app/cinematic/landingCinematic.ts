import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function qs<T extends HTMLElement>(root: HTMLElement, sel: string) {
  return root.querySelector(sel) as T | null;
}

function qsa<T extends HTMLElement>(root: HTMLElement, sel: string) {
  return [...root.querySelectorAll(sel)] as T[];
}

/**
 * Scoped cinematic motion for `/` landing: splits, pins, horizontal track, parallax tilt.
 */
export function mountCinematicLanding(root: HTMLElement): () => void {
  const splitInstances: SplitType[] = [];
  const counterTriggers: ScrollTrigger[] = [];

  if (!(root instanceof HTMLElement)) {
    return () => {};
  }

  if (prefersReducedMotion()) {
    return () => {};
  }

  for (const el of qsa<HTMLElement>(root, '.stat-number[data-target]')) {
    const target = parseInt(el.dataset.target ?? '0', 10);
    if (!Number.isFinite(target)) continue;
    el.textContent = '0';

    counterTriggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          const counter = { val: 0 };
          gsap.fromTo(
            counter,
            { val: 0 },
            {
              val: target,
              duration: 2.2,
              ease: 'power2.out',
              onUpdate() {
                const t = this.targets()[0] as { val: number } | undefined;
                if (!t || !el.isConnected) return;
                el.textContent = Math.round(gsap.utils.snap(1, t.val)).toLocaleString();
              },
            },
          );
        },
      }),
    );
  }

  const mm = gsap.matchMedia();

  const ctx = gsap.context(() => {
    ScrollTrigger.defaults({ invalidateOnRefresh: true });

    mm.add('(max-width: 767px)', () => {
      const grid = qs(root, '.events-grid');
      const cards = qsa<HTMLElement>(root, '.cinematic-event-card');
      if (grid && cards.length) {
        gsap.from(cards, {
          immediateRender: false,
          y: 44,
          opacity: 0,
          stagger: 0.08,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: { trigger: grid, start: 'top 85%' },
        });
      }

      qsa<HTMLElement>(root, 'h2').forEach((heading) => {
        if (heading.closest('.pinned-section')) return;
        const st = new SplitType(heading, { types: 'chars' });
        splitInstances.push(st);
        gsap.from(st.chars, {
          immediateRender: false,
          y: 36,
          opacity: 0,
          stagger: 0.015,
          duration: 0.45,
          ease: 'power2.out',
          scrollTrigger: { trigger: heading, start: 'top 92%' },
        });
      });
    });

    mm.add('(min-width: 768px)', () => {
      const hero = qs(root, '.hero-section');
      const heroInner = qs(root, '.hero-inner');
      const eventsSection = qs(root, '.events-section');
      if (hero && heroInner && eventsSection) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '+=145%',
            pin: true,
            scrub: 0.85,
            anticipatePin: 1,
          },
        });

        tl.to(heroInner, {
          scale: 1.04,
          opacity: 0,
          filter: 'blur(14px)',
          ease: 'power2.inOut',
          duration: 1,
        }).fromTo(
          eventsSection,
          { y: '40px', opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.75,
            ease: 'power2.out',
            immediateRender: false,
          },
          '<',
        );
      }

      const hWrap = qs(root, '.h-scroll-container');
      const hTrack = qs<HTMLElement>(root, '.h-scroll-track');
      if (hWrap && hTrack && hTrack.scrollWidth > window.innerWidth) {
        const trackWidth = Math.max(0, hTrack.scrollWidth - window.innerWidth);
        if (trackWidth > 0) {
          gsap.to(hTrack, {
            x: -trackWidth,
            ease: 'none',
            scrollTrigger: {
              trigger: hWrap,
              start: 'top top',
              end: () => `+=${trackWidth}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        }
      }

      for (const section of qsa<HTMLElement>(root, '.pinned-section')) {
        const content = qs<HTMLElement>(section, '.section-content');
        const visual = qs<HTMLElement>(section, '.section-visual');
        if (!content || !visual) continue;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=125%',
            pin: true,
            scrub: true,
          },
        });

        tl.set(content, { opacity: 1, x: 0 })
          .set(visual, { opacity: 1, x: 0, rotateY: 0, transformPerspective: 1200 })
          .to(content, { opacity: 0, y: '-7%', ease: 'power1.in', duration: 0.95 }, 0.45)
          .to(visual, { opacity: 0, y: '-7%', ease: 'power1.in', duration: 0.95 }, 0.52);
      }

      const grid = qs(root, '.events-grid');
      const eventCards = qsa<HTMLElement>(root, '.cinematic-event-card');

      if (grid && eventCards.length) {
        gsap.from(eventCards, {
          immediateRender: false,
          y: 92,
          opacity: 0,
          rotateX: 16,
          transformOrigin: '50% top',
          stagger: { amount: 0.52, grid: 'auto', from: 'start' },
          ease: 'power3.out',
          duration: 0.75,
          scrollTrigger: {
            trigger: grid,
            start: 'top 88%',
            end: 'bottom 18%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      qsa<HTMLElement>(root, 'p.cinematic-text-lines').forEach((para) => {
        try {
          const stLines = new SplitType(para, { types: 'lines' });
          splitInstances.push(stLines);
          gsap.from(stLines.lines, {
            immediateRender: false,
            y: 40,
            opacity: 0,
            stagger: 0.08,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: { trigger: para, start: 'top 88%', toggleActions: 'play none none reverse' },
          });
        } catch {
          //
        }
      });

      qsa<HTMLElement>(root, 'h2').forEach((heading) => {
        if (heading.closest('.hero-section')) return;
        if (heading.closest('.pinned-section')) return;
        try {
          const st = new SplitType(heading, { types: 'chars' });
          splitInstances.push(st);
          gsap.from(st.chars, {
            immediateRender: false,
            y: '112%',
            opacity: 0,
            stagger: 0.02,
            duration: 0.55,
            ease: 'back.out(1.5)',
            scrollTrigger: { trigger: heading, start: 'top 87%' },
          });
        } catch {
          /* non-text or empty */
        }
      });

      return () => {};
    });

    ScrollTrigger.refresh();
  }, root);

  return () => {
    counterTriggers.forEach((t) => t.kill(false));
    mm.revert();
    ctx.revert();
    splitInstances.forEach((s) => {
      try {
        s.revert();
      } catch {
        /* noop */
      }
    });
    ScrollTrigger.refresh();
  };
}
