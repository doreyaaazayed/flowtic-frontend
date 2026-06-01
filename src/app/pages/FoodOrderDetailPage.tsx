import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, RotateCcw, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { food } from '../lib/api';
import { Section, Reveal } from '../liquid';
import { OrderTimeline } from '../components/food/OrderTimeline';
import { Button } from '../components/ui/button';
import { BrandLogo } from '../components/food/PaymentMethodCard';
import { isFoodOrderEditable } from '../lib/cardValidation';
import { useFoodOrderPolling } from '../hooks/useFoodOrderPolling';

export function FoodOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const numericId = Number(orderId);
  const [data, setData] = useState<Awaited<ReturnType<typeof food.getOrder>> | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericId)) return;
    food
      .getOrder(numericId)
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : ''));
  }, [numericId]);

  useFoodOrderPolling(numericId, {
    enabled: Number.isFinite(numericId),
    onUpdate: setData,
  });

  if (!data) {
    return (
      <Section tight>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </Section>
    );
  }

  const { order, items, event } = data;
  const eventMongoId = order.eventMongoId;
  const editable = isFoodOrderEditable(order.Status);
  const brand = order.paymentBrand || (order.paymentMethod === 'cod' ? 'cod' : 'other');

  return (
    <Section tight>
      <Reveal>
        <Link to="/food/orders" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4 lg-arrow-flip" />
          {t('foodOrder.myOrders')}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display-3">
              {event?.Name || t('foodOrder.order')} #{order.OrderID}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.deliveryMethodName || order.deliveryMethod} ·{' '}
              {new Date(order.createdAt).toLocaleString()}
              {order.editCount ? ` · ${t('foodOrder.editedTimes', { count: order.editCount })}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Link to={`/food/orders/${order.OrderID}/edit`}>
                <Button className="gap-2 rounded-full bg-gradient-to-r from-primary to-secondary">
                  <Pencil className="h-4 w-4" />
                  {t('foodOrder.editOrder')}
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={async () => {
                try {
                  await food.reorder(order.OrderID);
                  toast.success(t('foodOrder.reorderDone'));
                  if (eventMongoId) navigate(`/event/${eventMongoId}/food`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : '');
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t('foodOrder.reorder')}
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg-card p-6"
        >
          <h2 className="mb-4 font-semibold">{t('foodOrder.tracking')}</h2>
          <OrderTimeline
            status={order.Status}
            estimatedReadyAt={order.estimatedReadyAt}
            estimatedDeliveryMinutes={order.estimatedDeliveryMinutes}
          />
          <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('foodOrder.deliveryTitle')}</span>
              <span className="font-medium">
                {order.deliveryMethodName || order.deliveryMethod}
              </span>
            </div>
            {order.seatLabel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('foodOrder.seatLabel')}</span>
                <span className="font-medium">{order.seatLabel}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('foodOrder.paymentTitle')}</span>
              <span className="flex items-center gap-2 font-medium">
                <BrandLogo brand={brand} />
                <span className="capitalize">
                  {order.paymentMethod === 'card'
                    ? t('foodOrder.payCard')
                    : order.paymentMethod}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
        <div className="lg-card p-6 space-y-4">
          <h2 className="font-semibold">{t('foodOrder.summary')}</h2>
          <ul className="space-y-2 text-sm">
            {items.map((line) => (
              <li key={`${line.Name}-${line.quantity}`} className="flex justify-between">
                <span>
                  {line.Name} × {line.quantity}
                </span>
                <span>EGP {line.lineTotal}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>{t('foodOrder.subtotal')}</span>
              <span>EGP {order.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('foodOrder.serviceFee')}</span>
              <span>EGP {order.serviceFee.toFixed(0)}</span>
            </div>
            {(order.deliveryFee ?? 0) > 0 && (
              <div className="flex justify-between">
                <span>{t('foodOrder.deliveryFee')}</span>
                <span>EGP {(order.deliveryFee ?? 0).toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('foodOrder.tax')}</span>
              <span>EGP {order.taxAmount.toFixed(0)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
              <span>{t('foodOrder.total')}</span>
              <span className="text-luxe">EGP {order.totalAmount.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
