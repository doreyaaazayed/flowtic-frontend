import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDollarSign, Crown, ScanFace } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resale as resaleApi, type FeaturedResaleListing } from '../../lib/api';
import { Pill } from '../../liquid';
import { cn } from '../ui/utils';

export type ResaleSpotlightMode = 'nearest' | 'best';

const MODE_STORAGE_KEY = 'flowtic_landing_resale_mode';

function readStoredMode(): ResaleSpotlightMode {
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    return v === 'best' ? 'best' : 'nearest';
  } catch {
    return 'nearest';
  }
}

function isVipCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  return /vip|platinum|premium|gold/i.test(name);
}

function formatEgp(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `EGP ${Number(n).toFixed(0)}`;
}

type LandingResaleSpotlightProps = {
  className?: string;
};

export function LandingResaleSpotlight({ className }: LandingResaleSpotlightProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ResaleSpotlightMode>(readStoredMode);
  const [listing, setListing] = useState<FeaturedResaleListing | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((nextMode: ResaleSpotlightMode) => {
    setLoading(true);
    resaleApi
      .featured(nextMode)
      .then((res) => setListing(res.listing))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(mode);
  }, [mode, load]);

  const setModeAndPersist = (next: ResaleSpotlightMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const subtitle =
    listing?.seatLabel ||
    (listing?.categoryName
      ? t('landing.resale.spotlight.categoryOnly', { category: listing.categoryName })
      : t('landing.resale.spotlight.ticketFallback'));

  const watchers =
    listing != null
      ? t('landing.resale.spotlight.watchers', {
          count: Math.max(1, (listing.interestCount ?? 0) + 1),
        })
      : t('landing.resale.demo.watchers');

  const buyHref = listing ? `/white-market?listing=${listing._id}` : '/white-market';

  return (
    <div className={cn('relative', className)}>
      <div
        className="mb-3 flex flex-wrap items-center justify-end gap-2"
        role="group"
        aria-label={t('landing.resale.spotlight.modeLabel')}
      >
        {(['nearest', 'best'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setModeAndPersist(key)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
              mode === key
                ? 'bg-primary/25 text-foreground border border-primary/40'
                : 'bg-muted/30 text-muted-foreground border border-border hover:text-foreground',
            )}
          >
            {t(`landing.resale.spotlight.modes.${key}`)}
          </button>
        ))}
      </div>

      <div className="lg-card lg-card--luxe relative z-10 overflow-hidden p-6 lg-float">
        {loading ? (
          <div className="animate-pulse space-y-4" aria-busy="true">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-7 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="mt-6 flex justify-between">
              <div className="h-10 w-20 rounded bg-muted" />
              <div className="h-12 w-24 rounded bg-muted" />
            </div>
            <div className="h-11 w-full rounded-xl bg-muted" />
          </div>
        ) : listing ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t('landing.resale.demo.available')}
              </span>
              <div className="flex items-center gap-2">
                {listing.savingsPercent != null && listing.savingsPercent > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    {t('landing.resale.spotlight.saveBadge', { percent: listing.savingsPercent })}
                  </span>
                )}
                {listing.categoryName && (
                  <Pill tone={isVipCategory(listing.categoryName) ? 'gold' : 'electric'}>
                    {isVipCategory(listing.categoryName) ? (
                      <Crown className="h-3 w-3" />
                    ) : null}{' '}
                    {listing.categoryName}
                  </Pill>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold tracking-[-0.01em]">
              {listing.eventId?.Name ?? t('landing.resale.spotlight.eventFallback')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            {listing.eventId?.StartDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(listing.eventId.StartDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('landing.resale.demo.original')}
                </p>
                <p className="text-sm line-through opacity-60">
                  {formatEgp(listing.originalPurchasePrice ?? listing.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('landing.resale.demo.resale')}
                </p>
                <p className="text-3xl font-extrabold leading-none tracking-[-0.02em] text-gold">
                  {formatEgp(listing.price)}
                </p>
              </div>
            </div>
            <Link to={buyHref} className="lg-btn lg-btn--gold mt-6 flex w-full items-center justify-center gap-2">
              <CircleDollarSign className="h-4 w-4" />
              {t('landing.resale.demo.buy')}
            </Link>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm font-medium text-foreground">{t('landing.resale.spotlight.emptyTitle')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('landing.resale.spotlight.emptyHint')}</p>
            <Link to="/white-market" className="lg-btn mt-5 inline-flex text-sm">
              {t('landing.resale.browse')}
            </Link>
          </div>
        )}
      </div>

      <div
        className="lg-card absolute -bottom-6 -right-4 z-0 w-3/4 p-5 lg-float"
        style={{ animationDelay: '-3s' }}
      >
        <Pill tone="electric">
          <ScanFace className="h-3 w-3" /> {t('landing.resale.demo.faceLinked')}
        </Pill>
        <p className="mt-3 text-sm font-semibold">{watchers}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('landing.resale.demo.verify')}</p>
      </div>
    </div>
  );
}
