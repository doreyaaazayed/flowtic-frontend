import type { NavigateFunction } from 'react-router-dom';
import type { NotificationRow } from './notificationStore';

/** Resolve in-app route for a notification from its type + meta. */
export function getNotificationTargetPath(
  notification: Pick<NotificationRow, 'type' | 'meta'>,
): string {
  const meta = (notification.meta ?? {}) as Record<string, unknown>;

  switch (notification.type) {
    case 'entry_assignment': {
      const eventMongoId = meta.eventMongoId;
      if (typeof eventMongoId === 'string' && eventMongoId) {
        return `/dashboard?entry=${encodeURIComponent(eventMongoId)}`;
      }
      return '/dashboard?entry=1';
    }
    case 'food_order': {
      const orderId = meta.orderId;
      if (orderId != null && String(orderId).length > 0) {
        return `/food/orders/${orderId}`;
      }
      const eventId = meta.eventId;
      if (typeof eventId === 'string' && eventId) {
        return `/event/${eventId}/food`;
      }
      return '/food/orders';
    }
    case 'event_deposit_required': {
      const checkoutPath = meta.checkoutPath;
      if (typeof checkoutPath === 'string' && checkoutPath.startsWith('/')) {
        return checkoutPath;
      }
      const eventMongoId = meta.eventMongoId;
      if (typeof eventMongoId === 'string' && eventMongoId) {
        return `/creator/events/${eventMongoId}/deposit`;
      }
      return '/creator?tab=events';
    }
    case 'event_deposit_paid':
    case 'event_approved': {
      const eventMongoId = meta.eventMongoId;
      if (typeof eventMongoId === 'string' && eventMongoId) {
        return `/creator/events/${eventMongoId}/deposit`;
      }
      return '/creator?tab=events';
    }
    case 'event_rejected':
      return '/creator?tab=events';
    default:
      return '/dashboard';
  }
}

export async function openNotification(
  notification: NotificationRow,
  opts: {
    navigate: NavigateFunction;
    markRead: (id: string) => Promise<unknown>;
    refresh: () => void;
    onClose?: () => void;
  },
): Promise<void> {
  if (!notification.read) {
    try {
      await opts.markRead(notification._id);
      opts.refresh();
    } catch {
      /* still navigate */
    }
  }
  opts.onClose?.();
  opts.navigate(getNotificationTargetPath(notification));
}
