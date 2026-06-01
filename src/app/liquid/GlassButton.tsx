import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'aurora' | 'ghost' | 'outline' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  aurora: 'lg-btn',
  ghost: 'lg-btn lg-btn--ghost',
  outline: 'lg-btn lg-btn--ghost',
  danger: 'lg-btn',
  success: 'lg-btn',
};

const sizeClass: Record<Size, string> = {
  sm: 'text-sm py-2 px-4',
  md: 'text-sm py-2.5 px-5',
  lg: 'text-base py-3.5 px-7',
};

const variantStyle: Record<Variant, React.CSSProperties> = {
  aurora: {},
  ghost: {},
  outline: { background: 'transparent' },
  danger: {
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(135deg, #f43f5e, #fb7185)',
    boxShadow:
      '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 -1px 0 0 rgba(0,0,0,0.25) inset, 0 12px 30px -8px rgba(244,63,94,0.55)',
  },
  success: {
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(135deg, #34d399, #06b6d4)',
    boxShadow:
      '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 -1px 0 0 rgba(0,0,0,0.25) inset, 0 12px 30px -8px rgba(52,211,153,0.55)',
  },
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  {
    children,
    variant = 'aurora',
    size = 'md',
    leadingIcon,
    trailingIcon,
    fullWidth,
    className = '',
    style,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ ...variantStyle[variant], ...style }}
      {...rest}
    >
      {leadingIcon && <span className="inline-flex">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="inline-flex">{trailingIcon}</span>}
    </button>
  );
});
