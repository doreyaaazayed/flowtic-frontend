import { useEffect, useRef } from 'react';

/**
 * Spotlight — a cursor-aware glow that follows the mouse to add a subtle
 * dimensional highlight across the foreground. Disabled on coarse pointers
 * and reduced-motion preferences.
 */
export function Spotlight({
  size = 520,
  color = 'rgba(139, 92, 246, 0.22)',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduced) return;

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;

    const move = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };
    const tick = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${curX - size / 2}px, ${curY - size / 2}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', move);
      cancelAnimationFrame(raf);
    };
  }, [size]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 1,
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  );
}
