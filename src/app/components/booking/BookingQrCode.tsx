import { forwardRef, lazy, Suspense, type ComponentProps } from 'react';

const QRCodeCanvas = lazy(() =>
  import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas })),
);

type QrProps = ComponentProps<typeof QRCodeCanvas>;

export const BookingQrCode = forwardRef<HTMLCanvasElement, QrProps>(function BookingQrCode(
  props,
  ref,
) {
  return (
    <Suspense
      fallback={
        <div
          className="rounded bg-muted animate-pulse"
          style={{ width: props.size ?? 120, height: props.size ?? 120 }}
        />
      }
    >
      <QRCodeCanvas ref={ref} {...props} />
    </Suspense>
  );
});
