import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLanApiHealthUrl, healthCheck, isLanDevHost } from '../lib/api';
import { isNativeApp } from '../lib/nativeApp';

/** Shown when the page loads but the API on :5000 is unreachable (LAN browser or Capacitor). */
export function LanDevBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(false);
  const healthUrl = getLanApiHealthUrl();
  const native = isNativeApp();
  const shouldMonitor = isLanDevHost() || native;

  useEffect(() => {
    if (!shouldMonitor) return;
    let cancelled = false;
    const run = async () => {
      const ok = await healthCheck();
      if (!cancelled) setOffline(!ok);
    };
    run();
    const id = setInterval(run, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [shouldMonitor]);

  if (!shouldMonitor || !offline || !healthUrl) return null;

  return (
    <div
      role="alert"
      className="relative z-[200] border-b border-rose-500/40 bg-rose-950/90 px-4 py-3 text-center text-sm text-rose-100"
    >
      <p className="inline-flex flex-wrap items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
        <span>
          {native
            ? t('mobile.apiOfflineNative', {
                url: healthUrl,
                defaultValue:
                  'Cannot reach the FlowTic API. Start the backend on your PC (cd backend && npm start) and ensure VITE_API_URL or live-reload LAN IP is correct. Health check: {{url}}',
              })
            : t('mobile.apiOfflineLan', {
                url: healthUrl,
                defaultValue:
                  'Backend not reachable. On your PC run cd backend && npm start, then open {{url}} (must show {"status":"ok"}).',
              })}
        </span>
      </p>
    </div>
  );
}
