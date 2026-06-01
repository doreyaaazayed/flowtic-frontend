import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Wifi,
  WifiOff,
  Github,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { healthCheck } from '../lib/api';

const cols = [
  {
    titleKey: 'footer.cols.discover',
    items: [
      { labelKey: 'footer.links.allEvents', to: '/events' },
      { labelKey: 'footer.links.concerts', to: '/events' },
      { labelKey: 'footer.links.sports', to: '/events' },
      { labelKey: 'footer.links.conferences', to: '/events' },
      { labelKey: 'footer.links.festivals', to: '/events' },
    ],
  },
  {
    titleKey: 'footer.cols.marketplace',
    items: [
      { labelKey: 'footer.links.whiteMarket', to: '/white-market' },
      { labelKey: 'footer.links.faceId', to: '/face-id-registration' },
    ],
  },
  {
    titleKey: 'footer.cols.account',
    items: [
      { labelKey: 'footer.links.signIn', to: '/signin' },
      { labelKey: 'footer.links.signUp', to: '/signup' },
      { labelKey: 'footer.links.dashboard', to: '/dashboard' },
      { labelKey: 'footer.links.forgotPassword', to: '/forgot-password' },
    ],
  },
];

const socials = [
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Twitter, label: 'Twitter' },
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Linkedin, label: 'LinkedIn' },
  { Icon: Github, label: 'GitHub' },
];

export function Footer({ className }: { className?: string }) {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await healthCheck();
      if (!cancelled) setApiConnected(ok);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className={`relative z-[1] mt-32 ${className ?? ''}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[2.5rem] border px-6 py-12 sm:px-10 lg:px-14"
          style={{
            background: 'rgba(8, 10, 24, 0.55)',
            backdropFilter: 'blur(18px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
            borderColor: 'var(--lg-border-strong)',
            boxShadow: 'var(--lg-shadow)',
          }}
        >
          {/* Aurora wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(700px 280px at 20% 0%, rgba(139,92,246,0.22), transparent 70%), radial-gradient(600px 240px at 100% 100%, rgba(6,182,212,0.18), transparent 70%)',
            }}
          />

          <div className="relative grid grid-cols-2 gap-10 md:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 35%, #06b6d4 100%)',
                    boxShadow:
                      '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 8px 22px -6px rgba(139,92,246,0.55)',
                  }}
                >
                  <Sparkles className="h-6 w-6 text-white" strokeWidth={2.4} />
                </span>
                <div className="flex flex-col">
                  <span
                    className="text-lg font-bold leading-none tracking-[-0.01em]"
                    style={{
                      background: 'var(--grad-text)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {t('brand.name')}
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {t('footer.tagline')}
                  </span>
                </div>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t('footer.blurb')}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map(({ Icon, label }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground"
                    style={{
                      borderColor: 'var(--lg-border)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {cols.map((col) => (
              <div key={col.titleKey}>
                <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t(col.titleKey)}
                </h4>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.labelKey}>
                      <Link
                        to={item.to}
                        className="text-sm text-foreground/85 transition-colors hover:text-foreground"
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="divider-aurora my-10" />

          <div className="relative flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              {t('footer.copyright')}
            </p>
            {apiConnected !== null && (
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium"
                style={{
                  borderColor: apiConnected ? 'rgba(52,211,153,0.4)' : 'rgba(244,63,94,0.4)',
                  background: apiConnected
                    ? 'rgba(52,211,153,0.08)'
                    : 'rgba(244,63,94,0.08)',
                  color: apiConnected ? '#34d399' : '#fb7185',
                }}
              >
                {apiConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {apiConnected ? t('footer.apiLive') : t('footer.apiOffline')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="h-10" />
    </footer>
  );
}
