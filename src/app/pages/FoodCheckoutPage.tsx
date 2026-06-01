import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  food,
  profile,
  type DeliveryMethod,
  type FoodCartLine,
  type FoodPaymentBrand,
  type FoodPaymentMethod,
} from '../lib/api';
import { Section, Reveal } from '../liquid';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { DeliveryMethodCard } from '../components/food/DeliveryMethodCard';
import {
  PaymentMethodCard,
  type PaymentOption,
} from '../components/food/PaymentMethodCard';
import {
  CreditCardCheckoutForm,
  type CardFormValues,
} from '../components/food/CreditCardCheckoutForm';
import { OrderSummaryCard } from '../components/food/OrderSummaryCard';
import { resolveFoodCardPayment } from '../lib/foodPayment';
import {
  DEFAULT_SEAT_DELIVERY,
  filterSeatDeliveryMethods,
  resolveDeliveryCode,
  type SeatDeliveryInfo,
} from '../lib/foodDelivery';
import { validateCardForm } from '../lib/cardValidation';

type TotalsState = {
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  estimatedDeliveryMinutes: number;
};

const ZERO_TOTALS: TotalsState = {
  subtotal: 0,
  serviceFee: 0,
  deliveryFee: 0,
  taxAmount: 0,
  totalAmount: 0,
  estimatedDeliveryMinutes: 0,
};

function buildPaymentOptions(t: (key: string) => string): PaymentOption[] {
  return [
    {
      id: 'card',
      paymentMethod: 'card',
      label: t('foodOrder.payCard'),
      description: t('foodOrder.payCardDesc'),
    },
    {
      id: 'cod',
      paymentMethod: 'cod',
      label: t('foodOrder.payCod'),
      description: t('foodOrder.payCodDesc'),
    },
  ];
}

