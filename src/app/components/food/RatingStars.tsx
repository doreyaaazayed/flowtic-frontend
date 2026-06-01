import { Star } from 'lucide-react';
import { cn } from '../ui/utils';

export function RatingStars({
  value,
  count,
  size = 'sm',
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sz,
            i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
          )}
        />
      ))}
      {count != null && count > 0 && (
        <span className="ms-1 text-xs text-muted-foreground">({count})</span>
      )}
    </span>
  );
}
