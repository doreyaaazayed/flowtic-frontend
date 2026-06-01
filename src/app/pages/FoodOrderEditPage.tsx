import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Trash2,
  PlusCircle,
  Save,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  food,
  profile,
  type DeliveryMethod,
  type FoodMenuItem,
  type FoodPaymentBrand,
  type FoodPaymentMethod,
} from '../lib/api';
import { Section, Reveal } from '../liquid';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { isFoodOrderEditable, validateCardForm } from '../lib/cardValidation';
import { useFoodOrderPolling } from '../hooks/useFoodOrderPolling';

const SERVICE_RATE = 0.05;
const TAX_RATE = 0.14;

type EditLine = {
  foodItemId: number;
  name: string;
  unitPrice: number;
  imageUrl?: string;
  quantity: number;
  stockQuantity?: number;
};

const EDITABLE_STATUSES = new Set(['Pending', 'Confirmed']); // mirror backend

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

function brandToOption(method?: string): string {
  if (method === 'cod') return 'cod';
  return 'card';
}

export function FoodOrderEditPage() {
  const { orderId: orderIdParam } = useParams();
  const orderId = Number(orderIdParam);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [eventId, setEventId] = useState<string>('');
  const [eventMongoId, setEventMongoId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [lines, setLines] = useState<EditLine[]>([]);
  const [originalLines, setOriginalLines] = useState<EditLine[]>([]);
  const [menu, setMenu] = useState<FoodMenuItem[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [seatDelivery, setSeatDelivery] = useState<SeatDeliveryInfo>(DEFAULT_SEAT_DELIVERY);
  const [deliveryCode, setDeliveryCode] = useState<string>('pickup');
  const [paymentOptionId, setPaymentOptionId] = useState<string>('card');
  const [paymentCardId, setPaymentCardId] = useState<string>('');
  const [useNewCard, setUseNewCard] = useState(true);
  const [cardForm, setCardForm] = useState<CardFormValues>({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormValues, string>>>({});
  const [cards, setCards] = useState<
    Array<{ _id: string; lastFour: string; brand: string }>
  >([]);
  const [seatLabel, setSeatLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const paymentOptions = useMemo(() => buildPaymentOptions(t), [t]);
  const paymentOption =
    paymentOptions.find((o) => o.id === paymentOptionId) ?? paymentOptions[0];
  const selectedDelivery = deliveryMethods.find((m) => m.code === deliveryCode);
  const editable = isFoodOrderEditable(status);

  useFoodOrderPolling(orderId, {
    enabled: editable && Number.isFinite(orderId),
    notify: true,
    onUpdate: (data) => {
      setStatus(data.order.Status);
      if (!isFoodOrderEditable(data.order.Status)) {
        toast.error(t('foodOrder.editLocked'));
        navigate(`/food/orders/${orderId}`, { replace: true });
      }
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin', { state: { from: `/food/orders/${orderId}/edit` } });
      return;
    }
    if (!Number.isFinite(orderId)) {
      navigate('/food/orders', { replace: true });
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const orderRes = await food.getOrder(orderId);
        if (!alive) return;
        const o = orderRes.order;
        setStatus(o.Status);
        setEventId(o.eventMongoId || String(o.EventID));
        setEventMongoId(o.eventMongoId || '');
        setDeliveryCode(o.deliveryMethodCode || o.deliveryMethod || 'pickup');
        setSeatLabel(o.seatLabel || '');
        setNotes(o.notes || '');
        setPaymentCardId(o.paymentCardId || '');
        setPaymentOptionId(brandToOption(o.paymentMethod));

        const initialLines: EditLine[] = orderRes.items.map((it) => ({
          foodItemId: it.FoodItemID,
          name: it.Name,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        }));
        setLines(initialLines);
        setOriginalLines(initialLines);

        if (!isFoodOrderEditable(o.Status)) {
          setLoading(false);
          return;
        }

        const targetEventId = o.eventMongoId || String(o.EventID);
        const [methodsRes, menuRes, cardList] = await Promise.all([
          food.deliveryMethods(targetEventId),
          food.getMenu(targetEventId).catch(() => null),
          profile.cards.list().catch(() => []),
        ]);
        if (!alive) return;
        const seatInfo = methodsRes.seatDelivery ?? DEFAULT_SEAT_DELIVERY;
        setSeatDelivery(seatInfo);
        const filtered = filterSeatDeliveryMethods(methodsRes.methods, seatInfo);
        setDeliveryMethods(filtered);
        const initialCode = o.deliveryMethodCode || o.deliveryMethod || 'pickup';
        setDeliveryCode(resolveDeliveryCode(filtered, initialCode));
        if (
          (initialCode === 'seat_delivery' || o.seatLabel) &&
          !seatInfo.canDeliverToSeat &&
          filtered.length
        ) {
          toast.message(t('foodOrder.seatDeliveryUnavailable'));
        }
        if (seatInfo.canDeliverToSeat && seatInfo.seatLabel && !o.seatLabel) {
          setSeatLabel(seatInfo.seatLabel);
        }
        if (menuRes) {
          setMenu(menuRes.items);
          setLines((prev) =>
            prev.map((l) => {
              const item = menuRes.items.find((m) => m.FoodItemID === l.foodItemId);
              return item
                ? {
                    ...l,
                    imageUrl: item.imageUrl,
                    stockQuantity: item.stockQuantity + l.quantity,
                  }
                : l;
            }),
          );
        }
        setCards(cardList);
        setUseNewCard(!o.paymentCardId && cardList.length === 0);
        if (o.paymentCardId) {
          setPaymentCardId(o.paymentCardId);
          setUseNewCard(false);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('foodOrder.error'));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, orderId, navigate, t]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const serviceFee = Math.round(subtotal * SERVICE_RATE * 100) / 100;
  const deliveryFee = selectedDelivery?.price ?? 0;
  const taxable = subtotal + serviceFee + deliveryFee;
  const taxAmount = Math.round(taxable * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((taxable + taxAmount) * 100) / 100;
  const estimatedDeliveryMinutes = selectedDelivery?.estimatedDeliveryMinutes ?? 0;

  const changeQty = (foodItemId: number, next: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.foodItemId === foodItemId
            ? {
                ...l,
                quantity: Math.max(0, Math.min(l.stockQuantity ?? 20, next)),
              }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const addItem = (item: FoodMenuItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.foodItemId === item.FoodItemID);
      if (existing) {
        return prev.map((l) =>
          l.foodItemId === item.FoodItemID
            ? { ...l, quantity: Math.min(item.stockQuantity, l.quantity + 1) }
            : l,
        );
      }
      return [
        ...prev,
        {
          foodItemId: item.FoodItemID,
          name: item.Name,
          unitPrice: item.Price,
          imageUrl: item.imageUrl,
          quantity: 1,
          stockQuantity: item.stockQuantity,
        },
      ];
    });
    setShowAdd(false);
  };

  const hasChanges = useMemo(() => {
    if (lines.length !== originalLines.length) return true;
    for (const l of lines) {
      const o = originalLines.find((x) => x.foodItemId === l.foodItemId);
      if (!o || o.quantity !== l.quantity) return true;
    }
    return false;
  }, [lines, originalLines]);

  const submit = async () => {
    if (!lines.length) {
      toast.error(t('foodOrder.atLeastOne'));
      return;
    }
    setSaving(true);
    try {
      let paymentMethod: FoodPaymentMethod = paymentOption?.paymentMethod ?? 'card';
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

      await food.editOrder(orderId, {
        items: lines.map((l) => ({ foodItemId: l.foodItemId, quantity: l.quantity })),
        deliveryMethodCode: deliveryCode,
        paymentMethod,
        paymentBrand,
        paymentCardId: paymentCardIdResolved,
        seatLabel,
        notes,
      });
      toast.success(t('foodOrder.editSaved'));
      navigate(`/food/orders/${orderId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('foodOrder.editFailed'));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <Section tight>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </Section>
    );
  }

  if (!editable) {
    return (
      <Section tight>
        <Reveal>
          <div className="lg-card mx-auto max-w-xl p-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h2 className="mt-4 text-2xl font-bold">{t('foodOrder.editLockedTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('foodOrder.editLocked')}</p>
            <Link to={`/food/orders/${orderId}`}>
              <Button variant="outline" className="mt-6 rounded-full">
                {t('foodOrder.viewOrder')}
              </Button>
            </Link>
          </div>
        </Reveal>
      </Section>
    );
  }

  return (
    <Section tight>
      <Reveal>
        <Link
          to={`/food/orders/${orderId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 lg-arrow-flip" />
          {t('foodOrder.backToOrder')}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display-3">{t('foodOrder.editTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('foodOrder.editSub')} · #{orderId}
            </p>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500">
            {status}
          </span>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg-card p-6"
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{t('foodOrder.orderItems')}</h2>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full"
                onClick={() => setShowAdd((s) => !s)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {t('foodOrder.addItems')}
              </Button>
            </header>

            <AnimatePresence>
              {showAdd && menu.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden rounded-2xl border border-dashed border-border bg-card/40 p-4"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('foodOrder.pickAnotherItem')}
                  </p>
                  <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                    {menu
                      .filter((m) => m.availability && m.stockQuantity > 0)
                      .slice(0, 24)
                      .map((m) => (
                        <button
                          key={m.FoodItemID}
                          type="button"
                          onClick={() => addItem(m)}
                          className="group flex items-center gap-2 rounded-xl border border-border bg-background/60 p-2 text-start transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-card">
                            {m.imageUrl ? (
                              <img
                                src={m.imageUrl}
                                alt={m.Name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm">
                                🍴
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{m.Name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              EGP {m.Price.toFixed(0)}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('foodOrder.cartEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
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
                          EGP {line.unitPrice.toFixed(0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/50 p-1">
                        <button
                          type="button"
                          onClick={() => changeQty(line.foodItemId, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                          aria-label={t('foodOrder.decrease')}
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
                          onClick={() => changeQty(line.foodItemId, line.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                          aria-label={t('foodOrder.increase')}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="w-20 text-end text-sm font-semibold tabular-nums">
                        EGP {(line.unitPrice * line.quantity).toFixed(0)}
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
            transition={{ delay: 0.05 }}
            className="lg-card p-6"
          >
            <h2 className="mb-1 font-semibold">{t('foodOrder.deliveryTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t('foodOrder.deliverySub')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {deliveryMethods.map((m) => (
                <DeliveryMethodCard
                  key={m.code}
                  method={m}
                  selected={deliveryCode === m.code}
                  onSelect={() => setDeliveryCode(m.code)}
                />
              ))}
            </div>
            {seatDelivery.canDeliverToSeat && selectedDelivery?.code === 'seat_delivery' && (
              <div className="mt-4">
                <Label>{t('foodOrder.seatLabel')}</Label>
                <Input
                  value={seatLabel}
                  onChange={(e) => setSeatLabel(e.target.value)}
                  readOnly={Boolean(seatDelivery.seatLabel)}
                  className={seatDelivery.seatLabel ? 'bg-muted/50' : undefined}
                />
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
            transition={{ delay: 0.1 }}
            className="lg-card p-6"
          >
            <h2 className="mb-1 font-semibold">{t('foodOrder.paymentTitle')}</h2>
            <p className="mb-4 text-xs text-muted-foreground">{t('foodOrder.paymentSub')}</p>
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
                    disabled={saving}
                    processing={saving}
                    errors={cardErrors}
                    onBlurValidate={() => setCardErrors(validateCardForm(cardForm, t))}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-5">
              <Label>{t('foodOrder.notes')}</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </motion.section>

          <p className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {t('foodOrder.editWarning')}
          </p>
        </div>

        <OrderSummaryCard
          items={lines.map((l) => ({
            foodItemId: l.foodItemId,
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.unitPrice * l.quantity,
            imageUrl: l.imageUrl,
          }))}
          totals={{
            subtotal,
            serviceFee,
            deliveryFee,
            taxAmount,
            totalAmount,
            estimatedDeliveryMinutes,
          }}
          deliveryMethodName={selectedDelivery?.name}
          loading={saving}
          footer={
            <Button
              size="lg"
              disabled={saving || !lines.length || !hasChanges}
              onClick={() => setConfirming(true)}
              className="w-full gap-2 rounded-full bg-gradient-to-r from-primary to-secondary text-base font-semibold shadow-[0_20px_60px_-20px_rgba(99,102,241,0.6)]"
            >
              <Save className="h-4 w-4" />
              {t('foodOrder.saveChanges')}
            </Button>
          }
        />
      </div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md"
            onClick={() => !saving && setConfirming(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="lg-card mx-4 w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold">{t('foodOrder.confirmEditTitle')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('foodOrder.confirmEdit')}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="rounded-full bg-gradient-to-r from-primary to-secondary"
                  onClick={() => void submit()}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('foodOrder.saving')}
                    </>
                  ) : (
                    t('foodOrder.confirmSave')
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
