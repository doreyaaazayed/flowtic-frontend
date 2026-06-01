import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';
import { BrandLogo } from './PaymentMethodCard';
import {
  formatCardNumberDisplay,
  formatExpiryInput,
  normalizeCardDigits,
  validateCardForm,
  type CardFormValues,
} from '../../lib/cardValidation';

type SavedCard = { _id: string; lastFour: string; brand: string };

type Props = {
  savedCards: SavedCard[];
  selectedCardId: string;
  onSelectCard: (id: string) => void;
  values: CardFormValues;
  onValuesChange: (values: CardFormValues) => void;
  useNewCard: boolean;
  onUseNewCardChange: (useNew: boolean) => void;
  disabled?: boolean;
  processing?: boolean;
  errors?: Partial<Record<keyof CardFormValues, string>>;
  onBlurValidate?: () => void;
};

export function CreditCardCheckoutForm({
  savedCards,
  selectedCardId,
  onSelectCard,
  values,
  onValuesChange,
  useNewCard,
  onUseNewCardChange,
  disabled,
  processing,
  errors = {},
  onBlurValidate,
}: Props) {
  const { t } = useTranslation();
  const digits = useMemo(() => normalizeCardDigits(values.cardNumber), [values.cardNumber]);

  const setField = <K extends keyof CardFormValues>(key: K, value: CardFormValues[K]) => {
    onValuesChange({ ...values, [key]: value });
  };

  const blur = () => onBlurValidate?.();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-background/40 p-3">
        <span className="text-xs font-medium text-muted-foreground">
          {t('foodOrder.acceptedCards')}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white/90 ring-1 ring-border">
            <BrandLogo brand="visa" />
          </div>
          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-white/90 ring-1 ring-border">
            <BrandLogo brand="mastercard" />
          </div>
          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-muted/80 ring-1 ring-border">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {savedCards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || processing}
            onClick={() => onUseNewCardChange(false)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              !useNewCard
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            {t('foodOrder.useSavedCard')}
          </button>
          <button
            type="button"
            disabled={disabled || processing}
            onClick={() => {
              onUseNewCardChange(true);
              onSelectCard('');
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              useNewCard
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            {t('foodOrder.useNewCard')}
          </button>
        </div>
      )}

      {!useNewCard && savedCards.length > 0 ? (
        <div className="space-y-3">
          <Label>{t('foodOrder.selectCard')}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {savedCards.map((c) => (
              <button
                key={c._id}
                type="button"
                disabled={disabled || processing}
                onClick={() => onSelectCard(c._id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-start transition',
                  selectedCardId === c._id
                    ? 'border-primary/70 bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <BrandLogo brand={c.brand} />
                <span className="text-sm font-medium">•••• {c.lastFour}</span>
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="food-cvv-saved">{t('foodOrder.cvv')}</Label>
            <Input
              id="food-cvv-saved"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              placeholder="•••"
              disabled={disabled || processing}
              value={values.cvv}
              onChange={(e) => setField('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
              onBlur={blur}
              className={cn(errors.cvv && 'border-destructive')}
            />
            {errors.cvv && <p className="mt-1 text-xs text-destructive">{errors.cvv}</p>}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="food-card-holder">{t('foodOrder.cardHolder')}</Label>
            <Input
              id="food-card-holder"
              autoComplete="cc-name"
              disabled={disabled || processing}
              value={values.cardholderName}
              onChange={(e) => setField('cardholderName', e.target.value)}
              onBlur={blur}
              className={cn(errors.cardholderName && 'border-destructive')}
            />
            {errors.cardholderName && (
              <p className="mt-1 text-xs text-destructive">{errors.cardholderName}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="food-card-number">{t('foodOrder.cardNumber')}</Label>
            <Input
              id="food-card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              disabled={disabled || processing}
              value={formatCardNumberDisplay(values.cardNumber)}
              onChange={(e) => setField('cardNumber', normalizeCardDigits(e.target.value))}
              onBlur={blur}
              placeholder="4242 4242 4242 4242"
              className={cn(errors.cardNumber && 'border-destructive')}
            />
            {errors.cardNumber && (
              <p className="mt-1 text-xs text-destructive">{errors.cardNumber}</p>
            )}
          </div>
          <div>
            <Label htmlFor="food-card-expiry">{t('foodOrder.expiry')}</Label>
            <Input
              id="food-card-expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              disabled={disabled || processing}
              value={values.expiry}
              onChange={(e) => setField('expiry', formatExpiryInput(e.target.value))}
              onBlur={blur}
              placeholder="MM / YY"
              maxLength={7}
              className={cn(errors.expiry && 'border-destructive')}
            />
            {errors.expiry && <p className="mt-1 text-xs text-destructive">{errors.expiry}</p>}
          </div>
          <div>
            <Label htmlFor="food-card-cvv">{t('foodOrder.cvv')}</Label>
            <Input
              id="food-card-cvv"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              disabled={disabled || processing}
              value={values.cvv}
              onChange={(e) => setField('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
              onBlur={blur}
              placeholder="•••"
              className={cn(errors.cvv && 'border-destructive')}
            />
            {errors.cvv && <p className="mt-1 text-xs text-destructive">{errors.cvv}</p>}
          </div>
        </motion.div>
      )}

      {processing && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('foodOrder.processingPayment')}
        </p>
      )}
    </div>
  );
}

export type { CardFormValues };
