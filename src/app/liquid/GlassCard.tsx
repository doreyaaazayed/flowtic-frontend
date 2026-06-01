import { forwardRef, useCallback, useRef, type HTMLAttributes, type ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tilt?: boolean;
  intensity?: number;
  innerClassName?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * GlassCard — the workhorse liquid-glass surface.
 * Optional pointer tilt produces a 3D parallax response with a refracting
 * highlight that tracks the cursor.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { children, tilt = true, intensity = 1, className = '', innerClassName = '', style, ...rest },
  forwardedRef,
) {
  const local = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      local.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [forwardedRef],
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!tilt) return;
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!window.matchMedia('(pointer: fine)').matches) return;
      }
      const el = local.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (y - 0.5) * -10 * intensity;
      const ry = (x - 0.5) * 14 * intensity;
      if (inner.current) {
        inner.current.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      }
      if (sheen.current) {
        sheen.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.18) 0%, transparent 55%)`;
      }
    },
    [tilt, intensity],
  );

  const onLeave = useCallback(() => {
    if (inner.current) inner.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    if (sheen.current) sheen.current.style.background = 'transparent';
  }, []);

  return (
    <div
      ref={setRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`lg-card lg-3d ${className}`}
      style={style}
      {...rest}
    >
      <div ref={inner} className={`lg-3d-inner ${innerClassName}`}>
        {children}
      </div>
      <div
        ref={sheen}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ mixBlendMode: 'screen', zIndex: 3 }}
      />
    </div>
  );
});
