import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, RefreshCw, Building2, ScanFace, ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { AdminVenueFoodPanel } from '../components/admin/AdminVenueFoodPanel';
import { AdminVendorProvisionPanel } from '../components/admin/AdminVendorProvisionPanel';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Link, useNavigate } from 'react-router-dom';
import { resale as resaleApi, users as usersApi, events as eventsApi, stats as statsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAdminSection } from '../context/AdminSectionContext';
import { AdminOverviewPanel } from '../components/admin/AdminOverviewPanel';
import { AdminEventCreatePanel } from '../components/admin/AdminEventCreatePanel';

type PendingRequest = {
  _id: string;
  listingId: { _id: string; eventId?: { Name?: string }; price?: number; sellerId?: { Username?: string } };
  buyerId?: { Username?: string; Email?: string };
  status: string;
  totalAmount?: number;
  platformFee?: number;
};

type AdminTicketHistory = {
  ticketId: number;
  eventId: number;
  currentOwner?: { Username?: string; Email?: string; _id?: string };
  primaryPurchase: {
    kind: string;
    bookingId: number;
    purchasedAt: string;
    pricePaid: number;
    owner?: { Username?: string; Email?: string; _id?: string };
  } | null;
  resaleTransfers: Array<{
    ticketPrice: number;
    platformFee: number;
    totalPaidByBuyer: number;
    occurredAt: string;
    fromUserId?: { Username?: string; Email?: string };
    toUserId?: { Username?: string; Email?: string };
  }>;
};

type PendingEvent = {
  _id: string;
  Name: string;
  Description?: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  organizer?: { Username?: string; Email?: string };
  selectedEquipment?: string[];
  hostingMode?: string;
  VenueID?: number;
  externalVenue?: { name?: string; location?: string; address?: string; capacity?: number };
  megaStar?: {
    displayLabel?: string;
    starName?: string;
    durationLabel?: string;
    priceEgp?: number;
  };
};

type UserRow = {
  _id: string;
  UserID?: number;
  Username?: string;
  Email?: string;
  role?: string;
  Created_At?: string;
  faceIdReference?: string | null;
  faceIdEnrolled?: boolean;
};

function normalizeAdminUser(raw: Record<string, unknown>): UserRow {
  const id = String(raw._id ?? raw.id ?? '');
  return {
    _id: id,
    UserID: typeof raw.UserID === 'number' ? raw.UserID : undefined,
    Username: String(raw.Username ?? raw.username ?? '').trim() || undefined,
    Email: String(raw.Email ?? raw.email ?? '').trim() || undefined,
    role: raw.role != null ? String(raw.role) : undefined,
    Created_At:
      typeof raw.Created_At === 'string'
        ? raw.Created_At
        : raw.Created_At instanceof Date
          ? raw.Created_At.toISOString()
          : undefined,
    faceIdReference:
      raw.faceIdReference != null && raw.faceIdReference !== ''
        ? String(raw.faceIdReference)
        : null,
    faceIdEnrolled: Boolean(raw.faceIdEnrolled ?? raw.faceIdReference),
  };
}

function userMatchesSearch(u: UserRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (u.Username ?? '').toLowerCase().includes(q) ||
    (u.Email ?? '').toLowerCase().includes(q) ||
    u._id.toLowerCase().includes(q) ||
    (u.UserID != null && String(u.UserID).includes(q)) ||
    (u.role ?? '').toLowerCase().includes(q)
  );
}

type PendingOrganizerRow = {
  _id: string;
  Username?: string;
  Email?: string;
  organizationName?: string;
  organizationLocation?: string;
  Created_At?: string;
};

type SecurityParticipant = {
  role: string;
  roleLabel: string;
  id: string;
  username?: string | null;
  email?: string | null;
  display: string;
  faceIdEnrolled?: boolean;
  accountRole?: string | null;
};

type SecurityAlert = {
  id: string;
  kind?: string;
  type: string;
  severity: string;
  time: string;
  status: string;
  ticketId?: number | null;
  eventId?: number | null;
  eventMongoId?: string | null;
  eventName?: string | null;
  action?: string;
  reason?: string | null;
  reasonLabel?: string | null;
  gateIndex?: number | null;
  requestId?: string | null;
  buyerEmail?: string | null;
  buyerUsername?: string | null;
  duplicateTicketCount?: number;
  detail?: string | null;
  navigateTo?: string | null;
  occurredAtIso?: string;
  auditLogId?: string;
  meta?: Record<string, unknown>;
  faceMatch?: {
    similarityPercent: number;
    thresholdPercent: number;
    passed: boolean;
  } | null;
  participants?: SecurityParticipant[];
};

type ResaleSectionFocus = 'listings' | 'payments' | null;

