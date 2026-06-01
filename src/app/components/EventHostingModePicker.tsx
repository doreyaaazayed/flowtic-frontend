import { useTranslation } from 'react-i18next';
import { Ticket, Package, Building2, Layers } from 'lucide-react';
import type { EventHostingMode } from '../lib/eventHosting';
import { cn } from './ui/utils';

const MODES: Array<{
  id: EventHostingMode;
  icon: typeof Ticket;
}> = [
  { id: 'ticketing_only', icon: Ticket },
  { id: 'equipment_only', icon: Package },
  { id: 'venue_only', icon: Building2 },
  { id: 'full_setup', icon: Layers },
];

type Props = {
  value: EventHostingMode;
  onChange: (mode: EventHostingMode) => void;
  disabled?: boolean;
};

export function EventHostingModePicker({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-foreground">
        {t('creator.hosting.legend')}
      </legend>
      <p className="text-xs text-muted-foreground -mt-1">{t('creator.hosting.legendHint')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODES.map(({ id, icon: Icon }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'text-left rounded-xl border p-4 transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                selected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-muted/20',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {t(`creator.hosting.modes.${id}.title`)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                    {t(`creator.hosting.modes.${id}.description`)}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('creator.hosting.featuresNote')}</p>
    </fieldset>
  );
}
