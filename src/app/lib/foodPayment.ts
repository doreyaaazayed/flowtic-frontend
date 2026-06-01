import { profile } from './api';
import type { FoodPaymentBrand } from './api';
import {
  brandToFoodPaymentBrand,
  normalizeCardDigits,
  parseExpiryCombined,
  validateCardForm,
  validateCheckoutCardInput,
  type CardFormValues,
} from './cardValidation';

type SavedCard = { _id: string; brand: string };

/**
 * Resolves payment card for food checkout using the existing profile.cards API.
 * CVV is validated client-side only (not sent to backend — same as wallet flow).
 */
export async function resolveFoodCardPayment(params: {
  useNewCard: boolean;
  selectedCardId: string;
  savedCards: SavedCard[];
  form: CardFormValues;
  t: (key: string) => string;
}): Promise<{ paymentCardId: string; paymentBrand: FoodPaymentBrand }> {
  const { useNewCard, selectedCardId, savedCards, form, t } = params;
  const check = validateCheckoutCardInput(useNewCard, selectedCardId, form, t);
  if (!check.ok) throw new Error(check.message);

  if (!useNewCard && selectedCardId) {
    const card = savedCards.find((c) => c._id === selectedCardId);
    if (!card) throw new Error(t('foodOrder.selectCard'));
    return {
      paymentCardId: selectedCardId,
      paymentBrand: brandToFoodPaymentBrand(card.brand),
    };
  }

  const fieldErrors = validateCardForm(form, t);
  const firstErr = Object.values(fieldErrors)[0];
  if (firstErr) throw new Error(firstErr);

  const digits = normalizeCardDigits(form.cardNumber);
  const parsed = parseExpiryCombined(form.expiry);
  if (!parsed) throw new Error(t('foodOrder.expiryInvalid'));

  const created = await profile.cards.add({
    cardNumber: digits,
    expiryMonth: parsed.month,
    expiryYear: parsed.year,
    cardholderName: form.cardholderName.trim(),
  });

  return {
    paymentCardId: created._id,
    paymentBrand: brandToFoodPaymentBrand(created.brand),
  };
}
