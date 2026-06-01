import type { ReactNode } from 'react';

type Tone = 'default' | 'gold' | 'electric' | 'neon' | 'success' | 'danger';

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  leadingIcon?: ReactNode;
}

const toneClass: Record<Tone, string> = {
  default: 'lg-chip',
  gold: 'lg-chip lg-chip--gold',
  electric: 'lg-chip lg-chip--electric',
  neon: 'lg-chip lg-chip--neon',
  success: 'lg-chip lg-chip--success',
  danger: 'lg-chip lg-chip--danger',
};

export function Pill({ children, tone = 'default', className = '', leadingIcon }: PillProps) {
  return (
    <span className={`${toneClass[tone]} ${className}`}>
      {leadingIcon && <span className="inline-flex">{leadingIcon}</span>}
      {children}
    </span>
  );
}
