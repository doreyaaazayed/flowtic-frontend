import type { HTMLAttributes, ReactNode } from 'react';

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tight?: boolean;
  /** Optional max-width container override. */
  container?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const containerWidth: Record<NonNullable<SectionProps['container']>, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-[88rem]',
  full: 'max-w-full',
};

export function Section({
  children,
  tight,
  container = 'xl',
  className = '',
  ...rest
}: SectionProps) {
  return (
    <section
      {...rest}
      className={`${tight ? 'lg-section--tight' : 'lg-section'} ${className}`}
    >
      <div className={`relative mx-auto ${containerWidth[container]} px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </section>
  );
}

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <span className={`eyebrow ${className}`}>
      <span className="eyebrow-dot" aria-hidden />
      {children}
    </span>
  );
}

interface SectionHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  trailing?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  trailing,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`mb-10 flex flex-col gap-5 ${
        align === 'center'
          ? 'items-center text-center'
          : 'sm:flex-row sm:items-end sm:justify-between'
      } ${className}`}
    >
      <div className={align === 'center' ? 'mx-auto max-w-3xl' : 'max-w-2xl'}>
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h2 className="display-2 text-balance">{title}</h2>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

interface StatProps {
  value: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function Stat({ value, label, hint, className = '' }: StatProps) {
  return (
    <div
      className={`lg-card relative p-5 ${className}`}
      style={{ borderRadius: 'var(--radius)' }}
    >
      <div
        className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl"
        style={{
          background: 'var(--grad-text)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground/80">{hint}</div>}
    </div>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`divider-aurora ${className}`} aria-hidden />;
}
