import { Sparkles } from 'lucide-react';

interface AIBadgeProps {
  text?: string;
  className?: string;
  /** Compact pill variant without backdrop */
  compact?: boolean;
}

export function AIBadge({ text = 'AI Powered', className = '', compact = false }: AIBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white ${className}`}
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          boxShadow: '0 6px 18px -6px rgba(139,92,246,0.6)',
        }}
      >
        <Sparkles className="h-3 w-3" />
        {text}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(14px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
        borderColor: 'rgba(255,255,255,0.18)',
        color: '#f4f5ff',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.2) inset, 0 8px 22px -8px rgba(139,92,246,0.45)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          padding: '1px',
          background:
            'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(6,182,212,0.6) 50%, rgba(240,171,252,0.7))',
          WebkitMask:
            'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <Sparkles className="h-3.5 w-3.5 text-[#c4b5fd]" />
      <span
        style={{
          background: 'var(--grad-text)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {text}
      </span>
    </span>
  );
}
