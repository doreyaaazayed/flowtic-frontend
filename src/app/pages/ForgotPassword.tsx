import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

export function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSent(true);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div
          className="relative overflow-hidden rounded-[2rem] border p-8 sm:p-10"
          style={{
            background: 'rgba(8,10,24,0.55)',
            backdropFilter: 'blur(18px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
            borderColor: 'var(--lg-border-strong)',
            boxShadow: 'var(--lg-shadow)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(500px 200px at 0% 0%, rgba(139,92,246,0.25), transparent 60%), radial-gradient(500px 200px at 100% 100%, rgba(6,182,212,0.18), transparent 60%)',
            }}
          />
          <div className="relative">
            {!emailSent ? (
              <>
                <Link
                  to="/signin"
                  className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 lg-arrow-flip" />
                  {t('auth.backToSignIn')}
                </Link>

                <div className="mb-7">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t('auth.forgotPasswordEyebrow')}
                  </span>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.025em] sm:text-4xl">
                    <Trans
                      i18nKey="auth.forgotPasswordTitle"
                      components={{ accent: <span className="text-aurora" /> }}
                    />
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('auth.forgotPasswordSubtitle')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="forgot-password-email" className="mb-2 block text-sm font-medium">
                      {t('auth.emailAddress')}
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="forgot-password-email"
                        name="email"
                        autoComplete="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="lg-input input-has-leading-icon"
                      />
                    </div>
                  </div>
                  <button type="submit" className="lg-btn h-12 w-full">
                    {t('auth.sendResetLink')}
                    <ArrowRight className="h-4 w-4 lg-arrow-flip" />
                  </button>
                </form>
              </>
            ) : (
              <div className="py-4 text-center">
                <div
                  className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg,#34d399,#06b6d4)',
                    boxShadow: '0 16px 40px -10px rgba(52,211,153,0.5)',
                  }}
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <h2 className="mb-3 text-2xl font-bold tracking-[-0.01em]">{t('auth.checkInbox')}</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  {t('auth.checkInboxDesc')}
                </p>
                <p className="mb-6 text-sm text-muted-foreground">
                  {t('auth.didntGetIt')}{' '}
                  <button className="font-semibold text-[#a78bfa] hover:underline">{t('auth.resend')}</button>
                </p>
                <Link to="/signin" className="lg-btn lg-btn--ghost w-full">
                  {t('auth.backToSignIn')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
