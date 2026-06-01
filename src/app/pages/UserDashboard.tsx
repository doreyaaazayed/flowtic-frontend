import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { QrCode, Calendar, ShoppingBag, Ticket, Sparkles, ArrowRight, RefreshCw, Download, DoorOpen, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  bookings as bookingsApi,
  profile as profileApi,
  getToken,
  resale as resaleApi,
  entry as entryApi,
  notifications as notificationsApi,
} from '../lib/api';
import { openNotification } from '../lib/notificationNavigation';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StatValue } from '../components/redesign/StatValue';
import { SavedCardsWalletTab } from '../components/SavedCardsWalletTab';
import { bookingQrValue, downloadBrandedBookingTicketPng } from '../lib/bookingQr';
import { refreshNotifications, subscribeNotifications } from '../lib/notificationStore';
import { TicketQrBlock } from '../components/booking/TicketQrBlock';
import { LoyaltyRewardsPanel } from '../components/LoyaltyRewardsPanel';
import { parseUserSection, useUserSection } from '../context/UserSectionContext';
import { UserProfilePanel } from '../components/UserProfilePanel';
import { FoodOrdersPanel } from '../components/food/FoodOrdersPanel';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80';

type BookingItem = { _id: string; BookingID: number; Date: string; TotalAmount: number; Status: string; ticketIds?: number[] };

type BookingSummaryRow = {
  _id?: string;
  BookingID: number;
  Status: string;
  Date?: string;
  TotalAmount?: number;
  eventName?: string;
  eventStartDate?: string;
};

type EntryAssignmentRow = {
  EventID: number;
  TicketID: number;
  gateIndex: number;
  slotIndex: number;
  windowStart: string;
  windowEnd: string;
  status: string;
  version?: number;
  event?: { Name?: string; StartDate?: string; Status?: string } | null;
  eventMongoId?: string;
  groupTicketIds?: number[];
  linkedTicketIds?: number[];
};

function parseFriendTicketIds(raw: string, myTicketId: number): number[] {
  const parts = raw.split(/[\s,;]+/).map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(parts.filter((n) => n !== myTicketId))];
}

function normalizeBookings(data: unknown): BookingItem[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { bookings?: unknown }).bookings)) return (data as { bookings: BookingItem[] }).bookings;
  return [];
}

export function UserDashboard() {
  return <UserDashboardContent />;
}

