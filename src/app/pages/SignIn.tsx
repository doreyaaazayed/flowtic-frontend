import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ScanFace, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaceSignInPanel } from '../components/FaceSignInPanel';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import { isValidEmail } from '../lib/authFieldValidation';
import { preloadFaceHuman } from '../lib/humanFace';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [faceSignInOpen, setFaceSignInOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError(t('auth.errors.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      const signedIn = await login(email.trim(), password);
      const dest =
        signedIn.role === 'vendor' && (from === '/dashboard' || from === '/')
          ? '/vendor'
          : signedIn.role === 'usher' && (from === '/dashboard' || from === '/')
            ? '/usher'
            : from;
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorSignIn'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-[calc(100vh-160px)] grid-cols-1 lg:grid-cols-2">
      {/* Form */}
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
              <div className="mb-8">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t('auth.signInEyebrow')}
                </span>
                <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.025em]">
                  <Trans
                    i18nKey="auth.signInHeadline"
                    components={{ accent: <span className="text-aurora" /> }}
                  />
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t('auth.signInSubtitle')}
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
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

                <div>
                  <label htmlFor="signin-email" className="mb-2 block text-sm font-medium">
                    {t('auth.emailAddress')}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="signin-email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoCapitalize="none"
                      spellCheck={false}
                      className="lg-input input-has-leading-icon"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signin-password" className="mb-2 block text-sm font-medium">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="signin-password"
                      name="password"
                      autoComplete="current-password"
                      type={showPwd ? 'text' : 'password'}
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="lg-input input-has-leading-icon input-has-trailing-icon"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                      aria-label={showPwd ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="signin-remember" className="flex cursor-pointer items-center gap-2">
                    <input
                      id="signin-remember"
                      name="remember_me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-[#8b5cf6]"
                    />
                    <span className="text-muted-foreground">{t('auth.rememberMe')}</span>
                  </label>
                  <Link to="/forgot-password" className="text-[#a78bfa] hover:underline">
                    {t('auth.forgotPassword')}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="lg-btn h-12 w-full"
                  style={{ padding: '0 1rem', fontSize: '0.95rem' }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('auth.signingIn')}
                    </span>
                  ) : (
                    <>
                      {t('auth.signInBtn')}
                      <ArrowRight className="h-4 w-4 lg-arrow-flip" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="divider-aurora" />
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  style={{
                    background: 'rgba(8,10,24,0.85)',
                    borderColor: 'var(--lg-border)',
                  }}
                >
                  {t('auth.orContinue')}
                </span>
              </div>

              {faceSignInOpen ? (
                <FaceSignInPanel
                  emailHint={email}
                  onSuccess={() => navigate(from, { replace: true })}
                  onCancel={() => setFaceSignInOpen(false)}
                />
              ) : (
              /* Social / Face ID */
              <div className="space-y-3">
                <SocialAuthButtons returnTo={from} />
                <button
                  type="button"
                  className="lg-btn w-full"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(135deg, #06b6d4, #34d399)',
                  }}
                  onClick={() => {
                    setError('');
                    if (!email.trim()) {
                      setError(t('auth.faceSignInEmailRequired'));
                      return;
                    }
                    void preloadFaceHuman();
                    setFaceSignInOpen(true);
                  }}
                >
                  <ScanFace className="h-4 w-4" />
                  {t('auth.signInFaceId')}
                </button>
              </div>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {t('auth.noAccount')}{' '}
                <Link to="/signup" className="font-semibold text-[#a78bfa] hover:underline">
                  {t('auth.signUpLink')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Side */}
      <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-20 top-10 h-80 w-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute right-10 bottom-10 h-80 w-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(6,182,212,0.32), transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>
        <div className="relative max-w-md px-10">
          <span
            className="mb-7 inline-flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{
              background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
              boxShadow:
                '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 16px 40px -10px rgba(139,92,246,0.55)',
            }}
          >
            <ScanFace className="h-8 w-8 text-white" strokeWidth={2.2} />
          </span>
          <h2 className="text-balance text-4xl font-extrabold tracking-[-0.025em]">
            <Trans
              i18nKey="auth.side.headline"
              components={{ accent: <span className="text-aurora" /> }}
            />
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {t('auth.side.subtitle')}
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              t('auth.side.points.entry'),
              t('auth.side.points.recs'),
              t('auth.side.points.resale'),
              t('auth.side.points.benefits'),
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(6,182,212,0.18))',
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 text-[#a78bfa]" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            style={{ borderColor: 'var(--lg-border)' }}>
            <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
            {t('auth.side.tag')}
          </div>
        </div>
      </div>
    </div>
  );
}