export function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { section, setSection } = useAdminSection();
  const [resaleSectionFocus, setResaleSectionFocus] = useState<ResaleSectionFocus>(null);
  const [selectedSecurityAlert, setSelectedSecurityAlert] = useState<SecurityAlert | null>(null);
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    activeEvents: number;
    platformRevenue: number;
    fraudCount: number;
  } | null>(null);
  const [adminChart, setAdminChart] = useState<Array<{ month: string; users: number; events: number; revenue: number }>>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [securityPanel, setSecurityPanel] = useState<{
    alerts: SecurityAlert[];
    resale: {
      activeListings: number;
      completedTransfers: number;
      flaggedListings: number;
      pendingApproval: number;
      paymentPending: number;
      verificationRate: number;
      links?: Record<string, { navigateTo: string; focus?: string }>;
    };
  } | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [pendingListings, setPendingListings] = useState<
    Array<{
      _id: string;
      price: number;
      TicketID?: number;
      sellerId?: { Username?: string; Email?: string };
      eventId?: { Name?: string };
    }>
  >([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingActionId, setListingActionId] = useState<string | null>(null);
  const [paymentPendingRequests, setPaymentPendingRequests] = useState<PendingRequest[]>([]);
  const [resaleLoading, setResaleLoading] = useState(false);
  const [resaleActionId, setResaleActionId] = useState<string | null>(null);
  const [ticketHistoryId, setTicketHistoryId] = useState('');
  const [ticketHistory, setTicketHistory] = useState<AdminTicketHistory | null>(null);
  const [ticketHistoryLoading, setTicketHistoryLoading] = useState(false);
  const [ticketHistoryError, setTicketHistoryError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [faceResetUserId, setFaceResetUserId] = useState<string | null>(null);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [pendingEventsLoading, setPendingEventsLoading] = useState(false);
  const [eventActionId, setEventActionId] = useState<string | null>(null);
  const [pendingOrganizers, setPendingOrganizers] = useState<PendingOrganizerRow[]>([]);
  const [organizersLoading, setOrganizersLoading] = useState(false);
  const [organizerActionId, setOrganizerActionId] = useState<string | null>(null);
  const [orgDocsOpen, setOrgDocsOpen] = useState(false);
  const [orgDocsLoading, setOrgDocsLoading] = useState(false);
  const [orgDocsDetail, setOrgDocsDetail] = useState<{
    commercialRegistrationDoc?: string;
    taxCardDoc?: string;
    organizationName?: string;
    organizationLocation?: string;
    Username?: string;
    Email?: string;
  } | null>(null);

  const fetchResaleRequests = useCallback(() => {
    if (user?.role !== 'admin') return;
    setResaleLoading(true);
    resaleApi
      .paymentPendingRequests()
      .then(setPaymentPendingRequests)
      .catch(() => setPaymentPendingRequests([]))
      .finally(() => setResaleLoading(false));
  }, [user?.role]);

  const fetchPendingListings = useCallback(() => {
    if (user?.role !== 'admin') return;
    setListingsLoading(true);
    resaleApi
      .pendingListings()
      .then(setPendingListings)
      .catch(() => setPendingListings([]))
      .finally(() => setListingsLoading(false));
  }, [user?.role]);

  const fetchUsers = useCallback(() => {
    if (user?.role !== 'admin') return;
    setUsersLoading(true);
    setUsersError(null);
    usersApi
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setUsers(list.map((row) => normalizeAdminUser(row as Record<string, unknown>)));
      })
      .catch((err) => {
        setUsers([]);
        setUsersError(err instanceof Error ? err.message : 'Failed to load users');
      })
      .finally(() => setUsersLoading(false));
  }, [user?.role]);

  const fetchPendingEvents = useCallback(() => {
    if (user?.role !== 'admin') return;
    setPendingEventsLoading(true);
    eventsApi.pending().then(setPendingEvents).catch(() => setPendingEvents([])).finally(() => setPendingEventsLoading(false));
  }, [user?.role]);

  const fetchPendingOrganizers = useCallback(() => {
    if (user?.role !== 'admin') return;
    setOrganizersLoading(true);
    usersApi
      .pendingOrganizers()
      .then(setPendingOrganizers)
      .catch(() => setPendingOrganizers([]))
      .finally(() => setOrganizersLoading(false));
  }, [user?.role]);

  const fetchAdminStats = useCallback(() => {
    if (user?.role !== 'admin') return;
    setStatsLoading(true);
    Promise.all([
      statsApi.admin().then((s) => setAdminStats(s)),
      statsApi.adminChart().then(setAdminChart),
    ]).catch(() => {}).finally(() => setStatsLoading(false));
  }, [user?.role]);

  const fetchSecurityPanel = useCallback(() => {
    if (user?.role !== 'admin') return;
    setSecurityLoading(true);
    statsApi
      .adminSecurity()
      .then(setSecurityPanel)
      .catch(() =>
        setSecurityPanel({
          alerts: [],
          resale: {
            activeListings: 0,
            completedTransfers: 0,
            flaggedListings: 0,
            pendingApproval: 0,
            paymentPending: 0,
            verificationRate: 100,
          },
        }),
      )
      .finally(() => setSecurityLoading(false));
  }, [user?.role]);

  useEffect(() => { fetchAdminStats(); }, [fetchAdminStats]);
  useEffect(() => { fetchSecurityPanel(); }, [fetchSecurityPanel]);
  useEffect(() => {
    fetchResaleRequests();
    fetchPendingListings();
  }, [fetchResaleRequests, fetchPendingListings]);
  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    fetchUsers();
  }, [authLoading, user?.role, fetchUsers]);
  useEffect(() => { fetchPendingEvents(); }, [fetchPendingEvents]);
  useEffect(() => { fetchPendingOrganizers(); }, [fetchPendingOrganizers]);

  const handleApproveEvent = async (eventId: string) => {
    setEventActionId(eventId);
    try {
      await eventsApi.approve(eventId);
      setPendingEvents((prev) => prev.filter((e) => e._id !== eventId));
    } finally {
      setEventActionId(null);
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    setEventActionId(eventId);
    try {
      await eventsApi.reject(eventId);
      setPendingEvents((prev) => prev.filter((e) => e._id !== eventId));
    } finally {
      setEventActionId(null);
    }
  };

  const handleViewOrganizerDocs = async (userId: string) => {
    setOrgDocsOpen(true);
    setOrgDocsDetail(null);
    setOrgDocsLoading(true);
    try {
      const u = await usersApi.get(userId);
      setOrgDocsDetail({
        commercialRegistrationDoc: u.commercialRegistrationDoc,
        taxCardDoc: u.taxCardDoc,
        organizationName: u.organizationName,
        organizationLocation: u.organizationLocation,
        Username: u.Username,
        Email: u.Email,
      });
    } catch {
      setOrgDocsDetail(null);
    } finally {
      setOrgDocsLoading(false);
    }
  };

  const handleApproveOrganizer = async (userId: string) => {
    setOrganizerActionId(userId);
    try {
      await usersApi.approveOrganizer(userId);
      setPendingOrganizers((prev) => prev.filter((o) => o._id !== userId));
      setOrgDocsOpen(false);
    } finally {
      setOrganizerActionId(null);
    }
  };

  const handleRejectOrganizer = async (userId: string) => {
    if (!confirm('Reject this application? The account will become a regular attendee.')) return;
    setOrganizerActionId(userId);
    try {
      await usersApi.rejectOrganizer(userId);
      setPendingOrganizers((prev) => prev.filter((o) => o._id !== userId));
      setOrgDocsOpen(false);
    } finally {
      setOrganizerActionId(null);
    }
  };

  const openEditUser = (u: UserRow) => {
    setEditUser(u);
    setEditUsername(u.Username ?? '');
    setEditEmail(u.Email ?? '');
    setEditRole(u.role ?? 'attendee');
    setEditError(null);
    setEditUserOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setEditError(null);
    setEditSaving(true);
    try {
      await usersApi.update(editUser._id, { username: editUsername.trim() || undefined, email: editEmail.trim() || undefined, role: editRole });
      setUsers((prev) => prev.map((u) => (u._id === editUser._id ? { ...u, Username: editUsername.trim(), Email: editEmail.trim(), role: editRole } : u)));
      setEditUserOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetFaceId = async (u: UserRow) => {
    if (!window.confirm(`Clear Face ID for ${u.Email ?? u.Username}? They must enroll again.`)) return;
    setFaceResetUserId(u._id);
    try {
      await usersApi.resetFaceId(u._id);
      setUsers((prev) =>
        prev.map((row) =>
          row._id === u._id ? { ...row, faceIdReference: null, faceIdEnrolled: false } : row,
        ),
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not reset Face ID');
    } finally {
      setFaceResetUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) return;
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setDeleteUserId(userId);
    try {
      await usersApi.delete(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (_) {}
    setDeleteUserId(null);
  };

  const handleConfirmPayment = async (requestId: string) => {
    setResaleActionId(requestId);
    try {
      await resaleApi.confirmPayment(requestId);
      setPaymentPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
    } finally {
      setResaleActionId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setResaleActionId(requestId);
    try {
      await resaleApi.reject(requestId);
      setPaymentPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      fetchSecurityPanel();
    } finally {
      setResaleActionId(null);
    }
  };

  const handleApproveListing = async (listingId: string) => {
    setListingActionId(listingId);
    try {
      await resaleApi.approveListing(listingId);
      setPendingListings((prev) => prev.filter((l) => l._id !== listingId));
      fetchSecurityPanel();
    } finally {
      setListingActionId(null);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    if (!confirm('Reject this resale listing?')) return;
    setListingActionId(listingId);
    try {
      await resaleApi.rejectListing(listingId);
      setPendingListings((prev) => prev.filter((l) => l._id !== listingId));
      fetchSecurityPanel();
    } finally {
      setListingActionId(null);
    }
  };

  const goToResaleSection = (focus: ResaleSectionFocus) => {
    setSelectedSecurityAlert(null);
    setResaleSectionFocus(focus);
    setSection('resale');
  };

  const goToWhiteMarket = () => {
    setSelectedSecurityAlert(null);
    navigate('/white-market');
  };

  const followSecurityAlert = (alert: SecurityAlert) => {
    setSelectedSecurityAlert(null);
    const target = alert.navigateTo;
    if (target === 'ticket-history' && alert.ticketId != null) {
      setTicketHistoryId(String(alert.ticketId));
      setSection('ticket-history');
      return;
    }
    if (target === 'entry-tools' && alert.eventMongoId) {
      navigate(`/creator/entry/${alert.eventMongoId}`);
      return;
    }
    if (target === 'resale') {
      if (alert.kind === 'resale_rejected') goToResaleSection('payments');
      else goToResaleSection('listings');
      return;
    }
    setSection('security');
  };

  const handleResaleMetricClick = (
    metricKey: string,
    link?: { navigateTo: string; focus?: string },
  ) => {
    if (!link) {
      setSection('resale');
      return;
    }
    if (link.navigateTo === 'white-market') {
      goToWhiteMarket();
      return;
    }
    if (link.navigateTo === 'resale') {
      if (link.focus === 'listings') goToResaleSection('listings');
      else if (link.focus === 'payments') goToResaleSection('payments');
      else goToResaleSection(null);
    }
  };

  const findSecurityAlert = useCallback(
    (refId: string, panel: typeof securityPanel) => {
      const auditId = refId.startsWith('audit-') ? refId.slice(6) : refId;
      return (
        panel?.alerts.find(
          (a) =>
            a.id === refId ||
            a.id === auditId ||
            a.auditLogId === refId ||
            a.auditLogId === auditId,
        ) ?? null
      );
    },
    [],
  );

  const openSecurityAlert = useCallback(
    async (alertOrRef: SecurityAlert | string) => {
      setSection('security');
      if (typeof alertOrRef !== 'string') {
        setSelectedSecurityAlert(alertOrRef);
        return;
      }
      let alert = findSecurityAlert(alertOrRef, securityPanel);
      if (!alert) {
        try {
          const panel = await statsApi.adminSecurity();
          setSecurityPanel(panel);
          alert = findSecurityAlert(alertOrRef, panel);
        } catch {
          alert = null;
        }
      }
      if (alert) setSelectedSecurityAlert(alert);
    },
    [findSecurityAlert, securityPanel, setSection],
  );

  useEffect(() => {
    if (section !== 'resale' || !resaleSectionFocus) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`resale-section-${resaleSectionFocus}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setResaleSectionFocus(null);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [section, resaleSectionFocus]);

  const loadTicketHistory = async () => {
    const id = Number(ticketHistoryId.trim());
    if (!Number.isFinite(id) || id <= 0) {
      setTicketHistoryError('Enter a valid numeric Ticket ID.');
      setTicketHistory(null);
      return;
    }
    setTicketHistoryError(null);
    setTicketHistoryLoading(true);
    setTicketHistory(null);
    try {
      const data = await resaleApi.adminTicketTransferHistory(id);
      setTicketHistory(data as AdminTicketHistory);
    } catch (e) {
      setTicketHistoryError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setTicketHistoryLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      {section === 'overview' && (
        <AdminOverviewPanel
          statsLoading={statsLoading}
          adminStats={adminStats}
          adminChart={adminChart}
          pendingEvents={pendingEvents}
          pendingOrganizers={pendingOrganizers}
          paymentPendingRequests={paymentPendingRequests}
          labels={{
            totalUsers: t('admin.totalUsers'),
            activeEvents: t('admin.activeEvents'),
            platformRevenue: t('admin.platformRevenue'),
            fraudDetected: t('admin.fraudDetected'),
            loadingStats: t('admin.loadingStats'),
          }}
        />
      )}

      {section === 'users' && (
        <>
        <div className="admin-panel lg-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">User Management</h3>
                <div className="flex gap-2">
                  <input
                    id="admin-user-search"
                    name="user_search"
                    type="search"
                    autoComplete="off"
                    placeholder="Search name, email, user ID, or Mongo _id..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button variant="outline" size="sm" onClick={fetchUsers} disabled={usersLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              {usersError && (
                <p className="text-sm text-destructive mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                  {usersError}
                </p>
              )}
              {usersLoading && users.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">Loading users...</p>
              ) : (
                <div className="overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-3 px-4">
                    {users.length > 0
                      ? `Showing ${users.filter((u) => userMatchesSearch(u, userSearch)).length} of ${users.length} users`
                      : 'No users loaded'}
                  </p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Face ID</th>
                        <th className="text-left py-3 px-4">Joined</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter((u) => userMatchesSearch(u, userSearch)).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-muted-foreground">
                            {users.length === 0
                              ? 'No users returned from the server. Try Refresh or check you are signed in as admin.'
                              : 'No users match your search.'}
                          </td>
                        </tr>
                      ) : null}
                      {users
                        .filter((u) => userMatchesSearch(u, userSearch))
                        .map((u) => (
                          <tr key={u._id} className="border-b border-border hover:bg-muted/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                                  {(u.Username ?? '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{u.Username ?? '—'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{u.Email ?? '—'}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-full bg-muted text-xs capitalize">
                                {u.role ?? '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {u.faceIdReference || u.faceIdEnrolled ? (
                                <span className="inline-flex items-center gap-1 text-xs text-primary">
                                  <ScanFace className="w-3.5 h-3.5" />
                                  Enrolled
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-sm">
                              {u.Created_At ? new Date(u.Created_At).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              {u.faceIdReference || u.faceIdEnrolled ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-600 hover:bg-amber-500/10"
                                  disabled={faceResetUserId === u._id}
                                  onClick={() => void handleResetFaceId(u)}
                                >
                                  {faceResetUserId === u._id ? '…' : 'Reset Face ID'}
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="sm" onClick={() => openEditUser(u)}>
                                Edit
                              </Button>
                              {u._id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  disabled={deleteUserId === u._id}
                                  onClick={() => handleDeleteUser(u._id)}
                                >
                                  {deleteUserId === u._id ? '…' : 'Delete'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>
                {editUser && (
                  <div className="space-y-4 py-4">
                    {editError && (
                      <p className="text-sm text-destructive">{editError}</p>
                    )}
                    <div>
                      <Label htmlFor="admin-edit-username">Username</Label>
                      <Input
                        id="admin-edit-username"
                        name="username"
                        autoComplete="username"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-edit-email">Email</Label>
                      <Input
                        id="admin-edit-email"
                        name="email"
                        autoComplete="email"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-edit-role">Role</Label>
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger id="admin-edit-role" className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4}>
                          <SelectItem value="attendee">Attendee</SelectItem>
                          <SelectItem value="organizer">Organizer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUser} disabled={editSaving}>
                    {editSaving ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
      )}

      {section === 'organizers' && (
        <>
        <div className="admin-panel lg-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-semibold">Pending organization organizers</h3>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPendingOrganizers} disabled={organizersLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${organizersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              {organizersLoading && pendingOrganizers.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">Loading…</p>
              ) : pendingOrganizers.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No pending organization applications.</p>
              ) : (
                <div className="space-y-4">
                  {pendingOrganizers.map((row) => (
                    <div key={row._id} className="p-5 rounded-xl border border-border flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{row.organizationName ?? '—'}</p>
                        <p className="text-sm text-muted-foreground">{row.organizationLocation ?? '—'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Contact: {row.Username ?? '—'} · {row.Email ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {row.Created_At ? new Date(row.Created_At).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewOrganizerDocs(row._id)}>
                          View documents
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-primary to-secondary"
                          disabled={organizerActionId === row._id}
                          onClick={() => handleApproveOrganizer(row._id)}
                        >
                          {organizerActionId === row._id ? '…' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={organizerActionId === row._id}
                          onClick={() => handleRejectOrganizer(row._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={orgDocsOpen} onOpenChange={setOrgDocsOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Organization documents</DialogTitle>
                </DialogHeader>
                {orgDocsLoading && <p className="text-sm text-muted-foreground py-6">Loading…</p>}
                {!orgDocsLoading && orgDocsDetail && (
                  <div className="space-y-4 py-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Organization:</span>{' '}
                      <span className="font-medium">{orgDocsDetail.organizationName ?? '—'}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Location:</span>{' '}
                      {orgDocsDetail.organizationLocation ?? '—'}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium mb-2">Commercial registration</p>
                        {orgDocsDetail.commercialRegistrationDoc ? (
                          <img
                            src={orgDocsDetail.commercialRegistrationDoc}
                            alt="Commercial registration"
                            className="w-full rounded-lg border border-border object-contain max-h-64 bg-muted"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">Not on file</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-2">Tax card</p>
                        {orgDocsDetail.taxCardDoc ? (
                          <img
                            src={orgDocsDetail.taxCardDoc}
                            alt="Tax card"
                            className="w-full rounded-lg border border-border object-contain max-h-64 bg-muted"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">Not on file</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setOrgDocsOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
      )}

      {section === 'create-event' && <AdminEventCreatePanel />}

      {section === 'events' && (
        <div className="admin-panel lg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h3 className="text-xl font-semibold">Pending Event Approvals</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="gap-2 bg-gradient-to-r from-primary to-secondary"
                    onClick={() => setSection('create-event')}
                  >
                    <Plus className="w-4 h-4" />
                    {t('admin.nav.createEvent')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchPendingEvents} disabled={pendingEventsLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${pendingEventsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              {pendingEventsLoading && pendingEvents.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">Loading pending events...</p>
              ) : pendingEvents.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No pending event approvals.</p>
              ) : (
                <div className="space-y-4">
                  {pendingEvents.map((ev) => (
                    <div key={ev._id} className="p-5 rounded-xl border border-border hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">{ev.Name}</h4>
                          <p className="text-sm text-muted-foreground">
                            By {typeof ev.organizer === 'object' && ev.organizer?.Username
                              ? ev.organizer.Username
                              : ev.organizer?.Email ?? '—'}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-accent-orange/10 text-accent-orange text-xs font-medium">
                          Pending Review
                        </span>
                      </div>
                      {ev.Description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{ev.Description}</p>
                      )}
                      <div className="mb-3 flex flex-wrap gap-2 text-xs">
                        {ev.hostingMode && (
                          <span className="px-2.5 py-1 rounded-full bg-muted text-foreground border border-border">
                            {t('admin.hostingMode')}: {t(`creator.hosting.modes.${ev.hostingMode}.title`, ev.hostingMode)}
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                          {t('admin.eventVenue')}:{' '}
                          {ev.externalVenue?.name
                            ? [
                                ev.externalVenue.name,
                                ev.externalVenue.address,
                                ev.externalVenue.location,
                              ]
                                .filter(Boolean)
                                .join(' — ')
                            : ev.VenueID != null
                              ? `#${ev.VenueID}`
                              : '—'}
                        </span>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs font-medium text-foreground mb-2">{t('admin.megaStar')}</p>
                        {ev.megaStar?.displayLabel ? (
                          <p className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/25 inline-block">
                            {ev.megaStar.displayLabel}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t('admin.noMegaStar')}</p>
                        )}
                      </div>
                      <div className="mb-4">
                        <p className="text-xs font-medium text-foreground mb-2">{t('admin.selectedEquipment')}</p>
                        {ev.hostingMode === 'venue_only' ||
                        ev.hostingMode === 'ticketing_only' ? (
                          <p className="text-xs text-muted-foreground">{t('creator.equipment.catalogueDisabled')}</p>
                        ) : ev.selectedEquipment && ev.selectedEquipment.length > 0 ? (
                          <ul className="flex flex-wrap gap-2">
                            {ev.selectedEquipment.map((label) => (
                              <li
                                key={label}
                                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                              >
                                {label}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t('admin.noEquipmentSelected')}</p>
                        )}
                      </div>
                      {ev.setupDeposit && (ev.setupDeposit.totalEgp ?? 0) > 0 && (
                        <p className="text-sm font-medium text-foreground mb-3">
                          {t('admin.setupDepositDue', {
                            total: new Intl.NumberFormat('en-EG').format(ev.setupDeposit.totalEgp ?? 0),
                            percent: ev.setupDeposit.platformFeePercent ?? 10,
                          })}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mb-4">
                        {new Date(ev.StartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        {' — '}
                        {new Date(ev.EndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-primary to-secondary"
                          disabled={eventActionId === ev._id}
                          onClick={() => handleApproveEvent(ev._id)}
                        >
                          {eventActionId === ev._id ? '…' : 'Approve'}
                        </Button>
                        <Link to={`/event/${ev._id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">View Details</Button>
                        </Link>
                        <Link to={`/creator/events/${ev._id}/edit`}>
                          <Button size="sm" variant="outline">{t('creator.edit.editButton')}</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={eventActionId === ev._id}
                          onClick={() => handleRejectEvent(ev._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
      )}

      {section === 'ticket-history' && (
        <div className="admin-panel lg-card p-5 sm:p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Ticket ownership history</h3>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Enter the numeric <strong>TicketID</strong> (same as on the ticket / booking). Shows the first purchaser from bookings and each
                  completed white-market resale (seller → buyer, amounts, date).
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3 max-w-xl">
                <div className="flex-1 min-w-[12rem]">
                  <Label htmlFor="ticket-history-id">Ticket ID</Label>
                  <Input
                    id="ticket-history-id"
                    inputMode="numeric"
                    placeholder="e.g. 10042"
                    value={ticketHistoryId}
                    onChange={(e) => setTicketHistoryId(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={() => void loadTicketHistory()} disabled={ticketHistoryLoading}>
                  {ticketHistoryLoading ? 'Loading…' : 'Load history'}
                </Button>
              </div>
              {ticketHistoryError && <p className="text-sm text-destructive">{ticketHistoryError}</p>}
              {ticketHistory && (
                <div className="space-y-6 text-sm border border-border rounded-xl p-5 bg-muted/20">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Current owner</p>
                    <p className="text-muted-foreground">
                      {ticketHistory.currentOwner?.Username ?? ticketHistory.currentOwner?.Email ?? '—'}{' '}
                      {ticketHistory.currentOwner?.Email && ticketHistory.currentOwner?.Username
                        ? `(${ticketHistory.currentOwner.Email})`
                        : null}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-2">Primary purchase</p>
                    {ticketHistory.primaryPurchase ? (
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>
                          Buyer:{' '}
                          {ticketHistory.primaryPurchase.owner?.Username ??
                            ticketHistory.primaryPurchase.owner?.Email ??
                            '—'}
                        </li>
                        <li>Booking #{ticketHistory.primaryPurchase.bookingId}</li>
                        <li>Date: {new Date(ticketHistory.primaryPurchase.purchasedAt).toLocaleString()}</li>
                        <li>Price paid: EGP {Number(ticketHistory.primaryPurchase.pricePaid).toFixed(2)}</li>
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No booking detail found for this ticket (legacy or imported data).</p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-2">White market resales (completed)</p>
                    {ticketHistory.resaleTransfers.length === 0 ? (
                      <p className="text-muted-foreground">No resale transfers recorded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {ticketHistory.resaleTransfers.map((row, i) => (
                          <div key={i} className="rounded-lg border border-border bg-background p-4">
                            <p className="text-xs text-muted-foreground mb-2">
                              {new Date(row.occurredAt).toLocaleString()}
                            </p>
                            <p>
                              <span className="text-muted-foreground">From</span>{' '}
                              {row.fromUserId?.Username ?? row.fromUserId?.Email ?? '—'} →{' '}
                              <span className="text-muted-foreground">To</span>{' '}
                              {row.toUserId?.Username ?? row.toUserId?.Email ?? '—'}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              Ticket price: EGP {Number(row.ticketPrice).toFixed(2)} · Platform fee: EGP{' '}
                              {Number(row.platformFee).toFixed(2)} · Buyer paid: EGP {Number(row.totalPaidByBuyer).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
      )}

      {section === 'resale' && (
        <div className="admin-panel lg-card p-5 sm:p-6 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Resale monitoring</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchResaleRequests();
                    fetchPendingListings();
                  }}
                  disabled={resaleLoading || listingsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${resaleLoading || listingsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              <div id="resale-section-listings">
                <h4 className="font-medium mb-3 text-muted-foreground">Listings pending approval</h4>
                {listingsLoading && pendingListings.length === 0 ? (
                  <p className="text-muted-foreground py-4">Loading…</p>
                ) : pendingListings.length === 0 ? (
                  <p className="text-muted-foreground py-4">None.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingListings.map((listing) => (
                      <div key={listing._id} className="p-5 rounded-xl border border-border">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <h4 className="font-semibold">
                              {listing.eventId?.Name ?? 'Event'} · Ticket #{listing.TicketID ?? '—'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Seller: {listing.sellerId?.Username ?? listing.sellerId?.Email ?? '—'}
                            </p>
                            <p className="text-sm text-muted-foreground">Asking: EGP {Number(listing.price).toFixed(2)}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                            Pending approval
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-primary to-secondary"
                            disabled={listingActionId === listing._id}
                            onClick={() => handleApproveListing(listing._id)}
                          >
                            {listingActionId === listing._id ? '…' : 'Approve listing'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={listingActionId === listing._id}
                            onClick={() => handleRejectListing(listing._id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="resale-section-payments">
                <h4 className="font-medium mb-3 text-muted-foreground">Awaiting payment</h4>
              <p className="text-sm text-muted-foreground max-w-3xl">
                Listings go live immediately. When a buyer requests a ticket, they receive a payment link and confirm themselves. Use{' '}
                <strong>Confirm payment &amp; transfer</strong> only if the buyer cannot complete the flow (e.g. support case).
              </p>

              <div>
                <h4 className="font-medium mb-3 text-muted-foreground">Payment pending</h4>
                {resaleLoading && paymentPendingRequests.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center">Loading...</p>
                ) : paymentPendingRequests.length === 0 ? (
                  <p className="text-muted-foreground py-4">None.</p>
                ) : (
                  <div className="space-y-4">
                    {paymentPendingRequests.map((req) => (
                      <div key={req._id} className="p-5 rounded-xl border border-border hover:shadow-lg transition-all">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <h4 className="font-semibold text-lg mb-1">
                              {typeof req.listingId?.eventId === 'object' && req.listingId?.eventId?.Name
                                ? req.listingId.eventId.Name
                                : 'Resale listing'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Buyer: {req.buyerId?.Username ?? req.buyerId?.Email ?? '—'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Total to pay: EGP {(req.totalAmount ?? (Number(req.listingId?.price) + 50)).toFixed(2)} (ticket + EGP 50 fee)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Payment page: <Link to={`/resale/payment/${req._id}`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">/resale/payment/{req._id}</Link>
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                            Awaiting payment
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-primary to-secondary"
                            disabled={resaleActionId === req._id}
                            onClick={() => handleConfirmPayment(req._id)}
                          >
                            {resaleActionId === req._id ? '…' : 'Confirm payment & transfer'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={resaleActionId === req._id}
                            onClick={() => handleReject(req._id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
      )}

      {section === 'security' && (
        <>
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={fetchSecurityPanel} disabled={securityLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${securityLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="admin-panel lg-card p-5 sm:p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Fraud Detection
                </h3>
                {selectedSecurityAlert && section === 'security' ? (
                  <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 pointer-events-auto">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{selectedSecurityAlert.type}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedSecurityAlert.time}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => setSelectedSecurityAlert(null)}
                      >
                        Close
                      </Button>
                    </div>
                    {(selectedSecurityAlert.reasonLabel || selectedSecurityAlert.detail) && (
                      <p className="text-sm text-foreground leading-relaxed">
                        {selectedSecurityAlert.reasonLabel || selectedSecurityAlert.detail}
                      </p>
                    )}
                    {selectedSecurityAlert.participants?.find((p) => p.role === 'ticket_holder') && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Ticket holder: </span>
                        <span className="font-medium">
                          {selectedSecurityAlert.participants.find((p) => p.role === 'ticket_holder')?.display}
                        </span>
                      </p>
                    )}
                    {selectedSecurityAlert.faceMatch && (
                      <p className="text-sm text-destructive">
                        Face match: {selectedSecurityAlert.faceMatch.similarityPercent}% (need{' '}
                        {selectedSecurityAlert.faceMatch.thresholdPercent}%)
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      A detail dialog also opens with participants, gate data, and quick actions.
                    </p>
                  </div>
                ) : null}
                {securityLoading && !securityPanel ? (
                  <p className="text-muted-foreground py-8 text-center">Loading alerts…</p>
                ) : !securityPanel?.alerts?.length ? (
                  <p className="text-muted-foreground py-8 text-center">No security alerts — gate denials and rejected resales appear here.</p>
                ) : (
                  <div className="space-y-3">
                    {(securityPanel?.alerts ?? []).map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => void openSecurityAlert(alert)}
                        className={`w-full flex items-center justify-between gap-3 p-4 rounded-lg border transition-colors text-left cursor-pointer group relative z-[1] pointer-events-auto touch-manipulation ${
                          selectedSecurityAlert?.id === alert.id
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-muted/30 hover:bg-muted/50 border-transparent hover:border-primary/25'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AlertTriangle
                            className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'High' ? 'text-destructive' : 'text-orange-500'}`}
                          />
                          <div className="min-w-0">
                            <p className="font-medium">{alert.type}</p>
                            <p className="text-sm text-muted-foreground">{alert.time}</p>
                            {alert.detail && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.detail}</p>
                            )}
                            {alert.participants?.find((p) => p.role === 'ticket_holder') && (
                              <p className="text-xs text-primary/90 truncate mt-0.5">
                                Holder: {alert.participants.find((p) => p.role === 'ticket_holder')?.display}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.status === 'Blocked'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            }`}
                          >
                            {alert.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-panel lg-card p-5 sm:p-6">
                <h3 className="text-xl font-semibold mb-6">White Market Activity</h3>
                {securityLoading && !securityPanel ? (
                  <p className="text-muted-foreground py-8 text-center">Loading…</p>
                ) : !securityPanel?.resale ? (
                  <p className="text-muted-foreground py-8 text-center">Could not load resale stats.</p>
                ) : (
                  <div className="space-y-3">
                    {(
                      [
                        {
                          key: 'activeListings',
                          label: 'Active Listings',
                          value: securityPanel.resale.activeListings ?? 0,
                          valueClass: '',
                        },
                        {
                          key: 'completedTransfers',
                          label: 'Completed Transfers',
                          value: securityPanel.resale.completedTransfers ?? 0,
                          valueClass: '',
                        },
                        {
                          key: 'flaggedListings',
                          label: 'Needs review (listings + payments)',
                          value: securityPanel.resale.flaggedListings ?? 0,
                          valueClass: 'text-destructive',
                        },
                        {
                          key: 'pendingApproval',
                          label: 'Pending listing approval',
                          value: securityPanel.resale.pendingApproval ?? 0,
                          valueClass: '',
                          small: true,
                        },
                        {
                          key: 'paymentPending',
                          label: 'Awaiting buyer payment',
                          value: securityPanel.resale.paymentPending ?? 0,
                          valueClass: '',
                          small: true,
                        },
                        {
                          key: 'verificationRate',
                          label: 'Resale approval rate',
                          value: `${securityPanel.resale.verificationRate ?? 0}%`,
                          valueClass: 'text-primary',
                        },
                      ] as const
                    ).map((row) => {
                      const link = securityPanel.resale.links?.[row.key];
                      return (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => handleResaleMetricClick(row.key, link)}
                          className={`w-full flex justify-between items-center gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/25 transition-colors text-left cursor-pointer group ${
                            row.small ? 'text-sm text-muted-foreground' : ''
                          }`}
                        >
                          <span className={row.small ? '' : 'text-muted-foreground'}>{row.label}</span>
                          <span className={`font-semibold flex items-center gap-2 ${row.valueClass}`}>
                            {row.value}
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
        </>
      )}

      {section === 'venue-food' && (
        <div className="space-y-10">
          <AdminVendorProvisionPanel />
          <AdminVenueFoodPanel />
        </div>
      )}

      <Dialog
        open={selectedSecurityAlert != null}
        onOpenChange={(open) => {
          if (!open) setSelectedSecurityAlert(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSecurityAlert?.type ?? 'Security alert'}</DialogTitle>
          </DialogHeader>
          {selectedSecurityAlert && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedSecurityAlert.severity === 'High'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {selectedSecurityAlert.severity}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedSecurityAlert.status === 'Blocked'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {selectedSecurityAlert.status}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {selectedSecurityAlert.time}
                </span>
              </div>

              {(selectedSecurityAlert.reasonLabel || selectedSecurityAlert.detail) && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">What happened</p>
                  <p className="text-foreground leading-relaxed">
                    {selectedSecurityAlert.reasonLabel || selectedSecurityAlert.detail}
                  </p>
                  {selectedSecurityAlert.reason &&
                    selectedSecurityAlert.reason !== selectedSecurityAlert.reasonLabel && (
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        Code: {selectedSecurityAlert.reason}
                      </p>
                    )}
                </div>
              )}

              {selectedSecurityAlert.participants && selectedSecurityAlert.participants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">People involved</p>
                  {selectedSecurityAlert.participants.map((p) => (
                    <div
                      key={`${p.role}-${p.id}`}
                      className="rounded-lg border border-border bg-background/60 p-3 space-y-1"
                    >
                      <p className="text-xs font-medium text-primary">{p.roleLabel}</p>
                      <p className="font-semibold">{p.display}</p>
                      {p.email && (
                        <p className="text-muted-foreground text-xs">{p.email}</p>
                      )}
                      {p.username && p.email && (
                        <p className="text-muted-foreground text-xs">@{p.username}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono">User ID: {p.id}</p>
                      {p.role === 'ticket_holder' && (
                        <p className="text-xs flex items-center gap-1 mt-1">
                          <ScanFace className="w-3.5 h-3.5" />
                          {p.faceIdEnrolled ? (
                            <span className="text-primary">Face ID enrolled</span>
                          ) : (
                            <span className="text-destructive">Face ID not enrolled</span>
                          )}
                        </p>
                      )}
                      {p.accountRole && (
                        <p className="text-xs text-muted-foreground capitalize">
                          Account role: {p.accountRole}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => {
                          setUserSearch(p.email || p.username || p.display);
                          setSelectedSecurityAlert(null);
                          setSection('users');
                          fetchUsers();
                        }}
                      >
                        Find in user list
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {selectedSecurityAlert.faceMatch && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <p className="text-xs font-medium text-destructive">Face ID scan result</p>
                  <p className="text-foreground">
                    Match score:{' '}
                    <strong>{selectedSecurityAlert.faceMatch.similarityPercent}%</strong>
                    {' '}(required: {selectedSecurityAlert.faceMatch.thresholdPercent}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSecurityAlert.faceMatch.passed
                      ? 'Score met threshold — check other gate rules (window, assignment).'
                      : 'Score below threshold — face did not match the ticket holder.'}
                  </p>
                </div>
              )}

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedSecurityAlert.occurredAtIso && (
                  <>
                    <dt className="text-muted-foreground">When</dt>
                    <dd className="font-medium">
                      {new Date(selectedSecurityAlert.occurredAtIso).toLocaleString()}
                    </dd>
                  </>
                )}
                {selectedSecurityAlert.action && (
                  <>
                    <dt className="text-muted-foreground">Gate action</dt>
                    <dd className="font-medium capitalize">{selectedSecurityAlert.action.replace(/_/g, ' ')}</dd>
                  </>
                )}
                {selectedSecurityAlert.gateIndex != null && (
                  <>
                    <dt className="text-muted-foreground">Gate</dt>
                    <dd className="font-medium">#{selectedSecurityAlert.gateIndex}</dd>
                  </>
                )}
                {selectedSecurityAlert.ticketId != null && (
                  <>
                    <dt className="text-muted-foreground">Ticket ID</dt>
                    <dd className="font-medium">{selectedSecurityAlert.ticketId}</dd>
                  </>
                )}
                {selectedSecurityAlert.eventId != null && (
                  <>
                    <dt className="text-muted-foreground">Event ID</dt>
                    <dd className="font-medium">{selectedSecurityAlert.eventId}</dd>
                  </>
                )}
                {selectedSecurityAlert.eventName && (
                  <>
                    <dt className="text-muted-foreground">Event</dt>
                    <dd className="font-medium">{selectedSecurityAlert.eventName}</dd>
                  </>
                )}
                {selectedSecurityAlert.requestId && (
                  <>
                    <dt className="text-muted-foreground">Resale request</dt>
                    <dd className="font-medium font-mono text-xs break-all">
                      {selectedSecurityAlert.requestId}
                    </dd>
                  </>
                )}
                {selectedSecurityAlert.auditLogId && (
                  <>
                    <dt className="text-muted-foreground">Audit log</dt>
                    <dd className="font-medium font-mono text-xs break-all">
                      {selectedSecurityAlert.auditLogId}
                    </dd>
                  </>
                )}
                {selectedSecurityAlert.duplicateTicketCount != null && (
                  <>
                    <dt className="text-muted-foreground">Duplicate tickets</dt>
                    <dd className="font-medium">{selectedSecurityAlert.duplicateTicketCount}</dd>
                  </>
                )}
              </dl>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-start pt-2">
                {selectedSecurityAlert.navigateTo === 'ticket-history' &&
                  selectedSecurityAlert.ticketId != null && (
                    <Button type="button" onClick={() => followSecurityAlert(selectedSecurityAlert)}>
                      View ticket history
                    </Button>
                  )}
                {selectedSecurityAlert.navigateTo === 'entry-tools' &&
                  selectedSecurityAlert.eventMongoId && (
                    <Button type="button" onClick={() => followSecurityAlert(selectedSecurityAlert)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open entry gate tools
                    </Button>
                  )}
                {selectedSecurityAlert.navigateTo === 'resale' && (
                  <Button type="button" onClick={() => followSecurityAlert(selectedSecurityAlert)}>
                    Open resale monitoring
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setSelectedSecurityAlert(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