function UserDashboardContent() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (authUser?.role === 'vendor') {
      navigate('/vendor', { replace: true });
    }
  }, [authUser?.role, navigate]);

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingSummary, setBookingSummary] = useState<BookingSummaryRow[]>([]);
  const [resaleCount, setResaleCount] = useState({ requests: 0, listings: 0 });
  const [savedCards, setSavedCards] = useState<
    Array<{
      _id: string;
      lastFour: string;
      brand: string;
      expiryMonth: number;
      expiryYear: number;
      cardholderName?: string;
      label?: string;
    }>
  >([]);
  const { section, setSection } = useUserSection();
  /** Crowd entry — gate & time window per ticket (when organizer enabled entry gating) */
  const [entryAssignments, setEntryAssignments] = useState<EntryAssignmentRow[]>([]);
  const [entryPending, setEntryPending] = useState<
    Array<{
      eventMongoId: string | null;
      eventName: string;
      eventId: number;
      ticketIds: number[];
      reason: 'awaiting_assignment' | 'not_configured';
    }>
  >([]);
  const [entrySyncBusy, setEntrySyncBusy] = useState(false);
  const [notifInbox, setNotifInbox] = useState<{
    items: Array<{ _id: string; title: string; body: string; read: boolean; createdAt?: string }>;
    unread: number;
  }>({ items: [], unread: 0 });
  const [friendTicketDraft, setFriendTicketDraft] = useState<Record<string, string>>({});
  const [entryRowBusy, setEntryRowBusy] = useState<string | null>(null);
  /** One canvas ref per booking for PNG download */
  const ticketQrCanvasRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const eventNameByBookingId = useMemo(() => {
    const m = new Map<number, string>();
    for (const row of bookingSummary) {
      if (row.eventName?.trim()) m.set(row.BookingID, row.eventName.trim());
    }
    return m;
  }, [bookingSummary]);

  const refreshCards = useCallback(async () => {
    if (!getToken()) return;
    try {
      const rows = await profileApi.cards.list();
      setSavedCards(Array.isArray(rows) ? rows : []);
    } catch {
      setSavedCards([]);
    }
  }, []);

  const fetchData = useCallback(() => {
    setError(null);
    if (!getToken()) {
      setLoading(false);
      setBookings([]);
      setSavedCards([]);
      setEntryAssignments([]);
      setEntryPending([]);
      setNotifInbox({ items: [], unread: 0 });
      return;
    }
    setLoading(true);
    Promise.all([
      bookingsApi.my(),
      bookingsApi.mySummary().catch(() => []),
      Promise.all([resaleApi.myRequests().catch(() => []), resaleApi.myListings().catch(() => [])]),
      profileApi.cards.list().catch(() => []),
      entryApi.myAssignments().catch(() => []),
      entryApi.myGatingPending().catch(() => ({ pending: [] })),
    ])
      .then(async ([myBookings, summary, [myReqs, myListings], cardRows, entryRows, pendingRes]) => {
        setBookings(normalizeBookings(myBookings));
        let assignments = Array.isArray(entryRows) ? (entryRows as EntryAssignmentRow[]) : [];
        let pending = Array.isArray(pendingRes?.pending) ? pendingRes.pending : [];

        const toSync = pending.filter(
          (p) => p.reason === 'awaiting_assignment' && p.eventMongoId,
        );
        if (toSync.length > 0) {
          await Promise.all(
            toSync.map((p) =>
              entryApi.syncMyEntry(p.eventMongoId!).catch(() => null),
            ),
          );
          const [refreshed, pendingAgain] = await Promise.all([
            entryApi.myAssignments().catch(() => assignments),
            entryApi.myGatingPending().catch(() => ({ pending: [] })),
          ]);
          assignments = Array.isArray(refreshed) ? (refreshed as EntryAssignmentRow[]) : assignments;
          pending = Array.isArray(pendingAgain?.pending) ? pendingAgain.pending : [];
        }

        setEntryAssignments(assignments);
        setEntryPending(pending);
        setNotifInbox({ items: [], unread: 0 });
        setSavedCards(Array.isArray(cardRows) ? cardRows : []);
        setBookingSummary(Array.isArray(summary) ? summary : []);
        setResaleCount({ requests: Array.isArray(myReqs) ? myReqs.length : 0, listings: Array.isArray(myListings) ? myListings.length : 0 });
      })
      .catch((err) => {
        setBookings([]);
        setSavedCards([]);
        setEntryAssignments([]);
        setNotifInbox({ items: [], unread: 0 });
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!getToken()) return;
    return subscribeNotifications((snap) => {
      setNotifInbox({ items: snap.rows, unread: snap.unread });
    });
  }, [authUser?.id]);

  // Refetch when arriving from purchase (?tickets=1) so the new booking shows up
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tickets') === '1') {
      setLoading(true);
      const t = setTimeout(() => {
        fetchData();
        navigate(location.pathname, { replace: true });
      }, 500);
      return () => clearTimeout(t);
    }
    if (params.get('cards') === '1') {
      setSection('cards');
      navigate(location.pathname, { replace: true });
    }
    const entryFocus = params.get('entry');
    if (entryFocus) {
      setSection('tickets');
      const t = setTimeout(() => {
        const el =
          entryFocus === '1'
            ? document.getElementById('entry-gate-section')
            : document.querySelector(`[data-entry-event="${entryFocus}"]`);
        (el ?? document.getElementById('entry-gate-section'))?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        const next = new URLSearchParams(location.search);
        next.delete('entry');
        const qs = next.toString();
        navigate(qs ? `${location.pathname}?${qs}` : location.pathname, { replace: true });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [location.search, location.pathname, navigate, fetchData, setSection]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && parseUserSection(tab) !== 'tickets') {
      setSection(parseUserSection(tab));
      params.delete('tab');
      const qs = params.toString();
      navigate(qs ? `${location.pathname}?${qs}` : location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, setSection]);

  // Refetch when user returns to this tab — throttled to avoid hammering the API
  useEffect(() => {
    let lastRefetch = 0;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefetch < 60_000) return;
      lastRefetch = now;
      fetchData();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchData]);

  return (
    <>
        {/* Quick Stats */}
        <div className="redesign-stats-wrap grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: t('dashboard.stats.active'), value: bookings.filter((b) => b.Status === 'Confirmed').length, icon: Ticket, color: 'from-primary to-secondary' },
            {
              label: t('dashboard.stats.upcomingEvents'),
              value: bookingSummary.filter((b) => b.Status === 'Confirmed' && b.eventStartDate && new Date(b.eventStartDate) > new Date()).length,
              icon: Calendar,
              color: 'from-secondary to-accent',
            },
            { label: t('dashboard.stats.foodOrders'), value: 0, icon: ShoppingBag, color: 'from-accent to-primary' },
            { label: t('dashboard.stats.resaleActivity'), value: resaleCount.requests + resaleCount.listings, icon: QrCode, color: 'from-accent-orange to-accent' },
          ].map((stat, index) => (
            <div key={index} className="redesign-stat-card p-6">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <StatValue value={stat.value} className="redesign-stat-value mb-1" />
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {notifInbox.unread > 0 && (
          <div className="cosmic-panel rounded-xl p-5 mb-6 border border-primary/20 bg-primary/5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                {t('dashboard.youHaveNotifs', { count: notifInbox.unread })}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await notificationsApi.readAll();
                  fetchData();
                }}
              >
                {t('dashboard.markAllRead')}
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              {notifInbox.items
                .filter((n) => !n.read)
                .slice(0, 8)
                .map((n) => (
                  <li key={n._id} className="rounded-lg bg-background/60 border border-border overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        openNotification(n, {
                          navigate,
                          markRead: (id) => notificationsApi.markRead(id),
                          refresh: () => {
                            refreshNotifications();
                            fetchData();
                          },
                        })
                      }
                    >
                      <span className="font-medium text-foreground">{n.title}</span>
                      <p className="text-muted-foreground text-xs mt-1">{n.body}</p>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {section === 'tickets' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {error && (
                <div className="flex-1 min-w-0 p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={() => fetchData()}>Retry</Button>
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchData()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {t('dashboard.refreshTickets')}
              </Button>
            </div>
            {!loading && entryAssignments.length > 0 && (
              <div
                id="entry-gate-section"
                className="cosmic-panel rounded-xl p-5 mb-6 border border-primary/15"
              >
                <div className="flex items-center gap-2 mb-3">
                  <DoorOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">{t('dashboard.entryGate.title')}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t('dashboard.entryGate.intro')}</p>
                <ul className="space-y-3">
                  {entryAssignments.map((row) => {
                    const rowKey = `${row.EventID}-${row.TicketID}`;
                    const busy =
                      entryRowBusy === `link-${rowKey}` ||
                      entryRowBusy === `regen-${rowKey}`;
                    const canLink =
                      Boolean(row.eventMongoId) && row.status !== 'used' && row.status !== 'void';
                    const canRegenerate =
                      Boolean(row.eventMongoId) && row.status === 'active';
                    return (
                    <li
                      key={`${row.EventID}-${row.TicketID}-${row.version ?? 0}`}
                      data-entry-event={row.eventMongoId ?? undefined}
                      className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{row.event?.Name ?? `Event #${row.EventID}`}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            row.status === 'used'
                              ? 'bg-muted text-muted-foreground'
                              : row.status === 'active'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        Ticket #{row.TicketID} · Gate {row.gateIndex} · Slot {row.slotIndex}
                      </p>
                      <p className="text-foreground mt-1">
                        {new Date(row.windowStart).toLocaleString()} — {new Date(row.windowEnd).toLocaleString()}
                      </p>
                      {(row.linkedTicketIds?.length ?? 0) > 0 && (
                        <p className="text-xs text-primary mt-2">
                          {t('dashboard.entryGate.linkedWith', {
                            ids: row.linkedTicketIds!.map((id) => `#${id}`).join(', '),
                          })}
                        </p>
                      )}
                      {row.eventMongoId && (
                        <Link to={`/event/${row.eventMongoId}`} className="text-primary text-xs font-medium inline-block mt-2 hover:underline">
                          Event details
                        </Link>
                      )}
                      {(canLink || canRegenerate) && (
                        <div className="mt-4 pt-3 border-t border-border space-y-4">
                          {canLink && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <Users className="w-4 h-4 text-primary" />
                                {t('dashboard.entryGate.friendlyTitle')}
                              </div>
                              <p className="text-xs text-muted-foreground">{t('dashboard.entryGate.friendlyHint')}</p>
                              <div className="flex flex-wrap items-end gap-2">
                                <label className="text-xs flex-1 min-w-[12rem]">
                                  {t('dashboard.entryGate.friendIdsLabel')}
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="input-cosmic w-full mt-1 block"
                                    placeholder={t('dashboard.entryGate.friendIdsPlaceholder')}
                                    value={friendTicketDraft[rowKey] ?? ''}
                                    disabled={busy}
                                    onChange={(e) =>
                                      setFriendTicketDraft((d) => ({ ...d, [rowKey]: e.target.value }))
                                    }
                                  />
                                </label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  className="gap-1"
                                  onClick={async () => {
                                    const friendIds = parseFriendTicketIds(
                                      friendTicketDraft[rowKey] ?? '',
                                      row.TicketID,
                                    );
                                    if (!friendIds.length) {
                                      toast.error(t('dashboard.entryGate.invalidFriendIds'));
                                      return;
                                    }
                                    setEntryRowBusy(`link-${rowKey}`);
                                    try {
                                      const res = await entryApi.linkFriend(row.eventMongoId!, {
                                        myTicketId: row.TicketID,
                                        friendTicketIds: friendIds,
                                      });
                                      const gate = res.gateIndex ?? res.realign?.gateIndex;
                                      const slot = res.slotIndex ?? res.realign?.slotIndex;
                                      const count = res.cluster?.length ?? res.realign?.realigned ?? 0;
                                      const hint =
                                        gate != null && slot != null && count > 0
                                          ? t('dashboard.entryGate.linkSuccess', { gate, slot, count })
                                          : (res.message ?? t('dashboard.entryGate.linkSaved'));
                                      toast.success(hint);
                                      setFriendTicketDraft((d) => {
                                        const next = { ...d };
                                        delete next[rowKey];
                                        return next;
                                      });
                                      fetchData();
                                    } catch (err) {
                                      toast.error(err instanceof Error ? err.message : 'Could not link tickets');
                                    } finally {
                                      setEntryRowBusy(null);
                                    }
                                  }}
                                >
                                  {t('dashboard.entryGate.linkGroup')}
                                </Button>
                              </div>
                            </div>
                          )}
                          {canRegenerate && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-foreground">{t('dashboard.entryGate.regenerateTitle')}</p>
                              <p className="text-xs text-muted-foreground">{t('dashboard.entryGate.regenerateHint')}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                className="gap-2"
                                onClick={async () => {
                                  setEntryRowBusy(`regen-${rowKey}`);
                                  try {
                                    const res = await entryApi.regenerate(row.eventMongoId!, {
                                      ticketId: row.TicketID,
                                    });
                                    const hint =
                                      res.changed &&
                                      res.previousGateIndex != null &&
                                      res.previousSlotIndex != null &&
                                      res.gateIndex != null &&
                                      res.slotIndex != null
                                        ? t('dashboard.entryGate.regenerateMoved', {
                                            fromGate: res.previousGateIndex,
                                            fromSlot: res.previousSlotIndex,
                                            toGate: res.gateIndex,
                                            toSlot: res.slotIndex,
                                          })
                                        : res.gateIndex != null && res.slotIndex != null
                                          ? t('dashboard.entryGate.regenerateAssigned', {
                                              gate: res.gateIndex,
                                              slot: res.slotIndex,
                                            })
                                          : t('dashboard.entryGate.regenerateAssigned', { gate: '—', slot: '—' });
                                    toast.success(hint);
                                    fetchData();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : 'Could not assign a new slot');
                                  } finally {
                                    setEntryRowBusy(null);
                                  }
                                }}
                              >
                                <RefreshCw className="w-4 h-4" />
                                {t('dashboard.entryGate.regenerateBtn')}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                  })}
                </ul>
              </div>
            )}
            {!loading && entryAssignments.length === 0 && entryPending.length > 0 && (
              <div
                id="entry-gate-section"
                className="cosmic-panel rounded-xl p-5 mb-6 border border-primary/15"
              >
                <div className="flex items-center gap-2 mb-3">
                  <DoorOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">{t('dashboard.entryGate.pendingTitle')}</h3>
                </div>
                <ul className="space-y-3">
                  {entryPending.map((p) => (
                    <li
                      key={p.eventId}
                      className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
                    >
                      <p className="font-medium text-foreground">{p.eventName}</p>
                      <p className="text-muted-foreground mt-1">
                        {p.reason === 'not_configured'
                          ? t('dashboard.entryGate.pendingNotConfigured', { event: p.eventName })
                          : t('dashboard.entryGate.pendingAwaiting', { event: p.eventName })}
                      </p>
                      {p.reason === 'awaiting_assignment' && p.eventMongoId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mt-3 gap-2"
                          disabled={entrySyncBusy}
                          onClick={async () => {
                            setEntrySyncBusy(true);
                            try {
                              await entryApi.syncMyEntry(p.eventMongoId!);
                              fetchData();
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : t('dashboard.entryGate.syncFailed'),
                              );
                            } finally {
                              setEntrySyncBusy(false);
                            }
                          }}
                        >
                          <RefreshCw className={`w-4 h-4 ${entrySyncBusy ? 'animate-spin' : ''}`} />
                          {t('dashboard.entryGate.syncMyEntry')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {loading ? (
              <div className="text-muted-foreground py-8">Loading your tickets...</div>
            ) : bookings.length === 0 && !error ? (
              <div className="cosmic-panel p-12 text-center">
                <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
                <p className="text-muted-foreground mb-6">Purchase tickets from an event to see them here. If you just bought one, click Refresh above.</p>
                <Link to="/events">
                  <Button className="bg-gradient-to-r from-primary to-secondary">Discover Events</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking._id} className="cosmic-panel overflow-hidden hover:shadow-lg transition-all">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                            <Ticket className="w-8 h-8 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">Booking #{booking.BookingID}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.Date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="flex items-center gap-2">
                                <span>Total: EGP {booking.TotalAmount.toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-l-0 lg:border-l border-border lg:pl-6">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Status</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              booking.Status === 'Confirmed' ? 'bg-primary/10 text-primary' : booking.Status === 'Cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                            }`}>
                              {booking.Status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6">
                        <TicketQrBlock
                          ref={(node) => {
                            const m = ticketQrCanvasRef.current;
                            if (node) m.set(booking.BookingID, node);
                            else m.delete(booking.BookingID);
                          }}
                          qrValue={bookingQrValue(booking.BookingID)}
                          size={120}
                          ticketIds={booking.ticketIds}
                          bookingId={booking.BookingID}
                        />
                        <div className="space-y-2 w-full mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            type="button"
                            onClick={() =>
                              downloadBrandedBookingTicketPng(
                                ticketQrCanvasRef.current.get(booking.BookingID) ?? null,
                                booking.BookingID,
                                {
                                  eventName: eventNameByBookingId.get(booking.BookingID),
                                  ticketIds: booking.ticketIds,
                                },
                              )
                            }
                          >
                            <Download className="w-4 h-4" />
                            Download ticket (PNG)
                          </Button>
                          <Link to="/white-market">
                            <Button variant="ghost" size="sm" className="w-full">Resell Ticket</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === 'orders' && (
          <FoodOrdersPanel />
        )}

        {section === 'loyalty' && (
          <LoyaltyRewardsPanel />
        )}

        {section === 'cards' && (
          <SavedCardsWalletTab
            savedCards={savedCards}
            authUser={authUser}
            navigate={navigate}
            onCardsRefresh={refreshCards}
          />
        )}

        {section === 'profile' && (
          <UserProfilePanel embedded />
        )}
    </>
  );
}
