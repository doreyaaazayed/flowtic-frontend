import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  clearSessionActivity,
  isSessionIdleExpired,
  startSessionIdleWatch,
} from '../lib/sessionIdle';

/** Signs the user out after 30 minutes without UI activity. */
export function SessionIdleMonitor() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const firedRef = useRef(false);

  const handleIdleLogout = useCallback(() => {
    if (firedRef.current || !user) return;
    firedRef.current = true;
    clearSessionActivity();
    logout();
    toast.info(t('auth.sessionExpiredIdle'));
    navigate('/login', { replace: true });
  }, [user, logout, navigate, t]);

  useEffect(() => {
    firedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (loading || !user) return;
    if (isSessionIdleExpired()) {
      handleIdleLogout();
      return;
    }
    return startSessionIdleWatch(handleIdleLogout);
  }, [loading, user, handleIdleLogout]);

  return null;
}
