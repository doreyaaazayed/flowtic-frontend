import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { isLitePerformance } from '../lib/performanceProfile';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Element progress 0→1 as it crosses the viewport — scroll-throttled (no always-on rAF). */
function useElementScrollProgress(): {
  progress: MotionValue<number>;
  setTarget: (node: HTMLElement | null) => void;
} {
  const progress = useMotionValue(0);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!node || isLitePerformance()) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const range = vh + rect.height;
      if (range <= 0) return;
      const scrolled = vh - rect.top;
      progress.set(Math.min(1, Math.max(0, scrolled / range)));
    };

    measure();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(node);

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        measure();
        raf = 0;
      });
    };

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      cancelAnimationFrame(raf);
    };
  }, [node, progress]);

  const setTarget = useCallback((el: HTMLElement | null) => {
    setNode(el);
  }, []);

  return { progress, setTarget };
}

type ParallaxLayerProps = {
  children: ReactNode;
  speed?: number;
  className?: string;
  style?: CSSProperties;
};

export function ParallaxLayer({ children, speed = 0.35, className = '', style }: ParallaxLayerProps) {
  const reduced = usePrefersReducedMotion();
  const lite = isLitePerformance();
  const { progress: scrollYProgress, setTarget } = useElementScrollProgress();

  const rawY = useTransform(scrollYProgress, [0, 1], [speed * 72, -speed * 72]);
  const y = useSpring(rawY, { stiffness: 90, damping: 20, mass: 0.3 });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [speed * 5, 0, -speed * 5]);

  if (reduced || lite) {
    return (
      <div ref={setTarget} className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={setTarget}
      className={className}
      style={{ y, rotateX, transformPerspective: 1200, ...style }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollOrb({
  className = '',
  color = 'rgba(168,85,247,0.32)',
  size = 260,
  speed = 0.22,
}: {
  className?: string;
  color?: string;
  size?: number;
  speed?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const lite = isLitePerformance();
  const { progress: scrollYProgress, setTarget } = useElementScrollProgress();

  const y = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 90]);
  const x = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.1, 0.98]);

  if (lite) return null;

  return (
    <motion.div
      ref={setTarget}
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        y: reduced ? 0 : y,
        x: reduced ? 0 : x,
        scale: reduced ? 1 : scale,
      }}
    />
  );
}
