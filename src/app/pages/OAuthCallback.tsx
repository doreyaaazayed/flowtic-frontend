import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth as authApi } from '../lib/api';
import { touchSessionActivity } from '../lib/sessionIdle';
import { parseOAuthUserParam } from '../components/SocialAuthButtons';
import type { AuthUser } from '../lib/api';

const TOKEN_KEY = 'flowtic_token';
const USER_KEY = 'flowtic_user';

export function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryError = params.get('error');
    const from = params.get('from') || '/dashboard';

    if (queryError) {
      setError(decodeURIComponent(queryError));
      return;
    }

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const token = hashParams.get('token');
    let user = parseOAuthUserParam(hashParams.get('user'));
    const hashFrom = hashParams.get('from') || from;

    if (!token) {
      setError(t('auth.oauthMissingToken'));
      return;
    }

    localStorage.setItem(TOKEN_KEY, token);
    touchSessionActivity();

    const finish = (u: AuthUser) => {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      window.location.replace(hashFrom);
    };

    if (user?.id) {
      finish(user);
      return;
    }

    authApi
      .me()
      .then((me) => {
        user = {
          id: me.userId,
          username: me.username ?? '',
          email: me.email ?? '',
          role: me.role,
          emailVerified: me.emailVerified,
          firstName: me.firstName,
          lastName: me.lastName,
          phone: me.phone,
          nationalId: me.nationalId,
          dateOfBirth: me.dateOfBirth,
          organizerApproved: me.organizerApproved,
          organizerType: me.organizerType as AuthUser['organizerType'],
          organizationName: me.organizationName,
          organizationLocation: me.organizationLocation,
        };
        finish(user);
      })
      .catch(() => {
        setError(t('auth.oauthSessionFailed'));
      });
  }, [navigate, t]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link to="/signin" className="mt-6 text-primary font-medium hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t('auth.oauthCompleting')}</p>
    </div>
  );
}
