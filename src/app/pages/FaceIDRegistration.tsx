import { useCallback, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Shield, Camera, Check, ArrowRight, ScanFace, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profile } from '../lib/api';
import {
  collectFaceEmbeddingsFromVideo,
  collectFaceProbeFromVideo,
  getFaceHuman,
} from '../lib/humanFace';
import { describeCameraError, insecureCameraHint, isSecureCameraContext } from '../lib/cameraPermissions';
import { Pill } from '../liquid/Pill';

type Step = 'intro' | 'prepare' | 'scanning' | 'success';

export function FaceIDRegistration() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('intro');
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const locState = location.state as {
    returnTo?: string;
    signupFlow?: boolean;
    signupEmail?: string;
    removeFace?: boolean;
  } | null;
  const returnTo = locState?.returnTo;
  const signupFlow = Boolean(locState?.signupFlow);
  const removeFace = Boolean(locState?.removeFace);
  const signupEmail = locState?.signupEmail?.trim() || authUser?.email || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const goVerifyEmail = useCallback(() => {
    const em = signupEmail || authUser?.email;
    if (em) navigate('/verify-email', { replace: true, state: { email: em } });
    else navigate('/signup', { replace: true });
  }, [signupEmail, authUser?.email, navigate]);

  const goNextAfterFace = useCallback(() => {
    if (signupFlow) {
      goVerifyEmail();
      return;
    }
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate('/dashboard');
  }, [signupFlow, returnTo, navigate, goVerifyEmail]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    profile
      .faceStatus()
      .then((r) => {
        if (!cancelled) setEnrolled(r.enrolled);
      })
      .catch(() => {
        if (!cancelled) setEnrolled(null);
      });
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  const waitForVideoEl = useCallback(
    () =>
      new Promise<HTMLVideoElement | null>((resolve) => {
        let attempts = 0;
        const max = 180;
        const tick = () => {
          const el = videoRef.current;
          if (el) resolve(el);
          else if (++attempts > max) resolve(null);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(() => requestAnimationFrame(tick));
      }),
    [],
  );

  const runEnrollment = useCallback(async () => {
    setError(null);
    setVerifyHint(null);
    setStep('prepare');
    setStatusLine('Starting camera…');
    setProgress(5);

    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .catch((e) => {
        setError(describeCameraError(e));
        return null;
      });

    if (!stream) {
      setStep('intro');
      return;
    }

    streamRef.current = stream;
    const video = await waitForVideoEl();
    if (!video) {
      stopCamera();
      setError('Video element not ready.');
      setStep('intro');
      return;
    }

    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play().catch(() => {});

    setStep('scanning');
    setStatusLine('Loading face models (first visit may take a minute)…');
    setProgress(15);

    await getFaceHuman();
    setProgress(35);
    setStatusLine('Hold your face in the frame. Move slowly left and right when prompted…');

    const samples = await collectFaceEmbeddingsFromVideo(video, {
      targetSamples: 10,
      maxMs: 42000,
      minIntervalMs: 220,
      minQuality: 0.48,
      requireBlink: true,
      onLivenessStatus: setStatusLine,
      onProgress: (n, target, hint) => {
        setProgress(35 + Math.round((n / target) * 40));
        if (hint) setStatusLine(hint);
      },
    });

    stopCamera();
    setProgress(78);

    if (samples.length < 4) {
      setError(
        'We could not capture enough clear face samples. Face a window or lamp, remove heavy shadows, and try again.',
      );
      setStep('intro');
      return;
    }

    setStatusLine('Saving multi-angle templates to your account…');
    try {
      await profile.enrollFace({ samples });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrollment failed');
      setStep('intro');
      return;
    }

    setProgress(100);
    setEnrolled(true);
    setStep('success');
    setStatusLine('');
  }, [stopCamera, waitForVideoEl]);

  const captureEmbedding = useCallback(
    async (label: string) => {
      setError(null);
      setStep('prepare');
      setStatusLine(label);
      setProgress(5);

      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        .catch((e) => {
          setError(describeCameraError(e));
          return null;
        });

      if (!stream) {
        setStep('intro');
        return null;
      }

      streamRef.current = stream;
      const video = await waitForVideoEl();
      if (!video) {
        stopCamera();
        setStep('intro');
        return null;
      }

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play().catch(() => {});

      setStep('scanning');
      setProgress(30);
      await getFaceHuman();
      const embedding = await collectFaceProbeFromVideo(video, {
        targetSamples: 6,
        maxMs: 28000,
        minQuality: 0.45,
        requireBlink: true,
        onLivenessStatus: setStatusLine,
        onProgress: (n, target) => setProgress(30 + Math.round((n / target) * 50)),
      });

      stopCamera();
      setProgress(85);

      if (!embedding) {
        setError('Not enough clear samples. Center your face with even lighting and try again.');
        setStep('intro');
        return null;
      }

      return embedding;
    },
    [stopCamera, waitForVideoEl],
  );

  const runRemoveFace = useCallback(async () => {
    const embedding = await captureEmbedding('Verify your face to remove Face ID…');
    if (!embedding) return;

    setStatusLine('Removing Face ID…');
    setProgress(95);
    try {
      await profile.deleteFace(embedding);
      setEnrolled(false);
      setVerifyHint('Face ID removed. You can enroll again as the account owner.');
      setStep('intro');
      setProgress(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove Face ID');
      setStep('intro');
    }
  }, [captureEmbedding]);

  const runVerify = useCallback(async () => {
    setError(null);
    setVerifyHint(null);
    setStep('prepare');
    setStatusLine('Starting camera for verification…');
    setProgress(5);

    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .catch((e) => {
        setError(describeCameraError(e));
        return null;
      });

    if (!stream) {
      setStep('intro');
      return;
    }

    streamRef.current = stream;
    const video = await waitForVideoEl();
    if (!video) {
      stopCamera();
      setStep('intro');
      return;
    }

    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play().catch(() => {});

    setStep('scanning');
    setStatusLine('Verifying…');
    setProgress(30);

    await getFaceHuman();
    const embedding = await collectFaceProbeFromVideo(video, {
      targetSamples: 6,
      maxMs: 28000,
      minQuality: 0.45,
      requireBlink: true,
      onLivenessStatus: setStatusLine,
    });

    stopCamera();
    setProgress(85);

    if (!embedding) {
      setError('Not enough samples to verify. Try again with your face centered and even light.');
      setStep('intro');
      return;
    }

    try {
      const res = await profile.verifyFace(embedding);
      setVerifyHint(
        res.match
          ? `Verified (similarity ${res.similarity.toFixed(3)}).`
          : `No match (similarity ${res.similarity.toFixed(3)}, need ≥ ${res.threshold}). Try again or re-enroll.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    }

    setProgress(100);
    setStep('intro');
  }, [stopCamera, waitForVideoEl]);

  const glassPanel: React.CSSProperties = {
    background: 'rgba(8,9,18,0.62)',
    backdropFilter: 'blur(18px) saturate(1.7)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
    borderColor: 'var(--lg-border-strong)',
    boxShadow: 'var(--lg-shadow)',
  };

  return (
    <div className="relative flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {!isSecureCameraContext() && step === 'intro' && (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(251,191,36,0.45)',
              background: 'rgba(251,191,36,0.1)',
              color: '#fde68a',
            }}
          >
            {insecureCameraHint()}
          </div>
        )}
        {error && step === 'intro' && (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(244,63,94,0.4)',
              background: 'rgba(244,63,94,0.08)',
              color: '#fda4af',
            }}
          >
            {error}
          </div>
        )}
        {verifyHint && step === 'intro' && (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--lg-border)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {verifyHint}
          </div>
        )}

        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border p-8 text-center md:p-12"
            style={glassPanel}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(500px 240px at 50% 0%, rgba(168,85,247,0.25), transparent 70%)',
              }}
            />
            <div className="relative">
              <div className="flex justify-center">
                <Pill tone="neon" leadingIcon={<Lock className="h-3.5 w-3.5" />}>
                  On-device · End-to-end secure
                </Pill>
              </div>
              <span
                className="mx-auto mt-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg,#a855f7,#3b82f6)',
                  boxShadow:
                    '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 18px 44px -10px rgba(168,85,247,0.6)',
                }}
              >
                <ScanFace className="h-12 w-12 text-white" strokeWidth={2.1} />
              </span>

              <h1 className="display-2 mt-7 text-balance">
                {removeFace ? (
                  <>
                    Remove <span className="text-luxe">Face ID</span>
                  </>
                ) : (
                  <Trans
                    i18nKey={signupFlow ? 'faceId.addTitle' : 'faceId.registerTitle'}
                    components={{ accent: <span className="text-luxe" /> }}
                  />
                )}
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
                {removeFace
                  ? 'Scan your enrolled face to confirm removal. Another person cannot delete or replace your biometric.'
                  : signupFlow
                    ? t('faceId.addSubtitle')
                    : t('faceId.registerSubtitle')}
              </p>
              {enrolled && !signupFlow && !removeFace && (
                <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                  Re-scanning updates your template only if the live face matches the one already saved on this account.
                </p>
              )}
              {!enrolled && !removeFace && (
                <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                  For best results: even lighting, no sunglasses, blink when prompted, and slow head turns. We store
                  several angles — not just one photo.
                </p>
              )}

              {signupFlow && (
                <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
                  {t('faceId.nextStep')}
                </p>
              )}

              {enrolled === true && (
                <div className="mt-5 flex justify-center">
                  <Pill tone="success" leadingIcon={<Check className="h-3.5 w-3.5" />}>
                    {t('faceId.alreadyEnrolled')}
                  </Pill>
                </div>
              )}

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    Icon: Shield,
                    title: 'Secure',
                    description: 'Template only — processed locally',
                    grad: 'linear-gradient(135deg,#a855f7,#3b82f6)',
                  },
                  {
                    Icon: Camera,
                    title: 'Live',
                    description: 'One quick scan via your camera',
                    grad: 'linear-gradient(135deg,#3b82f6,#22d3ee)',
                  },
                  {
                    Icon: Check,
                    title: 'Simple',
                    description: 'Center your face and hold still',
                    grad: 'linear-gradient(135deg,#f0c674,#fb923c)',
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: 'var(--lg-border)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <span
                      className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: feature.grad,
                        boxShadow: '0 1px 0 0 rgba(255,255,255,0.35) inset',
                      }}
                    >
                      <feature.Icon className="h-5 w-5 text-white" />
                    </span>
                    <h3 className="text-sm font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {removeFace ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void runRemoveFace()}
                      className="lg-btn"
                      style={{ padding: '0.95rem 1.7rem' }}
                    >
                      <ScanFace className="h-5 w-5" />
                      Verify & remove
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="lg-btn lg-btn--ghost"
                      style={{ padding: '0.95rem 1.7rem' }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        void runEnrollment();
                      }}
                      className="lg-btn"
                      style={{ padding: '0.95rem 1.7rem' }}
                    >
                      <Camera className="h-5 w-5" />
                      {enrolled ? 'Re-scan Face ID (same person)' : 'Start Face ID setup'}
                    </button>
                    {enrolled && !signupFlow && (
                      <button
                        type="button"
                        onClick={() => void runVerify()}
                        className="lg-btn lg-btn--ghost"
                        style={{ padding: '0.95rem 1.7rem' }}
                      >
                        <ScanFace className="h-5 w-5" />
                        Test recognition
                      </button>
                    )}
                  </>
                )}
              </div>

              {signupFlow && (
                <div className="mt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={goVerifyEmail}
                  >
                    Skip for now — verify email
                  </Button>
                </div>
              )}

              <p className="mt-5 text-xs text-muted-foreground">
                First run downloads small models (~30s). On a phone use{' '}
                <strong className="text-foreground">https://</strong> with your PC IP (run{' '}
                <code className="text-[11px]">npm run dev</code> in frontend), not http://.
              </p>
            </div>
          </motion.div>
        )}

        {(step === 'prepare' || step === 'scanning') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border p-8 md:p-12"
            style={glassPanel}
          >
            <div className="mb-7 text-center">
              <h2 className="display-3 text-balance">
                {step === 'prepare' ? (
                  <>
                    Getting <span className="text-luxe">ready.</span>
                  </>
                ) : (
                  <>
                    Capturing <span className="text-luxe">your face.</span>
                  </>
                )}
              </h2>
              <p className="mt-3 min-h-[2.5rem] text-sm text-muted-foreground">{statusLine}</p>
            </div>

            <div className="relative mx-auto flex justify-center" style={{ maxWidth: '420px' }}>
              <div
                className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-[1.75rem]"
                style={{
                  background:
                    'radial-gradient(circle at 50% 35%, rgba(168,85,247,0.22), rgba(8,9,18,0.5))',
                  border: '1px solid rgba(168,85,247,0.4)',
                  boxShadow:
                    '0 0 0 6px rgba(168,85,247,0.08), 0 0 60px -4px rgba(168,85,247,0.4)',
                }}
              >
                {/* outer halo */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 lg-glow-pulse rounded-[inherit]"
                />
                <video
                  ref={videoRef}
                  className={
                    streamRef.current
                      ? 'absolute inset-0 h-full w-full scale-x-[-1] object-cover'
                      : 'sr-only'
                  }
                  playsInline
                  muted
                  autoPlay
                />
                {!streamRef.current && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-[#c084fc]" />
                  </div>
                )}
                {/* Scan line */}
                <motion.div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(168,85,247,0.45), transparent)',
                  }}
                  animate={{ y: ['0%', '220%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                />
                {/* Corner brackets */}
                {([
                  'top-4 left-4 border-l-4 border-t-4 rounded-tl-2xl',
                  'top-4 right-4 border-r-4 border-t-4 rounded-tr-2xl',
                  'bottom-4 left-4 border-l-4 border-b-4 rounded-bl-2xl',
                  'bottom-4 right-4 border-r-4 border-b-4 rounded-br-2xl',
                ] as const).map((cls) => (
                  <div
                    key={cls}
                    className={`absolute z-10 h-10 w-10 ${cls}`}
                    style={{ borderColor: '#c084fc' }}
                  />
                ))}
                {/* Center reticle */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    border: '1px dashed rgba(192,132,252,0.45)',
                  }}
                />
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Progress
                </span>
                <span className="text-sm font-semibold text-[#c084fc]">{progress}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg,#a855f7,#3b82f6,#22d3ee)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </div>

            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setStep('intro');
                  setProgress(0);
                  setStatusLine('');
                }}
                className="lg-btn lg-btn--ghost"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border p-8 text-center md:p-12"
            style={glassPanel}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(500px 240px at 50% 0%, rgba(52,211,153,0.2), transparent 70%)',
              }}
            />
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 220, damping: 16 }}
                className="mx-auto mb-7 inline-flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg,#34d399,#22d3ee)',
                  boxShadow:
                    '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 18px 44px -10px rgba(52,211,153,0.55)',
                }}
              >
                <Check className="h-12 w-12 text-white" />
              </motion.div>

              <Pill tone="success" leadingIcon={<Sparkles className="h-3.5 w-3.5" />}>
                Identity bonded
              </Pill>
              <h2 className="display-2 mt-4 text-balance">
                Face ID <span className="text-luxe">registered.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
                {signupFlow
                  ? 'Your face template is saved. Continue to enter the verification code we emailed you.'
                  : 'Your face template is saved. Use “Test recognition” to confirm it any time.'}
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goNextAfterFace}
                  className="lg-btn"
                  style={{ padding: '0.95rem 1.7rem' }}
                >
                  {signupFlow
                    ? 'Continue to email verification'
                    : returnTo
                      ? 'Back to checkout'
                      : 'Go to dashboard'}
                  <ArrowRight className="h-5 w-5" />
                </button>
                {!signupFlow && (
                  <button
                    type="button"
                    onClick={() => void runVerify()}
                    className="lg-btn lg-btn--ghost"
                    style={{ padding: '0.95rem 1.7rem' }}
                  >
                    Test recognition
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
