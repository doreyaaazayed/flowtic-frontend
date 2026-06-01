import type { ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  reverse?: boolean;
  className?: string;
}

/**
 * Infinite marquee — duplicates its children twice so the loop is seamless.
 * Pauses on hover.
 */
export function Marquee({ children, reverse, className = '' }: MarqueeProps) {
  return (
    <div className={`lg-marquee ${reverse ? 'lg-marquee--reverse' : ''} ${className}`}>
      <div className="lg-marquee__track">
        <div className="flex items-center gap-12">{children}</div>
        <div className="flex items-center gap-12" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
