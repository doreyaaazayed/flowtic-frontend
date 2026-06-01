import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Loader2, QrCode, ScanFace, UserSearch } from 'lucide-react';
import { toast } from 'sonner';
import { entry as entryApi } from '../lib/api';
import { bookingQrValue, parseGateQrPayload } from '../lib/bookingQr';
import { Button } from './ui/button';
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
  phone?: string;
  email?: string;
  faceEnrolled: boolean;
  tickets: Array<{
    ticketId: number;
    gateIndex: number | null;
    slotIndex: number | null;
    windowStart: string | null;
    windowEnd: string | null;
    status: string;
  }>;
};

type LookupBody = {
  bookingCode?: string;
  ticketId?: number;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

type Props = {
  eventMongoId: string;
  gateIndex: number;
  disabled?: boolean;
  onVerified: () => void;
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

export function GateAttendeeCheckIn({ eventMongoId, gateIndex, disabled, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5ScannerRef = useRef<{ stop: () => Promise<void>; clear?: () => void } | null>(null);
  const readerElId = useId().replace(/:/g, '');

  const [bookingCode, setBookingCode] = useState('');
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [scanLine, setScanLine] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, []);

  const performLookup = useCallback(
    async (body: LookupBody) => {
      setLookupBusy(true);
      setHolders(null);
      setSelectedTicketId(null);
      try {
        const res = await entryApi.lookupAttendee(eventMongoId, body);
        setHolders(res.holders || []);
        const allTickets = (res.holders || []).flatMap((h) => h.tickets);
        if (allTickets.length === 1) setSelectedTicketId(allTickets[0].ticketId);
        toast.success('Attendee loaded');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Lookup failed');
      } finally {
        setLookupBusy(false);
      }
    },
    [eventMongoId],
  );

  const runLookup = async () => {
    const tid = Number(String(ticketIdInput).trim());
    const body: LookupBody = {};
    if (tid) body.ticketId = tid;
    else if (bookingCode.trim()) body.bookingCode = bookingCode.trim();
    else if (phone.trim()) {
      body.phone = phone.trim();
      if (firstName.trim()) body.firstName = firstName.trim();
      if (lastName.trim()) body.lastName = lastName.trim();
    } else {
      toast.error('Enter ticket ID, booking QR text, or phone number.');
      return;
    }
    await performLookup(body);
  };

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
            if (!parsed) {
              toast.error('Unrecognized QR. Use FlowTic booking code or numeric ticket ID.');
              return;
            }
            try {
              await scanner.stop();
              scanner.clear();
            } catch (_) {
              /* ignore */
            }
            html5ScannerRef.current = null;
            setQrOpen(false);

            if (parsed.kind === 'booking') {
              const code = bookingQrValue(parsed.bookingId);
              setBookingCode(code);
              setTicketIdInput('');
              setPhone('');
              setFirstName('');
              setLastName('');
              await performLookup({ bookingCode: code });
            } else {
              setTicketIdInput(String(parsed.ticketId));
              setBookingCode('');
              setPhone('');
              setFirstName('');
              setLastName('');
              await performLookup({ ticketId: parsed.ticketId });
            }
          },
          () => {},
        );
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Camera or scanner failed');
          setQrOpen(false);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      const s = html5ScannerRef.current as import('html5-qrcode').Html5Qrcode | null;
      html5ScannerRef.current = null;
      void s
        ?.stop()
        .then(() => s.clear())
        .catch(() => {});
    };
  }, [qrOpen, readerElId, performLookup]);

  const selectedHolder = holders?.find((h) => h.tickets.some((t) => t.ticketId === selectedTicketId));

  const runFaceVerify = async () => {
    if (!selectedTicketId) {
      toast.error('Select a ticket');
      return;
    }
    if (!selectedHolder?.faceEnrolled) {
      toast.error('This guest has no Face ID on file. Use manual check-in or ask them to enroll in the app.');
      return;
    }

    setFaceBusy(true);
    setScanLine('Starting camera…');
    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .catch((e) => {
        toast.error(describeCameraError(e));
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
      toast.error('Video not ready');
      return;
    }
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play().catch(() => {});

    setScanLine('Loading face models…');
    try {
      await getFaceHuman();
      setScanLine('Hold the guest steady in frame…');
      const embedding = await collectFaceProbeFromVideo(video, {
        targetSamples: 6,
        maxMs: 28000,
        minQuality: 0.45,
        requireBlink: true,
        onLivenessStatus: setScanLine,
      });
      stopCamera();
      if (!embedding) {
        toast.error('Not enough clear face samples. Use even lighting and try again.');
        return;
      }
      setScanLine('Verifying with server…');
      const res = await entryApi.verifyWithFace(eventMongoId, gateIndex, {
        ticketId: selectedTicketId,
        embedding,
      });
      if (res.alreadyEntered) {
        toast.message('Already marked entered', { description: `Ticket ${res.ticketId}` });
      } else {
        toast.success(`Admitted — ticket ${res.ticketId} (face match)`);
      }
      onVerified();
    } catch (e) {
      stopCamera();
      const msg = e instanceof Error ? e.message : 'Verification failed';
      toast.error(msg);
    } finally {
      setFaceBusy(false);
      setScanLine('');
    }
  };

  return (
    <section className="cosmic-panel rounded-2xl p-6 space-y-5 border border-primary/10">
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan booking or ticket QR</DialogTitle>
            <DialogDescription>
              Point the camera at <code className="text-xs bg-muted px-1 rounded">FLOWTIC-B-…</code> or a numeric
              ticket barcode. We stop after the first valid read.
            </DialogDescription>
          </DialogHeader>
          <div id={readerElId} className="min-h-[280px] w-full rounded-lg overflow-hidden bg-black/80" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQrOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <UserSearch className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Guest lookup & Face ID entry</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Load the guest by ticket ID, booking QR (<code className="text-xs bg-muted px-1 rounded">FLOWTIC-B-…</code>
            ), phone (+ optional name), or camera scan. Face scan is optional unless you use strict manual mode — guests
            without Face ID can still be checked in manually.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          disabled={disabled || lookupBusy}
          onClick={() => setQrOpen(true)}
        >
          <QrCode className="w-4 h-4" />
          Scan QR (camera)
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Booking QR (paste scanned text)</span>
          <input
            className="input-cosmic w-full font-mono text-sm"
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            placeholder="FLOWTIC-B-12345"
            disabled={disabled || lookupBusy}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Or ticket ID</span>
          <input
            className="input-cosmic w-full text-lg font-mono"
            inputMode="numeric"
            value={ticketIdInput}
            onChange={(e) => setTicketIdInput(e.target.value)}
            placeholder="Numeric"
            disabled={disabled || lookupBusy}
          />
        </label>
        <label className="block space-y-1 text-sm md:col-span-2">
          <span className="text-muted-foreground">Or phone + optional name (if multiple accounts match, add name)</span>
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              className="input-cosmic flex-1 min-w-[140px]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile"
              disabled={disabled || lookupBusy}
            />
            <input
              className="input-cosmic w-32"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First"
              disabled={disabled || lookupBusy}
            />
            <input
              className="input-cosmic w-32"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last"
              disabled={disabled || lookupBusy}
            />
          </div>
        </label>
      </div>

      <Button type="button" disabled={disabled || lookupBusy} onClick={() => void runLookup()} className="gap-2">
        {lookupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserSearch className="w-4 h-4" />}
        Look up guest
      </Button>

      {holders && holders.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
          <h3 className="font-medium text-sm">Guest on file</h3>
          {holders.map((h) => {
            const displayName = [h.firstName, h.lastName].filter(Boolean).join(' ') || h.username || 'Guest';
            return (
              <div key={h.userId} className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">{displayName}</p>
                <p className="text-muted-foreground">
                  Phone: {h.phone || '—'} · Email: {h.email || '—'}
                </p>
                <p className={h.faceEnrolled ? 'text-primary text-xs font-medium' : 'text-amber-700 dark:text-amber-300 text-xs'}>
                  Face ID: {h.faceEnrolled ? 'enrolled' : 'not enrolled — use manual check-in'}
                </p>
                <ul className="space-y-2 mt-2">
                  {h.tickets.map((t) => (
                    <li key={t.ticketId}>
                      <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-border bg-background/80 px-3 py-2">
                        <input
                          type="radio"
                          name="gate-ticket-pick"
                          className="mt-1"
                          checked={selectedTicketId === t.ticketId}
                          onChange={() => setSelectedTicketId(t.ticketId)}
                        />
                        <span>
                          <span className="font-mono font-medium">Ticket #{t.ticketId}</span>
                          <span className="text-muted-foreground block text-xs">
                            Gate {t.gateIndex ?? '—'} · Slot {t.slotIndex ?? '—'} · {t.status}
                          </span>
                          {t.windowStart && t.windowEnd && (
                            <span className="text-xs block mt-0.5">
                              {new Date(t.windowStart).toLocaleString()} — {new Date(t.windowEnd).toLocaleString()}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground">
              Gate selected in this page must match the guest&apos;s assigned gate for entry to succeed.
            </p>
            <video ref={videoRef} className="hidden" playsInline muted />
            {scanLine && (
              <p className="text-sm text-primary flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                {scanLine}
              </p>
            )}
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-primary to-secondary"
              disabled={disabled || faceBusy || !selectedTicketId}
              onClick={() => void runFaceVerify()}
            >
              {faceBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanFace className="w-5 h-5" />}
              Capture face & verify entry
            </Button>
          </div>
        </div>
      )}

      {holders && holders.length === 0 && (
        <p className="text-sm text-muted-foreground">No matching guest for this event.</p>
      )}
    </section>
  );
}
