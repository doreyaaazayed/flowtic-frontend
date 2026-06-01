export type GlobalLoadingState = {
  /** True when the UI should show the global loading chrome */
  active: boolean;
  /** In-flight tracked operations (API calls, etc.) */
  pending: number;
};

type Listener = (state: GlobalLoadingState) => void;

let pending = 0;
let active = false;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

/** Avoid flicker on fast mutations; reads no longer use this overlay by default */
const SHOW_DELAY_MS = 220;
const HIDE_DELAY_MS = 140;

function emit() {
  const state: GlobalLoadingState = { active, pending };
  listeners.forEach((fn) => fn(state));
}

function scheduleShow() {
  if (showTimer || active) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  showTimer = setTimeout(() => {
    showTimer = null;
    if (pending > 0) {
      active = true;
      emit();
    }
  }, SHOW_DELAY_MS);
}

function scheduleHide() {
  if (hideTimer) return;
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  hideTimer = setTimeout(() => {
    hideTimer = null;
    active = false;
    emit();
  }, HIDE_DELAY_MS);
}

/** Call when an async operation starts (usually from API client). */
export function globalLoadingStart(): void {
  pending += 1;
  if (pending === 1) scheduleShow();
  else emit();
}

/** Call when an async operation completes or fails. */
export function globalLoadingEnd(): void {
  pending = Math.max(0, pending - 1);
  if (pending === 0) scheduleHide();
  else emit();
}

export function subscribeGlobalLoading(listener: Listener): () => void {
  listeners.add(listener);
  listener({ active, pending });
  return () => listeners.delete(listener);
}

/** Wrap any promise so the global indicator runs (forms, uploads, etc.). */
export async function withGlobalLoading<T>(fn: () => Promise<T>): Promise<T> {
  globalLoadingStart();
  try {
    return await fn();
  } finally {
    globalLoadingEnd();
  }
}
