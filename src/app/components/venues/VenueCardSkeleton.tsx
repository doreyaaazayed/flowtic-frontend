import { memo } from 'react';

function VenueCardSkeletonImpl() {
  return (
    <div
      className="lg-card relative h-full overflow-hidden"
      style={{ borderRadius: 'var(--radius)' }}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <div className="lg-skeleton h-full w-full" />
      </div>
      <div className="space-y-3 p-5">
        <div className="lg-skeleton h-5 w-3/4 rounded-full" />
        <div className="lg-skeleton h-3 w-full rounded-full" />
        <div className="lg-skeleton h-3 w-2/3 rounded-full" />
        <div className="flex gap-3 pt-4">
          <div className="lg-skeleton h-3 w-24 rounded-full" />
          <div className="lg-skeleton h-3 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export const VenueCardSkeleton = memo(VenueCardSkeletonImpl);

export function VenueCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  );
}