export function FoodCheckoutPage() {
  const { eventId = '' } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<FoodCartLine[]>([]);
  const [totals, setTotals] = useState<TotalsState>(ZERO_TOTALS);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [seatDelivery, setSeatDelivery] = useState<SeatDeliveryInfo>(DEFAULT_SEAT_DELIVERY);
  const [deliveryCode, setDeliveryCode] = useState<string>('pickup');
  const [cards, setCards] = useState<
    Array<{ _id: string; lastFour: string; brand: string }>
  >([]);
  const [paymentOptionId, setPaymentOptionId] = useState<string>('card');
  const [paymentCardId, setPaymentCardId] = useState('');
  const [useNewCard, setUseNewCard] = useState(true);
  const [cardForm, setCardForm] = useState<CardFormValues>({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormValues, string>>>({});
  const [seatLabel, setSeatLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderIds, setOrderIds] = useState<number[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const paymentOptions = useMemo(() => buildPaymentOptions(t), [t]);
  const paymentOption =
    paymentOptions.find((o) => o.id === paymentOptionId) ?? paymentOptions[0];
  const selectedDelivery = deliveryMethods.find((m) => m.code === deliveryCode);

  useEffect(() => {
    if (!user) {
      navigate('/signin', { state: { from: `/event/${eventId}/food/checkout` } });
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoadingCart(true);
        const [cartRes, methodsRes, cardList] = await Promise.all([
          food.getCart(eventId, 'pickup'),
          food.deliveryMethods(eventId),
          profile.cards.list().catch(() => []),
        ]);
        if (!alive) return;
        setItems(cartRes.items);
        if (cartRes.totals)
          setTotals({
            subtotal: cartRes.totals.subtotal,
            serviceFee: cartRes.totals.serviceFee,
            deliveryFee: cartRes.totals.deliveryFee ?? 0,
            taxAmount: cartRes.totals.taxAmount,
            totalAmount: cartRes.totals.totalAmount,
            estimatedDeliveryMinutes:
              cartRes.totals.estimatedDeliveryMinutes ?? 0,
          });
        const seatInfo = methodsRes.seatDelivery ?? DEFAULT_SEAT_DELIVERY;
        setSeatDelivery(seatInfo);
        const filtered = filterSeatDeliveryMethods(methodsRes.methods, seatInfo);
        setDeliveryMethods(filtered);
        setDeliveryCode((c) => resolveDeliveryCode(filtered, c));
        if (seatInfo.canDeliverToSeat && seatInfo.seatLabel) {
          setSeatLabel(seatInfo.seatLabel);
        }
        setCards(cardList);
        setUseNewCard(cardList.length === 0);
        if (!cartRes.items.length) toast.error(t('foodOrder.cartEmpty'));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('foodOrder.error'));
      } finally {
        if (alive) setLoadingCart(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, eventId, navigate, t]);

  const refreshTotals = async (code: string) => {
    setRecalculating(true);
    try {
      const r = await food.getCart(eventId, code);
      setItems(r.items);
      if (r.totals)
        setTotals({
          subtotal: r.totals.subtotal,
          serviceFee: r.totals.serviceFee,
          deliveryFee: r.totals.deliveryFee ?? 0,
          taxAmount: r.totals.taxAmount,
          totalAmount: r.totals.totalAmount,
          estimatedDeliveryMinutes: r.totals.estimatedDeliveryMinutes ?? 0,
        });
    } finally {
      setRecalculating(false);
    }
  };

  const changeQty = async (line: FoodCartLine, next: number) => {
    const qty = Math.max(0, next);
    setRecalculating(true);
    try {
      if (qty === 0) {
        await food.removeFromCart({ eventId, foodItemId: line.foodItemId });
      } else {
        await food.updateCart({ eventId, foodItemId: line.foodItemId, quantity: qty });
      }
      await refreshTotals(deliveryCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('foodOrder.error'));
      setRecalculating(false);
    }
  };

  const placeOrder = async () => {
    if (!paymentOption) return;
    setPlacing(true);
    try {
      let paymentMethod: FoodPaymentMethod = paymentOption.paymentMethod;
      let paymentBrand: FoodPaymentBrand = 'cod';
      let paymentCardIdResolved: string | undefined;

      if (paymentMethod === 'card') {
        const resolved = await resolveFoodCardPayment({
          useNewCard,
          selectedCardId: paymentCardId,
          savedCards: cards,
          form: cardForm,
          t,
        });
        paymentCardIdResolved = resolved.paymentCardId;
        paymentBrand = resolved.paymentBrand;
      }

      const res = await food.checkout({
        eventId,
        deliveryMethodCode: deliveryCode,
        paymentMethod,
        paymentBrand,
        paymentCardId: paymentCardIdResolved,
        seatLabel,
        notes,
        idempotencyKey: `food-${eventId}-${user?.id}-${Date.now()}`,
      });
      const ids =
        res.splitOrders && res.orders?.length
          ? res.orders.map((o) => o.order.OrderID)
          : [res.order.OrderID];
      setOrderIds(ids);
      toast.success(
        ids.length > 1
          ? t('foodOrder.ordersConfirmedSplit', { count: ids.length })
          : t('foodOrder.orderConfirmed'),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('foodOrder.orderFailed'));
    } finally {
      setPlacing(false);
    }
  };

  if (orderIds.length > 0) {
    const primaryId = orderIds[0];
    return (
      <Section tight>
        <Reveal>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg-card mx-auto max-w-xl p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_20px_60px_-15px_rgba(16,185,129,0.6)]"
            >
              <CheckCircle2 className="h-10 w-10" />
            </motion.div>
            <h2 className="display-3">{t('foodOrder.successTitle')}</h2>
            <p className="mt-2 text-muted-foreground">
              {orderIds.length > 1
                ? t('foodOrder.successSubSplit', { ids: orderIds.map((id) => `#${id}`).join(', ') })
                : t('foodOrder.successSub')}{' '}
              {orderIds.length === 1 ? (
                <span className="font-bold text-foreground">#{primaryId}</span>
              ) : null}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to={`/food/orders/${primaryId}`}>
                <Button className="rounded-full bg-gradient-to-r from-primary to-secondary">
                  {t('foodOrder.viewOrder')}
                </Button>
              </Link>
              <Link to={`/event/${eventId}/food`}>
                <Button variant="outline" className="rounded-full">
                  {t('foodOrder.backToMenu')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </Reveal>
      </Section>
    );
  }

  return (
    <Section tight>
      <Reveal>
        <Link
          to={`/event/${eventId}/food`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 lg-arrow-flip" />
          {t('foodOrder.backToMenu')}
        </Link>
        <h1 className="display-3">{t('foodOrder.checkoutTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('foodOrder.checkoutSub')}</p>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg-card p-6"
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{t('foodOrder.orderItems')}</h2>
              {recalculating && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('foodOrder.recalculating')}
                </span>
              )}
            </header>
            {loadingCart ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('foodOrder.cartEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {items.map((line) => (
                    <motion.li
                      key={line.foodItemId}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt={line.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            🍴
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          EGP {line.unitPrice.toFixed(0)} · {line.preparationTimeMinutes ?? 15}{' '}
                          {t('foodOrder.min')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/50 p-1">
                        <button
                          type="button"
                          onClick={() => changeQty(line, line.quantity - 1)}
                          aria-label={t('foodOrder.decrease')}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                        >
                          {line.quantity === 1 ? (
                            <Trash2 className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(line, line.quantity + 1)}
                          aria-label={t('foodOrder.increase')}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="w-20 text-end text-sm font-semibold tabular-nums">
                        EGP {line.lineTotal.toFixed(0)}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg-card p-6"
          >
            <h2 className="mb-1 font-semibold">{t('foodOrder.deliveryTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t('foodOrder.deliverySub')}
            </p>
            {loadingCart ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {deliveryMethods.map((m) => (
                  <DeliveryMethodCard
                    key={m.code}
                    method={m}
                    selected={deliveryCode === m.code}
                    onSelect={() => {
                      setDeliveryCode(m.code);
                      void refreshTotals(m.code);
                    }}
                  />
                ))}
              </div>
            )}
            {seatDelivery.canDeliverToSeat &&
              selectedDelivery?.code === 'seat_delivery' && (
              <div className="mt-4">
                <Label>{t('foodOrder.seatLabel')}</Label>
                <Input
                  value={seatLabel}
                  onChange={(e) => setSeatLabel(e.target.value)}
                  placeholder="A · Row 4 · Seat 12"
                  readOnly={Boolean(seatDelivery.seatLabel)}
                  className={seatDelivery.seatLabel ? 'bg-muted/50' : undefined}
                />
                {seatDelivery.seatLabel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('foodOrder.seatFromTicket')}
                  </p>
                ) : null}
              </div>
            )}
            {selectedDelivery?.tier === 'premium' && (
              <div className="mt-4">
                <Label>{t('foodOrder.tableLabel')}</Label>
                <Input
                  value={seatLabel}
                  onChange={(e) => setSeatLabel(e.target.value)}
                  placeholder={t('foodOrder.tablePlaceholder')}
                />
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg-card p-6"
          >
            <h2 className="mb-1 font-semibold">{t('foodOrder.paymentTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t('foodOrder.paymentSub')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((opt) => (
                <PaymentMethodCard
                  key={opt.id}
                  option={opt}
                  selected={paymentOptionId === opt.id}
                  onSelect={() => setPaymentOptionId(opt.id)}
                />
              ))}
            </div>

            <AnimatePresence>
              {paymentOption?.paymentMethod === 'card' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <CreditCardCheckoutForm
                    savedCards={cards}
                    selectedCardId={paymentCardId}
                    onSelectCard={setPaymentCardId}
                    values={cardForm}
                    onValuesChange={setCardForm}
                    useNewCard={useNewCard}
                    onUseNewCardChange={setUseNewCard}
                    disabled={placing || loadingCart}
                    processing={placing}
                    errors={cardErrors}
                    onBlurValidate={() => setCardErrors(validateCardForm(cardForm, t))}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5">
              <Label>{t('foodOrder.notes')}</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('foodOrder.notesPlaceholder')}
              />
            </div>
          </motion.section>
        </div>

        <OrderSummaryCard
          items={items.map((i) => ({
            foodItemId: i.foodItemId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
            imageUrl: i.imageUrl,
          }))}
          totals={totals}
          deliveryMethodName={selectedDelivery?.name}
          loading={recalculating || loadingCart}
          footer={
            <Button
              size="lg"
              disabled={placing || !items.length || loadingCart}
              onClick={() => void placeOrder()}
              className="w-full rounded-full bg-gradient-to-r from-primary to-secondary text-base font-semibold shadow-[0_20px_60px_-20px_rgba(99,102,241,0.6)]"
            >
              {placing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('foodOrder.placing')}
                </>
              ) : (
                t('foodOrder.placeOrder')
              )}
            </Button>
          }
        />
      </div>
    </Section>
  );
}
