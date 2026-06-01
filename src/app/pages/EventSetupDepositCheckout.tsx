import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { CreditCardCheckoutForm } from '../components/food/CreditCardCheckoutForm';
import { events, profile } from '../lib/api';
import { formatEgp } from '../data/eventSetupCatalogue';
import { validateCardForm, type CardFormValues } from '../lib/cardValidation';

const INITIAL_CARD_FORM: CardFormValues = {
  cardholderName: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
};
import { resolveFoodCardPayment } from '../lib/foodPayment';
import { Pill } from '../liquid/Pill';

type SetupDepositState = {
  _id: string;
  Name: string;
  Status: string;
  setupDeposit?: {
    equipmentSubtotalEgp?: number;
    megaStarEgp?: number;
    subtotalEgp?: number;
    platformFeePercent?: number;
    platformFeeEgp?: number;
    totalEgp?: number;
    paymentStatus?: string;
    paidAt?: string;
  } | null;
};

type SavedCard = { _id: string; lastFour: string; brand: string };

export function EventSetupDepositCheckout() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<SetupDepositState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [useNewCard, setUseNewCard] = useState(true);
  const [cardForm, setCardForm] = useState<CardFormValues>(INITIAL_CARD_FORM);
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormValues, string>>>({});

  const load = useCallback(async () => {
    if (!eventId) {
      setError(t('creator.deposit.invalidLink'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [deposit, cards] = await Promise.all([
        events.getSetupDeposit(eventId),
        profile.cards.list().catch(() => [] as SavedCard[]),
      ]);
      setData(deposit);
      setSavedCards(cards);
      if (cards.length > 0) {
        setSelectedCardId(cards[0]._id);
        setUseNewCard(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('creator.deposit.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePay = async () => {
    if (!eventId || !data?.setupDeposit) return;
    setPaying(true);
    try {
      const { paymentCardId } = await resolveFoodCardPayment({
        useNewCard,
        selectedCardId,
        savedCards,
        form: cardForm,
        t,
      });
      await events.paySetupDeposit(eventId, { paymentMethod: 'card', paymentCardId });
      toast.success(t('creator.deposit.paySuccess'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.deposit.payFailed'));
    } finally {
      setPaying(false);
    }
  };

  const wrap = (children: React.ReactNode) => (
    <div className="admin-dashboard mx-auto max-w-2xl space-y-6">{children}</div>
  );

  if (loading) {
    return wrap(
      <div className="admin-panel lg-card flex items-center justify-center gap-3 p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t('creator.deposit.loading')}
      </div>,
    );
  }

  if (error || !data) {
    return wrap(
      <div className="admin-panel lg-card p-10 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <p className="mb-4 text-muted-foreground">{error ?? t('creator.deposit.notFound')}</p>
        <Button asChild variant="outline">
          <Link to="/creator?tab=events">{t('creator.deposit.backToEvents')}</Link>
        </Button>
      </div>,
    );
  }

  const deposit = data.setupDeposit;
  const subtotal = deposit?.subtotalEgp ?? 0;
  const feePercent = deposit?.platformFeePercent ?? 10;
  const fee = deposit?.platformFeeEgp ?? 0;
  const total = deposit?.totalEgp ?? 0;

  if (data.Status === 'Pending') {
    return wrap(
      <StatusCard
        icon={<Clock className="h-12 w-12 text-amber-500" />}
        title={t('creator.deposit.pendingTitle')}
        body={t('creator.deposit.pendingBody', { name: data.Name })}
        action={
          <Button asChild variant="outline">
            <Link to="/creator?tab=events">{t('creator.deposit.backToEvents')}</Link>
          </Button>
        }
      />,
    );
  }

  if (data.Status === 'Rejected') {
    return wrap(
      <StatusCard
        icon={<XCircle className="h-12 w-12 text-destructive" />}
        title={t('creator.deposit.rejectedTitle')}
        body={t('creator.deposit.rejectedBody', { name: data.Name })}
        action={
          <Button asChild variant="outline">
            <Link to="/creator?tab=create">{t('creator.deposit.createAnother')}</Link>
          </Button>
        }
      />,
    );
  }

  if (data.Status === 'Active' && deposit?.paymentStatus === 'paid') {
    return wrap(
      <StatusCard
        icon={<CheckCircle className="h-12 w-12 text-primary" />}
        title={t('creator.deposit.paidTitle')}
        body={t('creator.deposit.paidBody', { name: data.Name })}
        action={
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild className="bg-gradient-to-r from-primary to-secondary">
              <Link to={`/event/${data._id}`}>{t('creator.deposit.viewEvent')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/creator?tab=events">{t('creator.deposit.backToEvents')}</Link>
            </Button>
          </div>
        }
      />,
    );
  }

  if (data.Status !== 'AwaitingDeposit') {
    return wrap(
      <StatusCard
        icon={<AlertCircle className="h-12 w-12 text-muted-foreground" />}
        title={t('creator.deposit.unavailableTitle')}
        body={t('creator.deposit.unavailableBody')}
        action={
          <Button asChild variant="outline">
            <Link to="/creator?tab=events">{t('creator.deposit.backToEvents')}</Link>
          </Button>
        }
      />,
    );
  }

  return wrap(
    <div
      className="relative overflow-hidden rounded-[2rem] border"
      style={{
        background: 'rgba(8,9,18,0.62)',
        backdropFilter: 'blur(18px) saturate(1.7)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
        borderColor: 'var(--lg-border-strong)',
        boxShadow: 'var(--lg-shadow)',
      }}
    >
      <div
        className="p-7"
        style={{
          background:
            'radial-gradient(500px 200px at 0% 0%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(500px 200px at 100% 100%, rgba(59,130,246,0.18), transparent 60%)',
          borderBottom: '1px solid var(--lg-border)',
        }}
      >
        <Pill tone="electric" leadingIcon={<ShieldCheck className="h-3.5 w-3.5" />}>
          {t('creator.deposit.pill')}
        </Pill>
        <h1 className="display-3 mt-4 flex items-center gap-3 text-balance">
          <CreditCard className="h-7 w-7 text-[#c084fc]" />
          {t('creator.deposit.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">{data.Name}</p>
      </div>

      <div className="space-y-6 p-7">
        <p className="text-sm text-muted-foreground">{t('creator.deposit.intro')}</p>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t('creator.deposit.lineSubtotal')}</span>
            <span className="font-medium tabular-nums">{formatEgp(subtotal)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {t('creator.deposit.linePlatformFee', { percent: feePercent })}
            </span>
            <span className="font-medium tabular-nums">{formatEgp(fee)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2 text-base">
            <span className="font-semibold">{t('creator.deposit.lineTotal')}</span>
            <span className="font-bold text-primary tabular-nums">{formatEgp(total)}</span>
          </div>
        </div>

        <CreditCardCheckoutForm
          savedCards={savedCards}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          values={cardForm}
          onValuesChange={setCardForm}
          useNewCard={useNewCard}
          onUseNewCardChange={setUseNewCard}
          disabled={paying}
          processing={paying}
          errors={cardErrors}
          onBlurValidate={() => setCardErrors(validateCardForm(cardForm, t))}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-gradient-to-r from-primary to-secondary gap-2"
            disabled={paying}
            onClick={handlePay}
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {paying ? t('creator.deposit.paying') : t('creator.deposit.payButton', { total: formatEgp(total) })}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/creator?tab=events">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('creator.deposit.backToEvents')}
            </Link>
          </Button>
        </div>
      </div>
    </div>,
  );
}

function StatusCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="admin-panel lg-card p-10 text-center space-y-4">
      <div className="flex justify-center">{icon}</div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground max-w-md mx-auto">{body}</p>
      {action}
    </div>
  );
}
