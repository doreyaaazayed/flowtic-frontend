import { motion } from 'motion/react';
import { Armchair, Crown, Package, Rocket, Store, Truck, Check } from 'lucide-react';
import type { DeliveryMethod } from '../../lib/api';
import { cn } from '../ui/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  store: Store,
  armchair: Armchair,
  crown: Crown,
  rocket: Rocket,
  truck: Truck,
};

const TIER_BADGE: Record<NonNullable<DeliveryMethod['tier']>, string> = {
  pickup: 'Standard',
  standard: 'Standard',
  premium: 'VIP',
  express: 'Express',
};

const TIER_COLORS: Record<NonNullable<DeliveryMethod['tier']>, string> = {
  pickup: 'from-slate-500/15 to-slate-700/5',
  standard: 'from-primary/15 to-primary/5',
  premium: 'from-amber-400/20 to-amber-600/10',
  express: 'from-rose-500/20 to-fuchsia-500/10',
};

type Props = {
  method: DeliveryMethod;
  selected: boolean;
  onSelect: () => void;
  currency?: string;
};

export function DeliveryMethodCard({ method, selected, onSelect, currency = 'EGP' }: Props) {
  const Icon = ICON_MAP[method.icon || ''] ?? Truck;
  const tier = method.tier ?? 'standard';
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-card/40 p-4 text-start backdrop-blur-md transition-all',
        selected
          ? 'border-primary/70 shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_30px_60px_-30px_rgba(99,102,241,0.45)]'
          : 'border-border hover:border-primary/40',
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', TIER_COLORS[tier])} />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border bg-background/80 ring-1',
            selected ? 'border-primary/60 ring-primary/30' : 'border-border ring-border',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-tight">{method.name}</p>
            <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {TIER_BADGE[tier]}
            </span>
          </div>
          {method.description && (
            <p className="mt-1 text-xs text-muted-foreground">{method.description}</p>
          )}
          <div className="mt-2 flex items-baseline gap-2 text-xs">
            <span className="text-muted-foreground">≈ {method.estimatedDeliveryMinutes} min</span>
            <span className="font-bold text-foreground">
              {method.price === 0 ? 'Free' : `+${currency} ${method.price.toFixed(0)}`}
            </span>
          </div>
        </div>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" />
          </motion.span>
        )}
      </div>
    </motion.button>
  );
}
