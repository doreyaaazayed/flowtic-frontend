import { useCallback, useRef, type ReactNode } from 'react';

/**
 * Magnetic — pulls a child element toward the cursor on hover.
 * Honors reduced-motion and coarse pointer.
 */
export function Magnetic({
  children,
  strength = 28,
  className = '',
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!window.matchMedia('(pointer: fine)').matches) return;
      }
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
    },
    [strength],
  );

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)';
  }, []);

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${className}`}
    >
      {children}
    </span>
  );
}
