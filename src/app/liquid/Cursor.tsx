import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supportsCustomCursor } from '../lib/customCursor';

const RING_LAG = 0.14;
const DOT_LAG = 0.65;

/**
 * Custom pointer: solid white dot + trailing ring.
 * Portaled to document.body, native cursor hidden via html.has-custom-cursor.
 */
export function Cursor() {
  const [active] = useState(() =>
    typeof window !== 'undefined' ? supportsCustomCursor() : false,
  );
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    tx: 0,
    ty: 0,
    dx: 0,
    dy: 0,
    rx: 0,
    ry: 0,
    visible: false,
  });

  useLayoutEffect(() => {
    if (!active) return;
    document.documentElement.classList.add('has-custom-cursor');
    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const state = stateRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ringLag = reduced ? 1 : RING_LAG;
    const dotLag = reduced ? 1 : DOT_LAG;

    const center = () => {
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      state.tx = x;
      state.ty = y;
      state.dx = x;
      state.dy = y;
      state.rx = x;
      state.ry = y;
    };
    center();

    const apply = () => {
      const t = `translate3d(${state.dx}px, ${state.dy}px, 0) translate(-50%, -50%)`;
      const r = `translate3d(${state.rx}px, ${state.ry}px, 0) translate(-50%, -50%)`;
      if (dotRef.current) {
        dotRef.current.style.transform = t;
        dotRef.current.style.opacity = state.visible ? '1' : '0';
      }
      if (ringRef.current) {
        ringRef.current.style.transform = r;
        ringRef.current.style.opacity = state.visible ? '0.92' : '0';
      }
    };

    const move = (e: MouseEvent) => {
      state.tx = e.clientX;
      state.ty = e.clientY;
      state.visible = true;
    };

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      state.dx += (state.tx - state.dx) * dotLag;
      state.dy += (state.ty - state.dy) * dotLag;
      state.rx += (state.tx - state.rx) * ringLag;
      state.ry += (state.ty - state.ry) * ringLag;
      apply();
    };
    raf = requestAnimationFrame(tick);

    const onOver = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const hit = el.closest(
        'a, button, [role="button"], [data-cursor="pointer"], input, select, textarea, summary, label',
      );
      dotRef.current?.classList.toggle('is-pointer', Boolean(hit));
      ringRef.current?.classList.toggle('is-pointer', Boolean(hit));
    };

    const onDown = () => dotRef.current?.classList.add('is-active');
    const onUp = () => dotRef.current?.classList.remove('is-active');
    const onLeave = () => {
      state.visible = false;
    };
    const onEnter = () => {
      state.visible = true;
    };

    window.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, [active]);

  if (!active) return null;

  return createPortal(
    <>
      <div ref={ringRef} className="lg-cursor__ring" aria-hidden />
      <div ref={dotRef} className="lg-cursor" aria-hidden>
        <div className="lg-cursor__dot" />
      </div>
    </>,
    document.body,
  );
}
