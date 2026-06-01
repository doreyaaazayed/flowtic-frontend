import type { FoodPaymentBrand } from './api';

export type CardFormValues = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

export type CardFormErrors = Partial<Record<keyof CardFormValues, string>>;

export function normalizeCardDigits(input: string): string {
  return input.replace(/\D/g, '');
}

export function formatCardNumberDisplay(digits: string): string {
  const d = normalizeCardDigits(digits).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiryInput(v: string): string {
  const digits = v.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)}`;
}

export function parseExpiryCombined(combined: string): { month: number; year: number } | null {
  const digits = combined.replace(/\D/g, '');
  if (digits.length < 4) return null;
  const month = Number(digits.slice(0, 2));
  let year = Number(digits.slice(2, 4));
  if (!month || month < 1 || month > 12) return null;
  if (year < 100) year += 2000;
  if (year < 2000 || year > 2100) return null;
  return { month, year };
}

export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(digits: string): FoodPaymentBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return 'other';
}

export function validateCardForm(
  values: CardFormValues,
  t: (key: string) => string,
): CardFormErrors {
  const errors: CardFormErrors = {};
  if (!values.cardholderName.trim()) {
    errors.cardholderName = t('foodOrder.cardHolderRequired');
  }
  const digits = normalizeCardDigits(values.cardNumber);
  if (digits.length < 13 || digits.length > 19) {
    errors.cardNumber = t('foodOrder.cardNumberInvalid');
  } else if (!luhnValid(digits)) {
    errors.cardNumber = t('foodOrder.cardNumberInvalid');
  }
  const exp = parseExpiryCombined(values.expiry);
  if (!exp) {
    errors.expiry = t('foodOrder.expiryInvalid');
  } else {
    const expiry = new Date(exp.year, exp.month, 0, 23, 59, 59, 999);
    if (expiry < new Date()) errors.expiry = t('foodOrder.expiryInvalid');
  }
  const cvv = values.cvv.replace(/\D/g, '');
  if (cvv.length < 3 || cvv.length > 4) {
    errors.cvv = t('foodOrder.cvvInvalid');
  }
  return errors;
}

export function brandToFoodPaymentBrand(brand: string): FoodPaymentBrand {
  const b = brand.toLowerCase();
  if (b === 'visa') return 'visa';
  if (b === 'mastercard') return 'mastercard';
  if (b === 'amex') return 'amex';
  return 'other';
}

/** Orders editable only before kitchen starts preparing. */
export const FOOD_EDITABLE_STATUSES = new Set(['Pending', 'Confirmed']);

export function isFoodOrderEditable(status: string): boolean {
  return FOOD_EDITABLE_STATUSES.has(status);
}

export function validateCheckoutCardInput(
  useNewCard: boolean,
  selectedCardId: string,
  values: CardFormValues,
  t: (key: string) => string,
): { ok: true } | { ok: false; message: string } {
  if (!useNewCard && selectedCardId) {
    const cvv = values.cvv.replace(/\D/g, '');
    if (cvv.length < 3 || cvv.length > 4) {
      return { ok: false, message: t('foodOrder.cvvInvalid') };
    }
    return { ok: true };
  }
  const errors = validateCardForm(values, t);
  const first = Object.values(errors)[0];
  if (first) return { ok: false, message: first };
  if (!parseExpiryCombined(values.expiry)) {
    return { ok: false, message: t('foodOrder.expiryInvalid') };
  }
  return { ok: true };
}
