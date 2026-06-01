import type { DeliveryMethod } from './api';

export type SeatDeliveryInfo = {
  eventIsSeated: boolean;
  canDeliverToSeat: boolean;
  seatLabel: string | null;
};

export const DEFAULT_SEAT_DELIVERY: SeatDeliveryInfo = {
  eventIsSeated: false,
  canDeliverToSeat: false,
  seatLabel: null,
};

export function filterSeatDeliveryMethods(
  methods: DeliveryMethod[],
  seatDelivery?: SeatDeliveryInfo,
): DeliveryMethod[] {
  if (seatDelivery?.canDeliverToSeat) return methods;
  return methods.filter((m) => m.code !== 'seat_delivery');
}

export function resolveDeliveryCode(
  methods: DeliveryMethod[],
  current: string,
): string {
  if (methods.some((m) => m.code === current)) return current;
  return methods[0]?.code ?? 'pickup';
}
