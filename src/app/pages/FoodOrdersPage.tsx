import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChefHat, ArrowRight, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { food } from '../lib/api';
import { Section, Reveal, Pill } from '../liquid';
import { Button } from '../components/ui/button';
import { OrderTimeline } from '../components/food/OrderTimeline';
import { isFoodOrderEditable } from '../lib/cardValidation';
import { useFoodOrdersListPolling } from '../hooks/useFoodOrderPolling';

type OrderRow = {
  OrderID: number;
  Status: string;
  totalAmount: number;
  eventName?: string;
  itemCount: number;
  createdAt: string;
  estimatedReadyAt?: string;
  estimatedDeliveryMinutes?: number;
};

export function FoodOrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    food
      .myOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  useFoodOrdersListPolling(!!user, setOrders);

  return (
    <Section tight>
      <Reveal>
        <Pill tone="gold" leadingIcon={<ChefHat className="h-3.5 w-3.5" />}>
          {t('foodOrder.ordersPill')}
        </Pill>
        <h1 className="display-2 mt-4">{t('foodOrder.myOrders')}</h1>
      </Reveal>

      <div className="mt-10 space-y-4">
        {loading && <p className="text-muted-foreground">{t('common.loading')}</p>}
        {!loading && orders.length === 0 && (
          <div className="lg-card p-10 text-center text-muted-foreground">
            {t('foodOrder.noOrders')}
            <Link to="/events" className="mt-4 block">
              <Button variant="outline">{t('nav.events')}</Button>
            </Link>
          </div>
        )}
        {orders.map((o, i) => {
          const editable = isFoodOrderEditable(o.Status);
          return (
            <motion.div
              key={o.OrderID}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="lg-card overflow-hidden p-5 transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Link
                  to={`/food/orders/${o.OrderID}`}
                  className="min-w-0 flex-1 space-y-1"
                >
                  <p className="font-semibold">{o.eventName || `Order #${o.OrderID}`}</p>
                  <p className="text-sm text-muted-foreground">
                    #{o.OrderID} · {o.itemCount} {t('foodOrder.items')} ·{' '}
                    <span className="font-medium text-foreground">{o.Status}</span>
                  </p>
                  <p className="text-lg font-bold text-luxe">EGP {o.totalAmount}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {editable && (
                    <Link to={`/food/orders/${o.OrderID}/edit`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-full"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t('foodOrder.editOrder')}
                      </Button>
                    </Link>
                  )}
                  <Link to={`/food/orders/${o.OrderID}`}>
                    <Button size="sm" variant="ghost" className="rounded-full">
                      <ArrowRight className="h-4 w-4 text-muted-foreground lg-arrow-flip" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mt-4 border-t border-border/60 pt-4">
                <OrderTimeline
                  status={o.Status}
                  compact
                  estimatedReadyAt={o.estimatedReadyAt}
                  estimatedDeliveryMinutes={o.estimatedDeliveryMinutes}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
