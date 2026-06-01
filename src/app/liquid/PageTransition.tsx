import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import { isLitePerformance } from '../lib/performanceProfile';

/**
 * Cinematic route-change transition.
 *
 * Performance notes:
 * - We removed the animated `filter: blur(...)` channel — animating CSS blur
 *   on a full-page tree forces an offscreen rasterization for every frame
 *   of the transition, which was hammering the GPU on route change.
 * - Shortened duration (550ms → 340ms) so the transition stays out of the way.
 * - `transform: translateZ(0)` keeps it on its own compositor layer.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const lite = isLitePerformance();
  const duration = lite ? 0.26 : 0.34;
  const yIn = lite ? 8 : 10;
  const yOut = lite ? -4 : -6;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: yIn }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: yOut }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: 'calc(100vh - 200px)', transform: 'translateZ(0)' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
