import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { subscribeGlobalLoading } from '../lib/globalLoading';

export function GlobalLoadingIndicator() {
  const { t } = useTranslation();
  const [state, setState] = useState({ active: false, pending: 0 });

  useEffect(() => subscribeGlobalLoading(setState), []);

  return (
    <AnimatePresence>
      {state.active && (
        <>
          <motion.div
            key="flowtic-loading-bar"
            className="flowtic-global-loading-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden
          />
          <motion.div
            key="flowtic-loading-overlay"
            className="flowtic-global-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={t('common.loading')}
          >
            <div className="flowtic-global-loading-card">
              <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium text-foreground">{t('common.loading')}</p>
              <p className="text-xs text-muted-foreground">
                {t('app.loadingHint')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
