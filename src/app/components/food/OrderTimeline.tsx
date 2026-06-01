import { motion } from 'motion/react';
import {
  CheckCircle2,
  Circle,
  ChefHat,
  Package,
  Clock,
  ClipboardList,
  Truck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../ui/utils';
import {
  FOOD_ORDER_TIMELINE_STEPS,
  foodOrderStatusIndex,
  foodOrderStatusLabel,
} from '../../lib/foodOrderStatus';

type Props = {
  status: string;
  compact?: boolean;
  estimatedReadyAt?: string | null;
  estimatedDeliveryMinutes?: number;
};

const STEP_ICONS = [ClipboardList, CheckCircle2, ChefHat, Package, Truck];

export function OrderTimeline({
  status,
  compact = false,
  estimatedReadyAt,
  estimatedDeliveryMinutes,
}: Props) {
  const { t } = useTranslation();
  const activeIdx = foodOrderStatusIndex(status);
  const isCancelled = status === 'Cancelled';

  if (isCancelled) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {t('foodOrder.statusCancelled')}
      </motion.p>
    );
  }

  return (
    <div className={cn(compact && 'scale-[0.92] origin-top-start')}>
      <ol className="space-y-0">
        {FOOD_ORDER_TIMELINE_STEPS.map((step, i) => {
          const done =
            i < activeIdx || (status === 'Completed' && i <= activeIdx);
          const current = i === activeIdx && status !== 'Completed';
          const Icon = STEP_ICONS[i] ?? Circle;
          const label = foodOrderStatusLabel(step, t);

          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <motion.span
                  layout
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                    done || current
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground',
                    current && 'ring-2 ring-primary/50 shadow-[0_0_20px_-4px_rgba(99,102,241,0.5)]',
                  )}
                  animate={
                    current
                      ? { scale: [1, 1.06, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    current
                      ? { repeat: Infinity, duration: 2, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                >
                  <Icon className="h-4 w-4" />
                  {current && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-primary/40"
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                    />
                  )}
                </motion.span>
                {i < FOOD_ORDER_TIMELINE_STEPS.length - 1 && (
                  <span
                    className={cn(
                      'my-1 w-0.5 flex-1 min-h-[2rem] transition-colors',
                      i < activeIdx ? 'bg-primary/60' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className={cn('pb-6 pt-1', compact && 'pb-4')}>
                <p
                  className={cn(
                    'font-medium transition-colors',
                    done || current ? 'text-foreground' : 'text-muted-foreground',
                    current && 'text-primary',
                  )}
                >
                  {label}
                </p>
                {current && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Clock className="h-3 w-3" />
                    {step === 'Pending'
                      ? t('foodOrder.pending')
                      : t('foodOrder.statusInProgress')}
                  </motion.p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {(estimatedReadyAt || estimatedDeliveryMinutes) && status !== 'Completed' && status !== 'Cancelled' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
        >
          <Clock className="h-3.5 w-3.5 text-primary" />
          {estimatedReadyAt ? (
            <>
              {t('foodOrder.estimatedReady')}:{' '}
              <span className="font-medium text-foreground">
                {new Date(estimatedReadyAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </>
          ) : (
            t('foodOrder.eta', { count: estimatedDeliveryMinutes ?? 0 })
          )}
        </motion.p>
      )}
    </div>
  );
}
