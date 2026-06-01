import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRtl } from '../../i18n';

/**
 * Mirrors the active i18next language onto the document root.
 * - <html lang="..."> for screen readers + SEO.
 * - <html dir="rtl|ltr"> so CSS logical / Tailwind rtl: variants work everywhere.
 * - <html.lg-rtl> class for any RTL-specific CSS hooks we add in liquid-glass.css.
 *
 * Mount once near the top of the app tree.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const apply = (lng: string) => {
      const root = document.documentElement;
      const rtl = isRtl(lng);
      root.setAttribute('lang', lng);
      root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      root.classList.toggle('lg-rtl', rtl);
    };
    apply(i18n.language || 'en');
    const handler = (lng: string) => apply(lng);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, [i18n]);

  return <>{children}</>;
}
