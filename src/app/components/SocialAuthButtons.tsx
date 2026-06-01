import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { resolveApiBase, type AuthUser } from '../lib/api';
import { isNativeApp } from '../lib/nativeApp';

type SocialAuthButtonsProps = {
  /** Where to send the user after successful OAuth (e.g. /dashboard) */
  returnTo?: string;
  className?: string;
};

function googleOAuthStartUrl(returnTo: string): string {
  const base = resolveApiBase();
  const root = base ? `${base}/api` : '/api';
  const from = encodeURIComponent(returnTo);
  const native = isNativeApp() ? '&native=1' : '';
  return `${root}/auth/google?from=${from}${native}`;
}

export function SocialAuthButtons({ returnTo = '/dashboard', className = '' }: SocialAuthButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <button
        type="button"
        className="lg-btn lg-btn--ghost w-full gap-2"
        onClick={() => {
          const url = googleOAuthStartUrl(returnTo);
          if (Capacitor.isNativePlatform()) {
            void Browser.open({ url });
            return;
          }
          window.location.href = url;
        }}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t('auth.continueWithGoogle')}
      </button>
    </div>
  );
}

function base64UrlToUtf8(raw: string): string {
  const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return decodeURIComponent(
    Array.from(atob(b64 + pad), (c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(''),
  );
}

/** Parse user payload from OAuth callback hash (server-issued). */
export function parseOAuthUserParam(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(base64UrlToUtf8(decodeURIComponent(raw))) as AuthUser;
  } catch {
    return null;
  }
}
