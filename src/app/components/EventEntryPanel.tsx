import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { DoorOpen, RefreshCw, Users } from "lucide-react";
import { Button } from "./ui/button";
import { entry as entryApi } from "../lib/api";

type Props = {
  eventMongoId: string;
  eventName: string;
  sold: number;
  entryGatingEnabled?: boolean;
  onSetupComplete?: () => void;
};

export function EventEntryPanel({ eventMongoId, eventName, sold, entryGatingEnabled, onSetupComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState<Awaited<ReturnType<typeof entryApi.board>> | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [gateCount, setGateCount] = useState(12);
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [slotCount, setSlotCount] = useState(32);
  const [hoursBeforeStart, setHoursBeforeStart] = useState(8);

  const [verifyGate, setVerifyGate] = useState(1);
  const [verifyTicket, setVerifyTicket] = useState("");
  const [verifyStrictFace, setVerifyStrictFace] = useState(false);
  const [verifyNationalId, setVerifyNationalId] = useState("");

  const [redirectTickets, setRedirectTickets] = useState("");
  const [redirectGate, setRedirectGate] = useState(1);
  const [redirectSlot, setRedirectSlot] = useState("");

  const loadBoard = useCallback(async () => {
    setLoadErr(null);
    try {
      const b = await entryApi.board(eventMongoId);
      setBoard(b);
    } catch (e) {
      setBoard(null);
      setLoadErr(e instanceof Error ? e.message : "Could not load entry board");
    }
  }, [eventMongoId]);

  const runSetup = async () => {
    setBusy("setup");
    setLoadErr(null);
    try {
      await entryApi.setup(eventMongoId, { gateCount, slotMinutes, slotCount, hoursBeforeStart });
      await loadBoard();
      onSetupComplete?.();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(null);
    }
  };

  const runAssign = async (replaceAll: boolean) => {
    if (replaceAll) {
      const ok = window.confirm(
        "Replace ALL current gate and time assignments and re-run automatic assignment for every sold ticket? Attendees will be emailed and notified again.",
      );
      if (!ok) return;
    }
    setBusy("assign");
    setLoadErr(null);
    try {
      await entryApi.assign(eventMongoId, { replaceAll });
      await loadBoard();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(null);
    }
  };

  const applyJam = async (gateIndex: number, jamScore: number) => {
    setBusy(`jam-${gateIndex}`);
    try {
      await entryApi.setJam(eventMongoId, gateIndex, { jamScore });
      await loadBoard();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Jam update failed");
    } finally {
      setBusy(null);
    }
  };

  const runVerify = async () => {
    const tid = Number(verifyTicket);
    if (!tid) {
      setLoadErr("Enter a numeric ticket ID to verify.");
      return;
    }
    setBusy("verify");
    setLoadErr(null);
    try {
      await entryApi.verify(eventMongoId, verifyGate, {
        ticketId: tid,
        strictFace: verifyStrictFace,
        ...(verifyNationalId.trim() && { nationalId: verifyNationalId.trim() }),
      });
      await loadBoard();
      setVerifyTicket("");
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setBusy(null);
    }
  };

  const runRedirect = async () => {
    const ids = redirectTickets
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (!ids.length) {
      setLoadErr("Enter one or more ticket IDs (comma or space separated).");
      return;
    }
    setBusy("redirect");
    setLoadErr(null);
    try {
      await entryApi.organizerRedirect(eventMongoId, {
        ticketIds: ids,
        toGateIndex: redirectGate,
        toSlotIndex: redirectSlot.trim() === "" ? undefined : Number(redirectSlot),
      });
      await loadBoard();
      setRedirectTickets("");
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Redirect failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void loadBoard();
        }}
      >
        <DoorOpen className="w-4 h-4" />
        {open ? "Hide" : "Show"} crowd entry (gates & slots)
        {entryGatingEnabled ? (
          <span className="text-xs font-normal text-muted-foreground">— configured</span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">— not set up</span>
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-6 rounded-xl bg-muted/20 p-4 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{eventName}</span> — sold tickets: {sold}. Configure gates and
            time windows, run assignment, then use this board at the venue. Gate staff should be logged in as an approved
            organizer to scan tickets.
          </p>
          {entryGatingEnabled && (
            <p>
              <Link
                to={`/creator/entry/${eventMongoId}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
              >
                Open full-screen gate tools (tablet)
              </Link>
            </p>
          )}

          {loadErr && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">{loadErr}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">1. Setup infrastructure</h4>
              <p className="text-xs text-muted-foreground">Creates gates and slots (clears previous entry data for this event).</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2">
                  <span className="text-xs text-muted-foreground">Gates</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="input-cosmic w-full mt-0.5"
                    value={gateCount}
                    onChange={(e) => setGateCount(Number(e.target.value))}
                  />
                </label>
                <label>
                  <span className="text-xs text-muted-foreground">Slot length (min)</span>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    className="input-cosmic w-full mt-0.5"
                    value={slotMinutes}
                    onChange={(e) => setSlotMinutes(Number(e.target.value))}
                  />
                </label>
                <label>
                  <span className="text-xs text-muted-foreground">Slot count</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    className="input-cosmic w-full mt-0.5"
                    value={slotCount}
                    onChange={(e) => setSlotCount(Number(e.target.value))}
                  />
                </label>
                <label className="col-span-2">
                  <span className="text-xs text-muted-foreground">Hours before event start (first window)</span>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    className="input-cosmic w-full mt-0.5"
                    value={hoursBeforeStart}
                    onChange={(e) => setHoursBeforeStart(Number(e.target.value))}
                  />
                </label>
              </div>
              <Button type="button" size="sm" disabled={busy !== null} onClick={() => void runSetup()}>
                {busy === "setup" ? "Setting up…" : "Run setup"}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">2. Automatic assignment</h4>
              <p className="text-xs text-muted-foreground">
                Runs the slot algorithm for sold tickets. For individual moves, use <strong>Organizer redirect</strong> in
                the live board below (manual).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => void runAssign(false)}
                >
                  {busy === "assign" ? "Assigning…" : "Assign new tickets only"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void runAssign(true)}
                >
                  Replace all &amp; re-assign everyone
                </Button>
              </div>
              <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => void loadBoard()}>
                <RefreshCw className="w-3 h-3 mr-1 inline" />
                Refresh board
              </Button>
            </div>
          </div>

          {board && board.gates?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4" />
                Live board
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="p-2">Gate</th>
                      <th className="p-2">Jam (0–100)</th>
                      <th className="p-2">Assigned</th>
                      <th className="p-2">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.gates.map((g) => {
                      const stats = board.perGate[String(g.gateIndex)] ?? { assigned: 0, used: 0 };
                      return (
                        <tr key={g.gateIndex} className="border-t border-border">
                          <td className="p-2 font-medium">{g.label ?? `Gate ${g.gateIndex}`}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <input
                                key={`jam-${g.gateIndex}-${g.jamScore ?? 0}`}
                                id={`jam-input-${eventMongoId}-${g.gateIndex}`}
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={g.jamScore ?? 0}
                                className="input-cosmic w-14 px-1 py-0.5 text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                disabled={busy !== null}
                                onClick={() => {
                                  const el = document.getElementById(
                                    `jam-input-${eventMongoId}-${g.gateIndex}`,
                                  ) as HTMLInputElement | null;
                                  const v = Math.min(100, Math.max(0, Number(el?.value)));
                                  void applyJam(g.gateIndex, v);
                                }}
                              >
                                Set
                              </Button>
                            </div>
                          </td>
                          <td className="p-2">{stats.assigned}</td>
                          <td className="p-2">{stats.used}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <h5 className="font-medium">Scan at gate</h5>
                  <label>
                    <span className="text-xs text-muted-foreground">Gate index</span>
                    <input
                      type="number"
                      min={1}
                      className="input-cosmic w-full mt-0.5"
                      value={verifyGate}
                      onChange={(e) => setVerifyGate(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <span className="text-xs text-muted-foreground">Ticket ID</span>
                    <input
                      className="input-cosmic w-full mt-0.5"
                      value={verifyTicket}
                      onChange={(e) => setVerifyTicket(e.target.value)}
                      placeholder="Numeric ticket ID"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={verifyStrictFace} onChange={(e) => setVerifyStrictFace(e.target.checked)} />
                    Require Face ID enrollment on profile
                  </label>
                  <label>
                    <span className="text-xs text-muted-foreground">Optional national ID check</span>
                    <input
                      className="input-cosmic w-full mt-0.5"
                      value={verifyNationalId}
                      onChange={(e) => setVerifyNationalId(e.target.value)}
                      placeholder="Compare to holder profile"
                    />
                  </label>
                  <Button type="button" size="sm" disabled={busy !== null} onClick={() => void runVerify()}>
                    {busy === "verify" ? "Verifying…" : "Mark entered"}
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border border-border p-3">
                  <h5 className="font-medium">Organizer redirect</h5>
                  <label>
                    <span className="text-xs text-muted-foreground">Ticket IDs</span>
                    <textarea
                      className="input-cosmic w-full mt-0.5 min-h-[72px] font-mono text-xs"
                      value={redirectTickets}
                      onChange={(e) => setRedirectTickets(e.target.value)}
                      placeholder="Comma or newline separated"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-xs text-muted-foreground">To gate</span>
                      <input
                        type="number"
                        min={1}
                        className="input-cosmic w-full mt-0.5"
                        value={redirectGate}
                        onChange={(e) => setRedirectGate(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      <span className="text-xs text-muted-foreground">Slot index (optional)</span>
                      <input
                        className="input-cosmic w-full mt-0.5"
                        value={redirectSlot}
                        onChange={(e) => setRedirectSlot(e.target.value)}
                        placeholder="Leave empty to keep slot"
                      />
                    </label>
                  </div>
                  <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => void runRedirect()}>
                    {busy === "redirect" ? "Updating…" : "Apply redirect"}
                  </Button>
                </div>
              </div>

              {board.slots?.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">Slot windows ({board.slots.length})</summary>
                  <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 font-mono">
                    {board.slots.slice(0, 48).map((s) => (
                      <li key={s.slotIndex}>
                        #{s.slotIndex} {new Date(s.windowStart).toLocaleString()} – {new Date(s.windowEnd).toLocaleString()}
                      </li>
                    ))}
                    {board.slots.length > 48 && <li>…</li>}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
