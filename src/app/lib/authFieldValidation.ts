/** Practical email check for sign-in / sign-up (not full RFC). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  const v = email.trim();
  if (!v || v.length > 254) return false;
  return EMAIL_RE.test(v);
}

/** Egyptian mobile: exactly 11 digits, must start with 01. */
export function isValidEgyptPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return /^01\d{9}$/.test(digits);
}

/** Strip non-digits and cap at 11 characters while typing. */
export function formatPhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

export function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** At least 8 characters with both letters and numbers. */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

/** Empty is valid; otherwise must be 11-digit Egyptian mobile. */
export function isValidOptionalEgyptPhone(phone: string): boolean {
  const digits = phoneDigitsOnly(phone);
  return !digits || isValidEgyptPhone(digits);
}
