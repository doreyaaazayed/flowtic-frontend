import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANG_LABELS, SUPPORTED_LANGS, type Lang } from '../../i18n';

/**
 * Compact EN / AR pill that lives next to the theme toggle in the navbar.
 * Tap → cycles to the next supported language and lets LanguageProvider
 * apply lang/dir on <html>.
 */
export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = (SUPPORTED_LANGS.includes(i18n.language as Lang)
    ? i18n.language
    : 'en') as Lang;
  const nextIndex = (SUPPORTED_LANGS.indexOf(current) + 1) % SUPPORTED_LANGS.length;
  const next = SUPPORTED_LANGS[nextIndex];

  const onClick = useCallback(() => {
    void i18n.changeLanguage(next);
  }, [i18n, next]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${t('lang.switch')} (${LANG_LABELS[next].native})`}
      title={`${t('lang.switch')} → ${LANG_LABELS[next].native}`}
      className="lg-lang-toggle group relative inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground transition-all hover:-translate-y-0.5"
      style={{
        borderColor: 'var(--lg-border-strong)',
        background: 'var(--lg-surface)',
      }}
    >
      <Languages className="h-3.5 w-3.5 opacity-70" strokeWidth={2.2} />
      <span className="relative inline-flex items-center">
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-[-2px] rounded-full transition-all duration-300 ${
            current === 'en' ? 'start-0' : 'start-[50%]'
          }`}
          style={{
            width: 'calc(50% + 4px)',
            background:
              'linear-gradient(135deg, rgba(168,85,247,0.55), rgba(59,130,246,0.45))',
            boxShadow:
              '0 1px 0 0 rgba(255,255,255,0.4) inset, 0 8px 22px -8px rgba(168,85,247,0.5)',
          }}
        />
        <span
          className={`relative z-[1] inline-flex h-5 w-8 items-center justify-center transition-colors ${
            current === 'en' ? 'text-white' : 'text-muted-foreground'
          }`}
        >
          EN
        </span>
        <span
          className={`relative z-[1] inline-flex h-5 w-8 items-center justify-center transition-colors ${
            current === 'ar' ? 'text-white' : 'text-muted-foreground'
          }`}
        >
          AR
        </span>
      </span>
    </button>
  );
}
