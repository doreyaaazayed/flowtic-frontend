import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Activity, CheckCircle2, Loader2, QrCode, ScanFace, ShieldAlert, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usherPortal } from '../lib/api';
import { bookingQrValue, parseGateQrPayload } from '../lib/bookingQr';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { collectFaceProbeFromVideo, getFaceHuman } from '../lib/humanFace';
import { describeCameraError } from '../lib/cameraPermissions';

type Holder = {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  tickets: Array<{
    ticketId: number;
    gateIndex: number | null;
    status: string;
  }>;
  faceEnrolled: boolean;
};

type GateBoard = {
  myScansToday: number;
  scansLast15m: number;
  jamScore: number;
  recentActivity: Array<{
    success: boolean;
    ticketId: number | null;
    reason: string | null;
    createdAt: string;
    action: string;
  }>;
};

type Props = {
  eventMongoId: string;
  gateIndex: number;
  gateLabel: string;
  eventName: string;
  manualFallbackEnabled?: boolean;
};

function waitForVideoEl(videoRef: RefObject<HTMLVideoElement | null>) {
  return new Promise<HTMLVideoElement | null>((resolve) => {
    let attempts = 0;
    const max = 180;
    const tick = () => {
      const el = videoRef.current;
      if (el) resolve(el);
      else if (++attempts > max) resolve(null);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(() => requestAnimationFrame(tick));
  });
}

export function UsherGateCheckIn({
  eventMongoId,
  gateIndex,
  gateLabel,
  eventName,
  manualFallbackEnabled = false,
}: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5ScannerRef = useRef<{ stop: () => Promise<void>; clear?: () => void } | null>(null);
  const readerElId = useId().replace(/:/g, '');

  const [board, setBoard] = useState<GateBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [scanLine, setScanLine] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [manualPin, setManualPin] = useState('');
  const [result, setResult] = useState<'success' | 'wrongGate' | 'error' | null>(null);
  const [resultMessage, setResultMessage] = useState('');

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const data = await usherPortal.gateBoard(eventMongoId, gateIndex);
      setBoard({
        myScansToday: data.myScansToday,
        scansLast15m: data.scansLast15m,
        jamScore: data.jamScore,
        recentActivity: data.recentActivity || [],
      });
    } catch {
      setBoard(null);
    } finally {
      setBoardLoading(false);
    }
  }, [eventMongoId, gateIndex]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const resetSession = useCallback(() => {
    setHolders(null);
    setSelectedTicketId(null);
    setResult(null);
    setResultMessage('');
    setScanLine('');
    setManualReason('');
    setManualPin('');
    void loadBoard();
  }, [loadBoard]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, []);

  const performLookup = useCallback(
    async (body: { bookingCode?: string; ticketId?: number }) => {
      setLookupBusy(true);
      setHolders(null);
      setSelectedTicketId(null);
      setResult(null);
      try {
        const res = await usherPortal.lookupAttendee(eventMongoId, gateIndex, body);
        setHolders(res.holders || []);
        const allTickets = (res.holders || []).flatMap((h) => h.tickets);
        if (allTickets.length === 1) setSelectedTicketId(allTickets[0].ticketId);
      } catch (e) {
        setResult('error');
        setResultMessage(e instanceof Error ? e.message : t('usher.lookupFailed'));
      } finally {
        setLookupBusy(false);
      }
    },
    [eventMongoId, gateIndex, t],
  );

  useEffect(() => {
    if (!qrOpen) return;
    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (cancelled) return;
        const scanner = new Html5Qrcode(readerElId);
        html5ScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 280, height: 280 } },
          async (decodedText) => {
            const parsed = parseGateQrPayload(decodedText);
            if (!parsed) return;
            try {
              await scanner.stop();
              scanner.clear();
            } catch {
              /* ignore */
            }
            html5ScannerRef.current = null;
            setQrOpen(false);

            if (parsed.kind === 'booking') {
              await performLookup({ bookingCode: bookingQrValue(parsed.bookingId) });
            } else {
              await performLookup({ ticketId: parsed.ticketId });
            }
          },
          () => {},
        );
      } catch (e) {
        if (!cancelled) {
          setResult('error');
          setResultMessage(e instanceof Error ? e.message : t('usher.scannerFailed'));
          setQrOpen(false);
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      const s = html5ScannerRef.current;
      html5ScannerRef.current = null;
      void s?.stop().then(() => s.clear()).catch(() => {});
    };
  }, [qrOpen, readerElId, performLookup, t]);

  const selectedHolder = holders?.find((h) => h.tickets.some((tk) => tk.ticketId === selectedTicketId));
  const selectedTicket = selectedHolder?.tickets.find((tk) => tk.ticketId === selectedTicketId);

  const runFaceVerify = async () => {
    if (!selectedTicketId) return;
    if (!selectedHolder?.faceEnrolled) {
      setResult('error');
      setResultMessage(t('usher.noFaceId'));
      return;
    }

    setFaceBusy(true);
    setResult(null);
    setScanLine(t('usher.startingCamera'));
    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .catch((e) => {
        setResult('error');
        setResultMessage(describeCameraError(e));
        return null;
      });

    if (!stream) {
      setFaceBusy(false);
      setScanLine('');
      return;
    }
    streamRef.current = stream;
    const video = await waitForVideoEl(videoRef);
    if (!video) {
      stopCamera();
      setFaceBusy(false);
      setScanLine('');
      setResult('error');
      setResultMessage(t('usher.videoNotReady'));
      return;
    }
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play().catch(() => {});

    try {
      await getFaceHuman();
      setScanLine(t('usher.holdSteady'));
      const embedding = await collectFaceProbeFromVideo(video, {
        targetSamples: 6,
        maxMs: 28000,
        minQuality: 0.45,
        requireBlink: true,
        onLivenessStatus: setScanLine,
      });
      stopCamera();
      if (!embedding) {
        setResult('error');
        setResultMessage(t('usher.faceSamplesFailed'));
        return;
      }
      setScanLine(t('usher.verifying'));
      const res = await usherPortal.verifyWithFace(eventMongoId, gateIndex, {
        ticketId: selectedTicketId,
        embedding,
      });

      if (res.alreadyEntered) {
        setResult('error');
        setResultMessage(t('usher.alreadyEntered', { ticketId: res.ticketId }));
        return;
      }

      if (res.admitted) {
        setResult('success');
        setResultMessage(t('usher.admitSuccess', { ticketId: res.ticketId, gate: gateLabel }));
        return;
      }

      setResult('error');
      setResultMessage(res.message || t('usher.verifyFailed'));
    } catch (e) {
      stopCamera();
      const msg = e instanceof Error ? e.message : t('usher.verifyFailed');
      const wrongGate =
        msg.toLowerCase().includes('wrong gate') ||
        (e as { wrongGate?: boolean }).wrongGate === true;
      if (wrongGate) {
        setResult('wrongGate');
        setResultMessage(
          selectedTicket?.gateIndex != null
            ? t('usher.wrongGateDetail', {
                assigned: selectedTicket.gateIndex,
                current: gateIndex,
              })
            : msg,
        );
      } else {
        setResult('error');
        setResultMessage(msg);
      }
    } finally {
      setFaceBusy(false);
      setScanLine('');
    }
  };

  const runManualAdmit = async () => {
    if (!selectedTicketId) return;
    const reason = manualReason.trim();
    if (reason.length < 3) {
      setResult('error');
      setResultMessage(t('usher.manualReasonRequired'));
      return;
    }
    setManualBusy(true);
    setResult(null);
    try {
      const res = await usherPortal.verifyManual(eventMongoId, gateIndex, {
        ticketId: selectedTicketId,
        reason,
        pin: manualPin.trim() || undefined,
      });
      setManualOpen(false);
      if (res.alreadyEntered) {
        setResult('error');
        setResultMessage(t('usher.alreadyEntered', { ticketId: res.ticketId }));
        return;
      }
      if (res.admitted) {
        setResult('success');
        setResultMessage(t('usher.manualAdmitSuccess', { ticketId: res.ticketId, gate: gateLabel }));
        return;
      }
      setResult('error');
      setResultMessage(res.message || t('usher.verifyFailed'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('usher.verifyFailed');
      const wrongGate = msg.toLowerCase().includes('wrong gate');
      if (wrongGate) {
        setResult('wrongGate');
        setResultMessage(msg);
      } else {
        setResult('error');
        setResultMessage(msg);
      }
    } finally {
      setManualBusy(false);
    }
  };

  if (result === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-6 touch-manipulation">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <div>
          <h2 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{t('usher.confirmEntry')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{resultMessage}</p>
        </div>
        <Button type="button" size="lg" className="w-full h-14 gap-2 text-base" onClick={resetSession}>
          <QrCode className="h-5 w-5" />
          {t('usher.scanNext')}
        </Button>
      </div>
    );
  }

  if (result === 'wrongGate') {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center space-y-6 touch-manipulation">
        <XCircle className="mx-auto h-16 w-16 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold text-destructive">{t('usher.denyEntry')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{resultMessage}</p>
          <p className="mt-3 text-sm font-medium text-destructive">{t('usher.doNotAdmit')}</p>
        </div>
        <Button type="button" size="lg" variant="outline" className="w-full h-14 gap-2 text-base" onClick={resetSession}>
          <QrCode className="h-5 w-5" />
          {t('usher.scanNext')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5 touch-manipulation">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{eventName}</p>
        <h2 className="text-lg font-semibold">
          {gateLabel} · {t('usher.gateIndex', { index: gateIndex })}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('usher.scanHint')}</p>
      </div>

      {!boardLoading && board && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border bg-muted/20 px-2 py-3">
            <p className="text-lg font-semibold">{board.myScansToday}</p>
            <p className="text-[10px] uppercase text-muted-foreground">{t('usher.boardToday')}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 px-2 py-3">
            <p className="text-lg font-semibold">{board.scansLast15m}</p>
            <p className="text-[10px] uppercase text-muted-foreground">{t('usher.board15m')}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 px-2 py-3">
            <p className="text-lg font-semibold">{board.jamScore}</p>
            <p className="text-[10px] uppercase text-muted-foreground">{t('usher.boardJam')}</p>
          </div>
        </div>
      )}

      {board?.recentActivity?.length ? (
        <div className="rounded-xl border border-border bg-muted/10 px-3 py-2 space-y-1">
          <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            {t('usher.recentScans')}
          </p>
          <ul className="text-xs space-y-1">
            {board.recentActivity.slice(0, 3).map((row, i) => (
              <li key={i} className={row.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                #{row.ticketId ?? '—'} · {row.success ? t('usher.scanOk') : row.reason || t('usher.scanFail')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('usher.scanQrTitle')}</DialogTitle>
            <DialogDescription>{t('usher.scanQrDesc')}</DialogDescription>
          </DialogHeader>
          <div id={readerElId} className="min-h-[280px] w-full rounded-lg overflow-hidden bg-black/80" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQrOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('usher.manualAdmitTitle')}</DialogTitle>
            <DialogDescription>{t('usher.manualAdmitDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('usher.manualReason')}</Label>
              <Input
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder={t('usher.manualReasonPlaceholder')}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('usher.manualPin')}</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={manualPin}
                onChange={(e) => setManualPin(e.target.value)}
                placeholder={t('usher.manualPinPlaceholder')}
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={manualBusy} onClick={() => void runManualAdmit()}>
              {manualBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('usher.manualAdmitConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result === 'error' && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex gap-2">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{resultMessage}</span>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full h-14 gap-2 text-base bg-gradient-to-r from-primary to-secondary"
        disabled={lookupBusy || faceBusy}
        onClick={() => setQrOpen(true)}
      >
        <QrCode className="h-5 w-5" />
        {t('usher.scanQr')}
      </Button>

      {holders && holders.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
          {holders.map((h) => {
            const displayName = [h.firstName, h.lastName].filter(Boolean).join(' ') || h.username || 'Guest';
            return (
              <div key={h.userId} className="space-y-2 text-sm">
                <p className="font-semibold">{displayName}</p>
                <ul className="space-y-2">
                  {h.tickets.map((tk) => (
                    <li key={tk.ticketId}>
                      <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-border bg-background/80 px-3 py-3 min-h-[48px]">
                        <input
                          type="radio"
                          name="usher-ticket"
                          className="mt-1"
                          checked={selectedTicketId === tk.ticketId}
                          onChange={() => setSelectedTicketId(tk.ticketId)}
                        />
                        <span>
                          <span className="font-mono font-medium">#{tk.ticketId}</span>
                          <span className="text-muted-foreground block text-xs">
                            {t('usher.assignedGate', { gate: tk.gateIndex ?? '—' })} · {tk.status}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <video ref={videoRef} className="hidden" playsInline muted />
          {scanLine && (
            <p className="text-sm text-primary flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {scanLine}
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="w-full h-14 gap-2 text-base"
            disabled={faceBusy || !selectedTicketId}
            onClick={() => void runFaceVerify()}
          >
            {faceBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanFace className="h-5 w-5" />}
            {t('usher.verifyFace')}
          </Button>
          {manualFallbackEnabled && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full h-12 gap-2"
              disabled={!selectedTicketId}
              onClick={() => setManualOpen(true)}
            >
              <ShieldAlert className="h-5 w-5" />
              {t('usher.manualAdmit')}
            </Button>
          )}
        </div>
      )}

      {lookupBusy && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('usher.loadingGuest')}
        </p>
      )}
    </div>
  );
}
