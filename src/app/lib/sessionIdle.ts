/** Inactivity limit before the client signs the user out. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

export const LAST_ACTIVITY_KEY = 'flowtic_last_activity';

const CHECK_INTERVAL_MS = 30_000;
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;

export function getLastActivityAt(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function touchSessionActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearSessionActivity(): void {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function isSessionIdleExpired(idleMs: number = SESSION_IDLE_MS): boolean {
  const last = getLastActivityAt();
  if (last == null) return false;
  return Date.now() - last > idleMs;
}

/**
 * While signed in, log out after `idleMs` without pointer/keyboard/scroll activity.
 * Syncs last-activity across tabs via localStorage.
 */
export function startSessionIdleWatch(onIdle: () => void, idleMs: number = SESSION_IDLE_MS): () => void {
  let lastWrite = 0;

  const markActive = () => {
    const now = Date.now();
    if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
    lastWrite = now;
    touchSessionActivity();
  };

  const checkIdle = () => {
    if (isSessionIdleExpired(idleMs)) onIdle();
  };

  checkIdle();

  const events = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'] as const;
  for (const e of events) {
    window.addEventListener(e, markActive, { passive: true });
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkIdle();
      markActive();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
      lastWrite = Date.now();
      checkIdle();
    }
  };
  window.addEventListener('storage', onStorage);

  const interval = window.setInterval(checkIdle, CHECK_INTERVAL_MS);

  return () => {
    for (const e of events) {
      window.removeEventListener(e, markActive);
    }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('storage', onStorage);
    clearInterval(interval);
  };
}
