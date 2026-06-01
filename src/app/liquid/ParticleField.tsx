import { useEffect, useRef } from 'react';

interface ParticleFieldProps {
  density?: number;
  className?: string;
  colors?: string[];
  speed?: number;
  /** Mouse parallax intensity (0-1). */
  parallax?: number;
}

/**
 * Canvas particle field — drifting motes of light for cinematic depth.
 *
 * Performance notes:
 * - No `shadowBlur` (one of the most expensive canvas ops). The glow comes
 *   from rendering each particle as a small radial-gradient sprite that is
 *   drawn once at startup and reused.
 * - Frame-rate capped to ~30fps; the eye can't see motes any faster anyway.
 * - Paused via IntersectionObserver when off-screen.
 * - Skipped entirely on reduced-motion / coarse-pointer / low device memory.
 */
export function ParticleField({
  density = 36,
  className = '',
  colors = ['rgba(168,85,247,0.6)', 'rgba(59,130,246,0.55)', 'rgba(240,198,116,0.5)', 'rgba(255,255,255,0.55)'],
  speed = 0.3,
  parallax = 0.5,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const lowMem =
      typeof navigator !== 'undefined' &&
      // @ts-expect-error -- non-standard but widely available
      typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4;
    if (reduced || coarse || lowMem) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Cap DPR aggressively — on a 4K display 2x DPR doubles fill cost for almost
    // no visible difference at 3px sprites.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;

    const setSize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    // ---- pre-bake sprites for each color (radial gradient) ----
    const SPRITE_SIZE = 24;
    const sprites: HTMLCanvasElement[] = colors.map((color) => {
      const c = document.createElement('canvas');
      c.width = c.height = SPRITE_SIZE;
      const cctx = c.getContext('2d');
      if (cctx) {
        const r = SPRITE_SIZE / 2;
        const grad = cctx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, color);
        grad.addColorStop(0.4, color.replace(/,\s*[0-9.]+\)/, ',0.18)'));
        grad.addColorStop(1, color.replace(/,\s*[0-9.]+\)/, ',0)'));
        cctx.fillStyle = grad;
        cctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      }
      return c;
    });

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number; // sprite half-size on screen (px)
      a: number;
      sprite: HTMLCanvasElement;
    };

    const count = coarse ? Math.floor(density * 0.5) : density;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed * 1.2,
        r: Math.random() * 6 + 4, // 4-10px sprite radius
        a: Math.random() * 0.5 + 0.35,
        sprite: sprites[Math.floor(Math.random() * sprites.length)],
      });
    }

    let raf = 0;
    let visible = true;
    let lastFrame = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30fps cap — invisible to the eye but halves fill cost

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(canvas);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const onResize = () => setSize();
    window.addEventListener('resize', onResize);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (now - lastFrame < FRAME_INTERVAL) return;
      lastFrame = now;

      ctx.clearRect(0, 0, w, h);

      const mx = (mouseRef.current.x - 0.5) * 20 * parallax;
      const my = (mouseRef.current.y - 0.5) * 20 * parallax;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
        ctx.globalAlpha = p.a;
        // drawImage is dramatically cheaper than arc() + shadowBlur for a glow
        ctx.drawImage(
          p.sprite,
          p.x + mx * 0.3 - p.r,
          p.y + my * 0.3 - p.r,
          p.r * 2,
          p.r * 2,
        );
      }
      ctx.globalAlpha = 1;
    };
    tick(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, [density, speed, parallax, colors]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
