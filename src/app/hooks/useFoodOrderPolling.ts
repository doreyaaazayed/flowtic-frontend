import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { food } from '../lib/api';
import { foodOrderStatusToast } from '../lib/foodOrderStatus';

const POLL_MS = 12_000;

/**
 * Polls a single order and invokes callbacks when status changes.
 * Shows status toasts when the kitchen advances the order.
 */
export function useFoodOrderPolling(
  orderId: number | undefined,
  options: {
    enabled?: boolean;
    onUpdate?: (order: Awaited<ReturnType<typeof food.getOrder>>) => void;
    notify?: boolean;
  } = {},
) {
  const { t } = useTranslation();
  const { enabled = true, onUpdate, notify = true } = options;
  const lastStatus = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !orderId || !Number.isFinite(orderId)) return;

    let alive = true;

    const tick = async () => {
      try {
        const data = await food.getOrder(orderId);
        if (!alive) return;
        const status = data.order.Status;
        if (lastStatus.current !== null && lastStatus.current !== status) {
          const msg = foodOrderStatusToast(status, t);
          if (notify && msg) toast.info(msg);
        }
        lastStatus.current = status;
        onUpdateRef.current?.(data);
      } catch {
        /* ignore transient poll errors */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [orderId, enabled, notify, t]);
}

/**
 * Polls the user's order list (lighter than N detail calls).
 */
export function useFoodOrdersListPolling(
  enabled: boolean,
  onUpdate: (orders: Awaited<ReturnType<typeof food.myOrders>>) => void,
  eventId?: string,
) {
  const { t } = useTranslation();
  const lastMap = useRef<Record<number, string>>({});
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    const tick = async () => {
      try {
        const orders = await food.myOrders(eventId);
        if (!alive) return;
        for (const o of orders) {
          const prev = lastMap.current[o.OrderID];
          if (prev !== undefined && prev !== o.Status) {
            const msg = foodOrderStatusToast(o.Status, t);
            if (msg) toast.info(msg);
          }
          lastMap.current[o.OrderID] = o.Status;
        }
        onUpdateRef.current(orders);
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [enabled, eventId, t]);
}
