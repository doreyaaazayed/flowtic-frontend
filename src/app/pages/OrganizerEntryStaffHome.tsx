import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { events as eventsApi } from '../lib/api';
import { Button } from '../components/ui/button';

export function OrganizerEntryStaffHome() {
  const [rows, setRows] = useState<
    Array<{ _id: string; Name: string; StartDate: string; entryGatingEnabled?: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    eventsApi
      .my()
      .then((list) => {
        if (cancelled) return;
        const gated = Array.isArray(list)
          ? list.filter((e) => e.entryGatingEnabled).sort((a, b) => a.Name.localeCompare(b.Name))
          : [];
        setRows(gated);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load events');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-dashboard max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Pick an event with crowd entry enabled. Use this view on a tablet at the gate for jam levels and ticket
        check-in.
      </p>

      {loading && <p className="text-muted-foreground text-sm">Loading your events…</p>}
      {err && <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</div>}

      {!loading && !err && rows.length === 0 && (
        <div className="admin-panel lg-card p-8 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            No events have crowd entry turned on yet. Open an event on your creator dashboard, expand{' '}
            <span className="font-medium text-foreground">crowd entry</span>, and run setup first.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/creator">Back to dashboard</Link>
          </Button>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((ev) => (
            <li key={ev._id}>
              <Link
                to={`/creator/entry/${ev._id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{ev.Name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(ev.StartDate).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-medium text-primary shrink-0">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
