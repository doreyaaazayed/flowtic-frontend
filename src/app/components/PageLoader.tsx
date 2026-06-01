import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PageLoaderProps = {
  /** Full viewport center (routes, auth gate) */
  fullScreen?: boolean;
  /** Optional status line under the spinner */
  message?: string;
  className?: string;
};

export function PageLoader({ fullScreen, message, className = '' }: PageLoaderProps) {
  const { t } = useTranslation();
  const label = message ?? t('common.loading');

  const inner = (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.45), transparent 70%)',
          }}
          aria-hidden
        />
        <Loader2 className="relative h-10 w-10 animate-spin text-primary" aria-hidden />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center px-6 py-16">
        {inner}
      </div>
    );
  }

  return inner;
}
