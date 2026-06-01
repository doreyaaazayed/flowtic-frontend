import type { TFunction } from 'i18next';

export const FOOD_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
  'Cancelled',
] as const;

export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

export const FOOD_ORDER_TIMELINE_STEPS: FoodOrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
];

export function foodOrderStatusIndex(status: string): number {
  const idx = FOOD_ORDER_TIMELINE_STEPS.indexOf(status as FoodOrderStatus);
  return idx >= 0 ? idx : 0;
}

export function foodOrderStatusLabel(status: string, t: TFunction): string {
  const keyMap: Record<string, string> = {
    Pending: 'foodOrder.timelineReceived',
    Confirmed: 'foodOrder.timelineConfirmed',
    Preparing: 'foodOrder.timelinePreparing',
    Ready: 'foodOrder.timelineReady',
    Completed: 'foodOrder.timelineDelivered',
    Cancelled: 'foodOrder.statusCancelled',
  };
  return t(keyMap[status] ?? 'foodOrder.order');
}

export function foodOrderStatusToast(status: string, t: TFunction): string | null {
  const keyMap: Record<string, string> = {
    Confirmed: 'foodOrder.toastConfirmed',
    Preparing: 'foodOrder.toastPreparing',
    Ready: 'foodOrder.toastReady',
    Completed: 'foodOrder.toastCompleted',
    Cancelled: 'foodOrder.toastCancelled',
  };
  const key = keyMap[status];
  return key ? t(key) : null;
}
