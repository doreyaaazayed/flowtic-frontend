import { getToken, notifications as notificationsApi } from './api';

export type NotificationRow = {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt?: string;
};

type Snapshot = { rows: NotificationRow[]; unread: number };

type Listener = (snap: Snapshot) => void;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let inflight: Promise<void> | null = null;
let lastSnapshot: Snapshot = { rows: [], unread: 0 };
const listeners = new Set<Listener>();

async function fetchOnce() {
  if (!getToken()) {
    lastSnapshot = { rows: [], unread: 0 };
    listeners.forEach((l) => l(lastSnapshot));
    return;
  }
  try {
    const d = await notificationsApi.list({ limit: 25 });
    lastSnapshot = {
      rows: Array.isArray(d.notifications) ? d.notifications : [],
      unread: typeof d.unread === 'number' ? d.unread : 0,
    };
  } catch {
    lastSnapshot = { rows: [], unread: 0 };
  }
  listeners.forEach((l) => l(lastSnapshot));
}

function ensurePoller() {
  if (pollTimer) return;
  void (inflight = fetchOnce().finally(() => {
    inflight = null;
  }));
  pollTimer = setInterval(() => {
    if (!inflight) inflight = fetchOnce().finally(() => { inflight = null; });
  }, 45000);
}

function stopPollerIfIdle() {
  if (listeners.size === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Subscribe to shared notification state — one poll interval for the whole app. */
export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  listener(lastSnapshot);
  ensurePoller();
  return () => {
    listeners.delete(listener);
    stopPollerIfIdle();
  };
}

/** Force refresh (e.g. when popover opens or user marks read). */
export function refreshNotifications() {
  if (!inflight) inflight = fetchOnce().finally(() => { inflight = null; });
}
