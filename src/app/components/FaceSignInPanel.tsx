import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { collectFaceProbeFromVideo, getFaceHuman, preloadFaceHuman, resetFaceHumanCache } from '../lib/humanFace';
import { isLikelyMobileDevice } from '../lib/deviceHints';
import { describeCameraError } from '../lib/cameraPermissions';

type Props = {
  emailHint?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function FaceSignInPanel({ emailHint, onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const { loginWithFace } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState('');
  const [progress, setProgress] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraOn(false);
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, []);

  useEffect(() => {
    resetFaceHumanCache();
    void preloadFaceHuman().catch(() => {
      /* first load may fail offline; runScan will retry with fallbacks */
    });
    return () => stopCamera();
  }, [stopCamera]);

  const waitForVideoEl = useCallback(
    () =>
      new Promise<HTMLVideoElement | null>((resolve) => {
        let attempts = 0;
        const tick = () => {
          const el = videoRef.current;
          if (el) resolve(el);
          else if (++attempts > 180) resolve(null);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    [],
  );

  const runScan = useCallback(async () => {
    if (!emailHint?.trim()) {
      setError(t('auth.faceSignInEmailRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    setStatusLine(t('auth.faceSignInLoadingModels'));
    setProgress(8);

    try {
      await getFaceHuman();
    } catch (e) {
      resetFaceHumanCache();
      setError(e instanceof Error ? e.message : t('auth.faceSignInModelsFailed'));
      setBusy(false);
      setProgress(0);
      return;
    }

    setStatusLine(t('auth.faceSignInStartingCamera'));
    setProgress(12);

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
      setBusy(false);
      return;
    }

    streamRef.current = stream;
    const video = await waitForVideoEl();
    if (!video) {
      stopCamera();
      setError(t('auth.faceSignInVideoNotReady'));
      setBusy(false);
      return;
    }

    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play().catch(() => {});
    setCameraOn(true);
    setStatusLine(t('auth.faceSignInHoldStill'));
    setProgress(35);

    const mobile = isLikelyMobileDevice();
    let embedding: number[] | null = null;
    try {
      embedding = await collectFaceProbeFromVideo(video, {
        targetSamples: mobile ? 6 : 5,
        maxMs: mobile ? 30000 : 48000,
        minQuality: mobile ? 0.45 : 0.36,
        minIntervalMs: mobile ? 180 : 140,
        requireBlink: true,
        blinkMaxMs: mobile ? 26000 : 34000,
        blinkAllowSkipAfterMs: mobile ? undefined : 11_000,
        onLivenessStatus: (msg) => {
          setStatusLine(msg);
          setProgress((p) => (p < 72 ? p + 0.8 : p));
        },
        onProgress: (n, target) => setProgress(38 + Math.round((n / target) * 40)),
      });
    } catch (e) {
      stopCamera();
      setError(e instanceof Error ? e.message : t('auth.faceSignInFailed'));
      setBusy(false);
      setProgress(0);
      return;
    }

    stopCamera();
    setProgress(80);

    if (!embedding) {
      setError(t('auth.faceSignInNotEnoughSamples'));
      setBusy(false);
      setProgress(0);
      return;
    }

    setStatusLine(t('auth.faceSignInMatching'));
    setProgress(92);

    try {
      await loginWithFace(embedding, emailHint);
      setProgress(100);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.faceSignInFailed'));
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }, [emailHint, loginWithFace, onSuccess, stopCamera, waitForVideoEl, t]);

  const glassPanel: React.CSSProperties = {
    background: 'rgba(8,9,18,0.72)',
    backdropFilter: 'blur(18px) saturate(1.7)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
    borderColor: 'var(--lg-border-strong)',
    boxShadow: 'var(--lg-shadow)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[1.75rem] border p-6 sm:p-8"
      style={glassPanel}
    >
      <button
        type="button"
        onClick={() => {
          stopCamera();
          onCancel();
        }}
        className="absolute end-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
        aria-label={t('auth.faceSignInCancel')}
      >
        <X className="h-5 w-5" />
      </button>

      <div className="text-center mb-6 pe-8">
        <ScanFace className="mx-auto h-10 w-10 text-primary mb-3" />
        <h2 className="text-xl font-bold">{t('auth.signInFaceId')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('auth.faceSignInHintWithEmail')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('auth.faceSignInBlinkHint')}
        </p>
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(244,63,94,0.4)',
            background: 'rgba(244,63,94,0.08)',
            color: '#fda4af',
          }}
        >
          {error}
          {(error.toLowerCase().includes('enroll') || error.toLowerCase().includes('no face')) && (
            <Link to="/face-id-registration" className="mt-2 block font-medium text-primary hover:underline">
              {t('auth.faceSignInEnrollLink')}
            </Link>
          )}
        </div>
      )}

      <div className="relative mx-auto aspect-square max-w-[320px] overflow-hidden rounded-2xl border border-primary/30">
        <video
          ref={videoRef}
          className={
            cameraOn
              ? 'absolute inset-0 h-full w-full scale-x-[-1] object-cover'
              : 'sr-only'
          }
          playsInline
          muted
          autoPlay
        />
        {!cameraOn && !busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <ScanFace className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        {busy && !cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}
      </div>

      {busy && (
        <div className="mt-4">
          <p className="text-center text-sm text-muted-foreground min-h-[1.25rem]">{statusLine}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runScan()}
          className="lg-btn w-full sm:w-auto"
          style={{
            padding: '0.85rem 1.5rem',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(135deg, #06b6d4, #34d399)',
          }}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('auth.faceSignInScanning')}
            </>
          ) : (
            <>
              <ScanFace className="h-5 w-5" />
              {t('auth.faceSignInStartScan')}
            </>
          )}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="lg-btn lg-btn--ghost w-full sm:w-auto"
          style={{ padding: '0.85rem 1.5rem' }}
        >
          {t('auth.faceSignInCancel')}
        </button>
      </div>
    </motion.div>
  );
}
