import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { motion } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../lib/api';
import { Pill } from '../liquid/Pill';

export function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useAuth();
  const { t } = useTranslation();
  const emailFromState = (location.state as { email?: string } | null)?.email;
  const email = emailFromState ?? user?.email ?? '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
      return;
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (otp.length !== 6) {
      setError(t('auth.verify.enterCode'));
      return;
    }
    setLoading(true);
    try {
      const { user: updatedUser } = await authApi.verifyEmail({ email, otp });
      setUser(updatedUser);
      await refreshUser();
      setSuccess(t('auth.verify.verifiedRedirect'));
      setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.verify.verifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccess('');
    try {
      await authApi.resendOtp(email);
      setSuccess(t('auth.verify.newCodeSent'));
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.verify.newCodeFailed'));
    }
  };

  if (!email) return null;

  return (
    <div className="relative grid min-h-[calc(100vh-160px)] grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div
            className="relative overflow-hidden rounded-[2rem] border p-8 sm:p-10"
            style={{
              background: 'rgba(8,9,18,0.6)',
              backdropFilter: 'blur(18px) saturate(1.7)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
              borderColor: 'var(--lg-border-strong)',
              boxShadow: 'var(--lg-shadow)',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(500px 200px at 0% 0%, rgba(168,85,247,0.25), transparent 60%), radial-gradient(500px 200px at 100% 100%, rgba(59,130,246,0.18), transparent 60%)',
              }}
            />
            <div className="relative">
              <Link
                to="/signin"
                className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 lg-arrow-flip" />
                {t('auth.backToSignIn')}
              </Link>

              <div className="mb-8">
                <Pill tone="neon" leadingIcon={<ShieldCheck className="h-3.5 w-3.5" />}>
                  {t('auth.verify.pill')}
                </Pill>
                <h1 className="display-3 mt-4 text-balance">
                  <Trans
                    i18nKey="auth.verify.title"
                    components={{ accent: <span className="text-luxe" /> }}
                  />
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  <Trans
                    i18nKey="auth.verify.sentTo"
                    values={{ email }}
                    components={[<strong className="text-foreground" />]}
                  />
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleVerify}>
                {error && (
                  <div
                    className="rounded-2xl border p-3 text-sm"
                    style={{
                      borderColor: 'rgba(244,63,94,0.4)',
                      background: 'rgba(244,63,94,0.08)',
                      color: '#fda4af',
                    }}
                  >
                    {error}
                  </div>
                )}
                {success && (
                  <div
                    className="rounded-2xl border p-3 text-sm"
                    style={{
                      borderColor: 'rgba(52,211,153,0.4)',
                      background: 'rgba(52,211,153,0.08)',
                      color: '#6ee7b7',
                    }}
                  >
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="verify-email-otp"
                    className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {t('auth.verify.code')}
                  </label>
                  <div className="flex justify-center">
                    <InputOTP
                      id="verify-email-otp"
                      name="verification_code"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="!h-14 !w-12 rounded-2xl text-xl" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="lg-btn h-12 w-full"
                  style={{ padding: '0 1rem', fontSize: '0.95rem' }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('auth.verify.verifying')}
                    </span>
                  ) : (
                    <>
                      {t('auth.verify.verifyBtn')}
                      <ArrowRight className="h-4 w-4 lg-arrow-flip" />
                    </>
                  )}
                </button>

                <div className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#c084fc] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        {t('auth.verify.resendIn', { n: resendCooldown })}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('auth.resendCode')}
                      </>
                    )}
                  </button>
                </div>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {t('auth.verify.wrongEmail')}{' '}
                <Link to="/signup" className="font-semibold text-[#c084fc] hover:underline">
                  {t('auth.verify.signUpAgain')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-20 top-10 h-96 w-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.4), transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute -right-10 bottom-10 h-96 w-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.32), transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>
        <div className="relative max-w-md px-10 text-center">
          <span
            className="mx-auto mb-7 inline-flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              background: 'linear-gradient(135deg,#a855f7,#3b82f6)',
              boxShadow:
                '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 16px 40px -10px rgba(168,85,247,0.55)',
            }}
          >
            <Mail className="h-10 w-10 text-white" strokeWidth={2.2} />
          </span>
          <h2 className="display-3 text-balance">
            <Trans
              i18nKey="auth.verify.side.title"
              components={{ accent: <span className="text-luxe" /> }}
            />
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {t('auth.verify.side.subtitle')}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            style={{ borderColor: 'var(--lg-border)' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#c084fc]" />
            {t('auth.verify.side.tag')}
          </div>
        </div>
      </div>
    </div>
  );
}
