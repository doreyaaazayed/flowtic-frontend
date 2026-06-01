import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  strong?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { children, strong, className = '', ...rest },
  ref,
) {
  return (
    <div ref={ref} className={`${strong ? 'lg-surface-strong' : 'lg-surface'} ${className}`} {...rest}>
      {children}
    </div>
  );
});
