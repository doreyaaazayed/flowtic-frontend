import { motion, AnimatePresence } from 'motion/react';
import { Clock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export type SummaryLine = {
  foodItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
};

export type SummaryTotals = {
  subtotal: number;
  serviceFee: number;
  deliveryFee?: number;
  taxAmount: number;
  totalAmount: number;
  estimatedDeliveryMinutes?: number;
};

type Props = {
  items: SummaryLine[];
  totals: SummaryTotals;
  deliveryMethodName?: string;
  loading?: boolean;
  currency?: string;
  footer?: ReactNode;
  className?: string;
  sticky?: boolean;
};

function MoneyRow({
  label,
  value,
  bold,
  pulse,
  currency = 'EGP',
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  pulse?: boolean;
  currency?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex justify-between transition-colors',
        bold ? 'text-base font-bold text-foreground' : 'text-sm text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value.toFixed(2)}
          initial={{ y: pulse ? -6 : 0, opacity: pulse ? 0 : 1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: pulse ? 6 : 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className={cn(highlight && 'text-luxe')}
        >
          {currency} {value.toFixed(0)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function OrderSummaryCard({
  items,
  totals,
  deliveryMethodName,
  loading = false,
  currency = 'EGP',
  footer,
  className,
  sticky = true,
}: Props) {
  const { t } = useTranslation();
  return (
    <aside
      className={cn(
        'lg-card relative overflow-hidden p-6',
        sticky && 'lg:sticky lg:top-24',
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-12 end-[-30%] h-44 w-44 rounded-full bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('foodOrder.summary')}
          </h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>

        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((line) => (
              <motion.li
                key={line.foodItemId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="flex items-center gap-3"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                  {line.imageUrl ? (
                    <img
                      src={line.imageUrl}
                      alt={line.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      🍴
                    </div>
                  )}
                  <span className="absolute -bottom-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    ×{line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {currency} {line.unitPrice.toFixed(0)} × {line.quantity}
                  </p>
                </div>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={`${line.foodItemId}-${line.lineTotal.toFixed(2)}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-sm font-semibold tabular-nums"
                  >
                    {currency} {line.lineTotal.toFixed(0)}
                  </motion.span>
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="mt-5 space-y-1.5 border-t border-border pt-4">
          <MoneyRow label={t('foodOrder.subtotal')} value={totals.subtotal} pulse currency={currency} />
          <MoneyRow
            label={t('foodOrder.serviceFee')}
            value={totals.serviceFee}
            pulse
            currency={currency}
          />
          <MoneyRow
            label={
              deliveryMethodName
                ? `${t('foodOrder.deliveryFee')} · ${deliveryMethodName}`
                : t('foodOrder.deliveryFee')
            }
            value={totals.deliveryFee ?? 0}
            pulse
            currency={currency}
          />
          <MoneyRow label={t('foodOrder.tax')} value={totals.taxAmount} pulse currency={currency} />
          <div className="mt-3 border-t border-border pt-3">
            <MoneyRow
              label={t('foodOrder.total')}
              value={totals.totalAmount}
              bold
              pulse
              highlight
              currency={currency}
            />
          </div>
          {totals.estimatedDeliveryMinutes ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t('foodOrder.eta', { count: totals.estimatedDeliveryMinutes })}
            </p>
          ) : null}
        </div>

        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </aside>
  );
}
