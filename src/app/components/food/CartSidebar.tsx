import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FoodCartLine } from '../../lib/api';
import { Button } from '../ui/button';
import { QuantitySelector } from './QuantitySelector';

export function CartSidebar({
  eventId,
  items,
  subtotal,
  totals,
  onUpdateQty,
  onRemove,
  onClear,
}: {
  eventId: string;
  items: FoodCartLine[];
  subtotal: number;
  totals?: {
    subtotal: number;
    serviceFee: number;
    taxAmount: number;
    totalAmount: number;
  };
  onUpdateQty: (foodItemId: number, qty: number) => void;
  onRemove: (foodItemId: number) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const total = totals?.totalAmount ?? subtotal;

  return (
    <motion.aside
      layout
      className="lg-card sticky top-24 flex flex-col overflow-hidden border border-border/80 backdrop-blur-xl"
      style={{ maxHeight: 'calc(100dvh - 7rem)' }}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <span className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="h-5 w-5 text-primary" />
          {t('foodOrder.cart')}
        </span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            {t('foodOrder.clearCart')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('foodOrder.cartEmpty')}</p>
          ) : (
            items.map((line) => (
              <motion.div
                key={line.foodItemId}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="mb-3 flex gap-3 rounded-xl border border-border/50 bg-background/40 p-2"
              >
                <img
                  src={line.imageUrl || ''}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    EGP {line.unitPrice} × {line.quantity}
                  </p>
                  <QuantitySelector
                    value={line.quantity}
                    onChange={(q) => onUpdateQty(line.foodItemId, q)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.foodItemId)}
                  className="self-start p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {items.length > 0 && (
        <div className="border-t border-border/60 p-5 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t('foodOrder.subtotal')}</span>
              <span>EGP {(totals?.subtotal ?? subtotal).toFixed(0)}</span>
            </div>
            {totals && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('foodOrder.serviceFee')}</span>
                  <span>EGP {totals.serviceFee.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('foodOrder.tax')}</span>
                  <span>EGP {totals.taxAmount.toFixed(0)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>{t('foodOrder.total')}</span>
              <span className="text-luxe">EGP {total.toFixed(0)}</span>
            </div>
          </div>
          <Link to={`/event/${eventId}/food/checkout`}>
            <Button className="w-full rounded-full bg-gradient-to-r from-primary to-secondary">
              {t('foodOrder.checkout')}
            </Button>
          </Link>
        </div>
      )}
    </motion.aside>
  );
}
