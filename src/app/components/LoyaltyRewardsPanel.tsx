import { useCallback, useEffect, useState } from 'react';
import { Gift, Sparkles, Ticket, Clock, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { loyalty, type LoyaltySummary } from '../lib/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-700/80 to-amber-900/80',
  silver: 'from-slate-400/80 to-slate-600/80',
  gold: 'from-yellow-500/80 to-amber-600/80',
  platinum: 'from-violet-400/80 to-indigo-600/80',
};

export function LoyaltyRewardsPanel() {
  const { t } = useTranslation();
  const [data, setData] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loyalty.me());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('loyalty.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRedeem = async (optionId: string) => {
    setRedeeming(optionId);
    try {
      const res = await loyalty.redeem(optionId);
      toast.success(t('loyalty.redeemSuccess', { code: res.promoCode }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('loyalty.redeemError'));
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="cosmic-panel p-8 text-center text-muted-foreground">
        {t('loyalty.loading')}
      </div>
    );
  }

  if (!data) return null;

  const tierGradient = TIER_COLORS[data.tierId] || TIER_COLORS.bronze;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border border-white/10 bg-gradient-to-br ${tierGradient} p-6 text-white shadow-lg`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">
              {t('loyalty.yourTier')}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Crown className="h-6 w-6" />
              {data.tierName}
            </h2>
            <p className="mt-2 text-sm text-white/85">
              {t('loyalty.balance', { count: data.balance })}
            </p>
            <p className="text-xs text-white/70">
              {t('loyalty.lifetime', { count: data.lifetimePoints })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{data.balance}</p>
            <p className="text-xs text-white/70">{t('loyalty.pointsLabel')}</p>
          </div>
        </div>
        {data.nextTier && (
          <p className="mt-4 text-xs text-white/80">
            {t('loyalty.nextTier', {
              name: data.nextTier.name,
              points: data.nextTier.pointsNeeded,
            })}
          </p>
        )}
      </div>

      <div className="cosmic-panel p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('loyalty.perksTitle')}
        </h3>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <Badge variant="outline">{data.earnMultiplier}x</Badge>
            {t('loyalty.perkEarn')}
          </li>
          {data.earlyAccessHours > 0 && (
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t('loyalty.perkEarlyAccess', { hours: data.earlyAccessHours })}
            </li>
          )}
          {data.ticketUpgrade && (
            <li className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              {t('loyalty.perkUpgrade')}
            </li>
          )}
          {data.prioritySupport && (
            <li className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              {t('loyalty.perkPriority')}
            </li>
          )}
        </ul>
      </div>

      <div className="cosmic-panel p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Gift className="h-4 w-4 text-primary" />
          {t('loyalty.redeemTitle')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.redeemOptions.map((opt) => (
            <div
              key={opt.id}
              className="flex flex-col justify-between rounded-xl border border-border p-4"
            >
              <div>
                <p className="font-medium">{opt.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('loyalty.costPoints', { count: opt.pointsCost })}
                </p>
              </div>
              <Button
                size="sm"
                className="mt-3 w-full"
                disabled={data.balance < opt.pointsCost || redeeming === opt.id}
                onClick={() => handleRedeem(opt.id)}
              >
                {redeeming === opt.id ? t('loyalty.redeeming') : t('loyalty.redeem')}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {data.activePromoCodes.length > 0 && (
        <div className="cosmic-panel p-6">
          <h3 className="mb-3 font-semibold">{t('loyalty.activePromos')}</h3>
          <ul className="space-y-2">
            {data.activePromoCodes.map((p) => (
              <li
                key={p.code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-sm"
              >
                <span>{p.code}</span>
                <span className="text-xs text-muted-foreground">
                  {p.discountType === 'percent'
                    ? `${p.discountValue}% ${t('loyalty.off')}`
                    : `${p.discountValue} EGP ${t('loyalty.off')}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t('loyalty.promoHint')}</p>
        </div>
      )}

      {data.recentTransactions.length > 0 && (
        <div className="cosmic-panel p-6">
          <h3 className="mb-3 font-semibold">{t('loyalty.history')}</h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {data.recentTransactions.map((tx, i) => (
              <li key={i} className="flex justify-between border-b border-border/50 py-1">
                <span className="text-muted-foreground">
                  {tx.description || tx.type}
                </span>
                <span className={tx.points >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {tx.points >= 0 ? '+' : ''}
                  {tx.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
