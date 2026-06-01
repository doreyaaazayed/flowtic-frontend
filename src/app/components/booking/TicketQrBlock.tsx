import { forwardRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { BookingQrCode } from './BookingQrCode';

type TicketQrBlockProps = {
  qrValue: string;
  size?: number;
  ticketIds?: number[];
  bookingId?: number;
  /** Hide booking line when only ticket IDs matter */
  showBookingId?: boolean;
};

export const TicketQrBlock = forwardRef<HTMLCanvasElement, TicketQrBlockProps>(function TicketQrBlock(
  { qrValue, size = 120, ticketIds, bookingId, showBookingId = true },
  ref,
) {
  const { t } = useTranslation();
  const ids = (ticketIds ?? []).filter((n) => Number.isFinite(n) && n > 0);

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="rounded-lg flex items-center justify-center bg-white p-1 border border-border"
        style={{ width: size + 8, height: size + 8 }}
      >
        <BookingQrCode ref={ref as Ref<HTMLCanvasElement>} value={qrValue} size={size} level="M" />
      </div>
      {ids.length > 0 && (
        <div className="mt-3 text-center w-full max-w-[14rem]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {ids.length === 1
              ? t('booking.ticketIdLabel')
              : t('booking.ticketIdsLabel', { count: ids.length })}
          </p>
          <div className="flex flex-col gap-0.5">
            {ids.map((id) => (
              <p
                key={id}
                className="font-mono text-lg font-semibold text-foreground tabular-nums leading-tight"
              >
                {id}
              </p>
            ))}
          </div>
        </div>
      )}
      {showBookingId && bookingId != null && (
        <p className="text-xs text-muted-foreground mt-2">
          {t('booking.bookingRef', { id: bookingId })}
        </p>
      )}
    </div>
  );
});
