import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

type Props = {
  /** @default 'icon' */
  variant?: 'icon' | 'icon-text';
  className?: string;
};

type DocumentWithViewTransitions = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

const TRANSITION_DURATION = 520;

/**
 * Toggles light / dark with a buttery-smooth theme cross-fade.
 *
 * Strategy:
 *  1. If the browser supports `document.startViewTransition` (Chromium 111+),
 *     use it — it takes a single GPU snapshot before/after and animates one
 *     cross-fade, which is dramatically cheaper than per-element CSS
 *     transitions for hundreds of nodes.
 *  2. Otherwise, fall back to arming a temporary `theme-transitioning` class
 *     on `<html>` for ~340ms so CSS-var-driven colors interpolate during the
 *     toggle window only (no permanent always-on `*` transitions = no hover
 *     lag).
 */
export function ThemeToggle({ variant = 'icon', className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    const isDark = resolvedTheme === 'dark';
    const next = isDark ? 'light' : 'dark';
    const root = document.documentElement;
    const doc = document as DocumentWithViewTransitions;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setTheme(next);
      return;
    }

    if (typeof doc.startViewTransition === 'function') {
      // Chromium path — single compositor-side cross-fade between snapshots
      doc.startViewTransition(() => {
        setTheme(next);
      });
      return;
    }

    // Fallback — open a short transition window so CSS vars interpolate.
    root.classList.add('theme-transitioning');
    setTheme(next);
    window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, TRANSITION_DURATION);
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    return (
      <Button type="button" variant="ghost" size="sm" className={className} disabled aria-hidden>
        <span className="inline-block h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size={variant === 'icon-text' ? 'sm' : 'icon'}
      className={className}
      onClick={handleToggle}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {variant === 'icon-text' && (
        <span className="ms-2 hidden sm:inline">{isDark ? t('common.light', 'Light') : t('common.dark', 'Dark')}</span>
      )}
    </Button>
  );
}
