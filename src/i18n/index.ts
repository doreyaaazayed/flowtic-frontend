import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';

/**
 * FlowTic i18n bootstrap.
 * - English + Arabic out of the box.
 * - Language persisted in localStorage under `flowtic-lang`.
 * - HTML `lang` + `dir` attributes are synced by the LanguageProvider
 *   in `app/i18n/LanguageProvider.tsx`.
 *
 * Adding a new language:
 *   1. Drop a JSON file in `src/i18n/locales/<code>.json`.
 *   2. Import it here and add it to `resources`.
 *   3. If it's an RTL script, add the code to `RTL_LANGS`.
 */
export const SUPPORTED_LANGS = ['en', 'ar'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const RTL_LANGS: ReadonlySet<Lang> = new Set(['ar']);

export const LANG_LABELS: Record<Lang, { native: string; short: string }> = {
  en: { native: 'English', short: 'EN' },
  ar: { native: 'العربية', short: 'AR' },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'flowtic-lang',
    },
    returnNull: false,
  });

export default i18n;

export const isRtl = (lang: string): boolean => RTL_LANGS.has(lang as Lang);
