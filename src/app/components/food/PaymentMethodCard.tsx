import { motion } from 'motion/react';
import { Check, CreditCard, Banknote } from 'lucide-react';
import { cn } from '../ui/utils';
import type { FoodPaymentMethod } from '../../lib/api';

export type PaymentOption = {
  id: string;
  paymentMethod: FoodPaymentMethod;
  label: string;
  description?: string;
};

type Props = {
  option: PaymentOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

function VisaLogo() {
  return (
    <svg viewBox="0 0 64 24" className="h-5 w-auto" aria-hidden="true">
      <text
        x="32"
        y="18"
        textAnchor="middle"
        fontFamily="'Inter', sans-serif"
        fontSize="18"
        fontStyle="italic"
        fontWeight="800"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 44 28" className="h-6 w-auto" aria-hidden="true">
      <circle cx="17" cy="14" r="10" fill="#EB001B" />
      <circle cx="27" cy="14" r="10" fill="#F79E1B" />
      <path
        d="M22 6.5a10 10 0 0 1 0 15 10 10 0 0 1 0-15z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function BrandLogo({ brand }: { brand: string }) {
  switch (brand) {
    case 'visa':
      return <VisaLogo />;
    case 'mastercard':
      return <MastercardLogo />;
    case 'cod':
      return <Banknote className="h-5 w-5 text-emerald-500" />;
    default:
      return <CreditCard className="h-5 w-5 text-muted-foreground" />;
  }
}

export function PaymentMethodCard({ option, selected, onSelect, disabled }: Props) {
  const isCard = option.paymentMethod === 'card';

  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'lg-card group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 text-start transition-all',
        'hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]',
        selected
          ? 'border-primary/70 bg-primary/5 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
          : 'border-border',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <div className="flex h-10 items-center gap-1 rounded-lg bg-background/70 px-2 ring-1 ring-border">
        {isCard ? (
          <>
            <VisaLogo />
            <MastercardLogo />
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </>
        ) : (
          <BrandLogo brand="cod" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{option.label}</p>
        {option.description && (
          <p className="text-xs text-muted-foreground">{option.description}</p>
        )}
      </div>
      {selected && (
        <>
          <motion.span
            layoutId="payment-method-indicator"
            className="absolute inset-y-0 end-0 flex w-1 bg-gradient-to-b from-primary to-secondary"
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          />
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute end-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-3 w-3" />
          </motion.span>
        </>
      )}
    </motion.button>
  );
}
