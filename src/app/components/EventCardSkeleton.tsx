import { memo } from 'react';

function EventCardSkeletonImpl() {
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
        <div className="lg-skeleton h-3 w-1/2 rounded-full" />
        <div className="lg-skeleton h-3 w-2/3 rounded-full" />
        <div className="flex items-center justify-between pt-4">
          <div className="space-y-2">
            <div className="lg-skeleton h-2 w-12 rounded-full" />
            <div className="lg-skeleton h-6 w-20 rounded-md" />
          </div>
          <div className="lg-skeleton h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export const EventCardSkeleton = memo(EventCardSkeletonImpl);

export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
