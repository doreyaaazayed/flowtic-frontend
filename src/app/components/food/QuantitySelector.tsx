import { Minus, Plus } from 'lucide-react';
import { Button } from '../ui/button';

export function QuantitySelector({
  value,
  onChange,
  max = 20,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
