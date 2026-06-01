import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, DoorOpen, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { entry as entryApi, events as eventsApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { GateAttendeeCheckIn } from '../components/GateAttendeeCheckIn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export function OrganizerEntryStaffTools() {
  const { eventMongoId = '' } = useParams<{ eventMongoId: string }>();
  const [eventName, setEventName] = useState<string>('');
  const [gatingOn, setGatingOn] = useState<boolean | null>(null);
  const [board, setBoard] = useState<Awaited<ReturnType<typeof entryApi.board>> | null>(null);
  const [jamDraft, setJamDraft] = useState<Record<number, number>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [verifyGate, setVerifyGate] = useState(1);
  const [verifyTicket, setVerifyTicket] = useState('');
  const [verifyStrictFace, setVerifyStrictFace] = useState(false);
  const [verifyNationalId, setVerifyNationalId] = useState('');
  const [lastVerifyOk, setLastVerifyOk] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<Awaited<ReturnType<typeof entryApi.auditList>>['items']>([]);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    if (!eventMongoId) return;
    setAuditErr(null);
    try {
      const r = await entryApi.auditList(eventMongoId, { limit: 40 });
      setAuditItems(r.items || []);
    } catch (e) {
      setAuditItems([]);
      setAuditErr(e instanceof Error ? e.message : 'Could not load audit log');
    }
  }, [eventMongoId]);

  const loadBoard = useCallback(async () => {
    if (!eventMongoId) return;
    setLoadErr(null);
    try {
      const b = await entryApi.board(eventMongoId);
      setBoard(b);
      const next: Record<number, number> = {};
      for (const g of b.gates ?? []) {
        next[g.gateIndex] = Math.min(100, Math.max(0, Number(g.jamScore) || 0));
      }
      setJamDraft(next);
    } catch (e) {
      setBoard(null);
      setLoadErr(e instanceof Error ? e.message : 'Could not load entry board');
    }
  }, [eventMongoId]);

  useEffect(() => {
    if (!eventMongoId) return;
    let cancelled = false;
    eventsApi
      .get(eventMongoId)
      .then((ev) => {
        if (cancelled) return;
        setEventName(ev.Name ?? 'Event');
        setGatingOn(Boolean(ev.entryGatingEnabled));
      })
      .catch(() => {
        if (!cancelled) {
          setEventName('');
          setGatingOn(null);
        }
      });
    void loadBoard();
    void loadAudit();
    return () => {
      cancelled = true;
    };
  }, [eventMongoId, loadBoard, loadAudit]);

  useEffect(() => {
    if (!board?.gates?.length) return;
    setVerifyGate((prev) => {
      if (board.gates.some((g) => g.gateIndex === prev)) return prev;
      return board.gates[0].gateIndex;
    });
  }, [board]);

  const applyJam = async (gateIndex: number) => {
    const jamScore = jamDraft[gateIndex] ?? 0;
    setBusy(`jam-${gateIndex}`);
    try {
      await entryApi.setJam(eventMongoId, gateIndex, { jamScore });
      toast.success(`Gate ${gateIndex}: crowd level ${jamScore}`);
      await loadBoard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update jam');
    } finally {
      setBusy(null);
    }
  };

  const runVerify = async () => {
    const tid = Number(verifyTicket.trim());
    if (!tid) {
      toast.error('Enter a numeric ticket ID');
      return;
    }
    setBusy('verify');
    setLastVerifyOk(null);
    try {
      const res = await entryApi.verify(eventMongoId, verifyGate, {
        ticketId: tid,
        strictFace: verifyStrictFace,
        ...(verifyNationalId.trim() && { nationalId: verifyNationalId.trim() }),
      });
      const suffix = res.holderNationalIdSuffix ? ` · ID …${res.holderNationalIdSuffix}` : '';
      if (res.alreadyEntered) {
        const msg = `Ticket ${res.ticketId} was already marked entered.`;
        setLastVerifyOk(msg);
        toast.message('Already entered', { description: msg });
      } else {
        const msg = `Ticket ${res.ticketId} admitted at gate ${res.gateIndex}${suffix}`;
        setLastVerifyOk(msg);
        toast.success('Entry recorded');
      }
      setVerifyTicket('');
      await loadBoard();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verify failed';
      setLastVerifyOk(null);
      toast.error(msg);
    } finally {
      setBusy(null);
      void loadAudit();
    }
  };

  if (!eventMongoId) {
    return (
      <div className="admin-dashboard max-w-lg mx-auto text-center text-muted-foreground text-sm space-y-4">
        Missing event in URL.
        <div>
          <Button asChild variant="outline" size="sm">
            <Link to="/creator/entry">Gate tools home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/creator/entry">
            <ArrowLeft className="w-4 h-4" />
            All gated events
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight truncate">{eventName || 'Loading…'}</p>
          {gatingOn === false && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Crowd entry is not enabled for this event yet. Finish setup on the creator dashboard.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="gap-2 shrink-0"
          disabled={busy !== null}
          onClick={() => {
            void loadBoard();
            void loadAudit();
          }}
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </Button>
      </div>

      {loadErr && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm">
          {loadErr}
        </div>
      )}

      <section className="admin-panel lg-card p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recent gate audit</h2>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void loadAudit()}>
            Reload log
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Append-only record of assignments, redirects, jam updates, and gate verifications for this event.
        </p>
        {auditErr && (
          <p className="text-sm text-destructive">{auditErr}</p>
        )}
        {!auditErr && auditItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No audit rows yet.</p>
        )}
        {auditItems.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border max-h-72 overflow-y-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-[1]">
                <tr className="border-b border-border">
                  <th className="p-2 font-medium">Time</th>
                  <th className="p-2 font-medium">Action</th>
                  <th className="p-2 font-medium">OK</th>
                  <th className="p-2 font-medium">Ticket</th>
                  <th className="p-2 font-medium">Gate</th>
                  <th className="p-2 font-medium">Reason / note</th>
                </tr>
              </thead>
              <tbody>
                {auditItems.map((row) => (
                  <tr key={row._id} className="border-b border-border/80 hover:bg-muted/30">
                    <td className="p-2 whitespace-nowrap tabular-nums text-muted-foreground">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="p-2 font-mono">{row.action}</td>
                    <td className="p-2">{row.success ? 'yes' : 'no'}</td>
                    <td className="p-2 tabular-nums">{row.ticketId ?? '—'}</td>
                    <td className="p-2 tabular-nums">{row.gateIndex ?? '—'}</td>
                    <td className="p-2 max-w-[200px] truncate" title={row.reason || ''}>
                      {row.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {board && board.gates?.length > 0 && (
        <>
        <GateAttendeeCheckIn
          eventMongoId={eventMongoId}
          gateIndex={verifyGate}
          disabled={busy !== null}
          onVerified={() => {
            void loadBoard();
            void loadAudit();
          }}
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="admin-panel lg-card p-5 sm:p-6 space-y-5">
            <h2 className="text-lg font-semibold">Crowd level by gate</h2>
            <p className="text-sm text-muted-foreground">
              Higher values steer new assignments away from crowded gates. Tap Apply after adjusting.
            </p>
            <ul className="space-y-6">
              {board.gates.map((g) => {
                const stats = board.perGate[String(g.gateIndex)] ?? { assigned: 0, used: 0 };
                const val = jamDraft[g.gateIndex] ?? 0;
                return (
                  <li key={g.gateIndex} className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{g.label ?? `Gate ${g.gateIndex}`}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        In queue {stats.assigned} · Through {stats.used}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[val]}
                        onValueChange={(v) =>
                          setJamDraft((prev) => ({ ...prev, [g.gateIndex]: v[0] ?? 0 }))
                        }
                        className="flex-1 py-2"
                      />
                      <span className="text-xl font-semibold tabular-nums w-12 text-right">{val}</span>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={busy !== null}
                      onClick={() => void applyJam(g.gateIndex)}
                    >
                      {busy === `jam-${g.gateIndex}` ? 'Saving…' : 'Apply jam level'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="admin-panel lg-card p-5 sm:p-6 space-y-5">
            <h2 className="text-lg font-semibold">Manual check-in</h2>
            <p className="text-sm text-muted-foreground">
              Confirm name and phone with the guest, then enter ticket ID. Optional national ID check. This path does not
              compare live Face ID — use <strong>Guest lookup &amp; Face ID entry</strong> above for camera match.
            </p>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Gate</span>
              <Select
                value={String(verifyGate)}
                onValueChange={(v) => setVerifyGate(Number(v))}
              >
                <SelectTrigger className="input-cosmic w-full min-h-[48px] text-lg py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(board.gates ?? []).map((g) => (
                    <SelectItem key={g.gateIndex} value={String(g.gateIndex)}>
                      {g.label ?? `Gate ${g.gateIndex}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Ticket ID</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 10042"
                className="input-cosmic w-full text-2xl py-4 font-mono tracking-wide"
                value={verifyTicket}
                onChange={(e) => setVerifyTicket(e.target.value)}
              />
            </label>

            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={verifyStrictFace}
                onChange={(e) => setVerifyStrictFace(e.target.checked)}
                className="size-5 rounded border-border"
              />
              Require Face ID on profile (strict)
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Optional national ID match</span>
              <input
                className="input-cosmic w-full py-3"
                value={verifyNationalId}
                onChange={(e) => setVerifyNationalId(e.target.value)}
                placeholder="Compare to holder profile"
              />
            </label>

            {lastVerifyOk && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-foreground">
                {lastVerifyOk}
              </div>
            )}

            <Button
              type="button"
              size="lg"
              className="w-full text-lg py-7 bg-gradient-to-r from-primary to-secondary"
              disabled={busy !== null}
              onClick={() => void runVerify()}
            >
              {busy === 'verify' ? 'Checking…' : 'Mark entered'}
            </Button>
          </section>
        </div>
        </>
      )}

      {board && (!board.gates || board.gates.length === 0) && !loadErr && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No gates found. Run crowd entry setup from the creator dashboard.
        </p>
      )}
    </div>
  );
}
