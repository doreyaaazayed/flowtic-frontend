import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../ui/button';
import { AdminStatCard } from './AdminStatCard';
import { useAdminSection } from '../../context/AdminSectionContext';

type ChartRow = { month: string; users: number; events: number; revenue: number };

type PendingEvent = { _id: string; Name: string; organizer?: { Username?: string } };
type PendingOrganizer = { _id: string; organizationName?: string; Username?: string };
type PendingResale = {
  _id: string;
  listingId?: { eventId?: { Name?: string } };
  buyerId?: { Username?: string; Email?: string };
};

type AdminOverviewPanelProps = {
  statsLoading: boolean;
  adminStats: {
    totalUsers: number;
    activeEvents: number;
    platformRevenue: number;
    fraudCount: number;
  } | null;
  adminChart: ChartRow[];
  pendingEvents: PendingEvent[];
  pendingOrganizers: PendingOrganizer[];
  paymentPendingRequests: PendingResale[];
  labels: {
    totalUsers: string;
    activeEvents: string;
    platformRevenue: string;
    fraudDetected: string;
    loadingStats: string;
  };
};

const CHART_AXIS = 'rgba(148, 163, 184, 0.55)';
const CHART_GRID = 'rgba(148, 163, 184, 0.12)';

const GROWTH_COLORS = ['#f43f5e', '#8b5cf6', '#38bdf8', '#fbbf24', '#a78bfa', '#fb7185'];

const TOOLTIP_PANEL = {
  background: 'rgba(8,10,24,0.94)',
  border: '1px solid rgba(139,92,246,0.4)',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
};

type HealthRingRow = {
  key: 'users' | 'events' | 'revenue';
  label: string;
  value: number;
  color: string;
  current: number;
  previous: number;
  isCurrency?: boolean;
};

function AdminMonthChartTooltip({
  active,
  payload,
  label,
  highlight,
}: TooltipProps<number, string> & { highlight?: 'revenue' | 'users' }) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as ChartRow | undefined;
  if (!row) return null;

  const rows = [
    {
      key: 'revenue',
      label: t('admin.chartTooltipRevenue'),
      value: `EGP ${Number(row.revenue ?? 0).toLocaleString()}`,
      accent: highlight === 'revenue' ? 'text-rose-400' : 'text-foreground',
    },
    {
      key: 'users',
      label: t('admin.chartTooltipNewUsers'),
      value: Number(row.users ?? 0).toLocaleString(),
      accent: highlight === 'users' ? 'text-rose-400' : 'text-foreground',
    },
    {
      key: 'events',
      label: t('admin.chartTooltipNewEvents'),
      value: Number(row.events ?? 0).toLocaleString(),
      accent: 'text-foreground',
    },
  ];

  return (
    <div className="rounded-xl px-3 py-2.5 text-xs" style={TOOLTIP_PANEL}>
      <p className="font-semibold text-sm mb-2 text-foreground">
        {t('admin.chartTooltipMonth', { month: label ?? row.month })}
      </p>
      <ul className="space-y-1.5">
        {rows.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={`font-medium tabular-nums ${item.accent}`}>{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminHealthRingDetails({ ring }: { ring: HealthRingRow }) {
  const { t } = useTranslation();

  const delta = ring.current - ring.previous;
  const deltaLabel =
    delta > 0
      ? `+${ring.isCurrency ? `EGP ${delta.toLocaleString()}` : delta.toLocaleString()}`
      : delta < 0
        ? ring.isCurrency
          ? `-EGP ${Math.abs(delta).toLocaleString()}`
          : delta.toLocaleString()
        : t('admin.healthNoChange');

  const formatVal = (n: number) =>
    ring.isCurrency ? `EGP ${n.toLocaleString()}` : n.toLocaleString();

  const rows = [
    { label: t('admin.healthGrowth'), value: `${ring.value}%` },
    { label: t('admin.healthThisMonth'), value: formatVal(ring.current) },
    { label: t('admin.healthLastMonth'), value: formatVal(ring.previous) },
    {
      label: t('admin.healthVsPrevious'),
      value: deltaLabel,
      accent: delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : undefined,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-primary/25 bg-muted/20 px-4 py-3"
    >
      <p className="font-semibold text-sm mb-3" style={{ color: ring.color }}>
        {ring.label}
      </p>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground whitespace-nowrap">{row.label}</dt>
            <dd className={`font-medium tabular-nums text-right ${row.accent ?? 'text-foreground'}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function AdminOverviewPanel({
  statsLoading,
  adminStats,
  adminChart,
  pendingEvents,
  pendingOrganizers,
  paymentPendingRequests,
  labels,
}: AdminOverviewPanelProps) {
  const { t } = useTranslation();
  const { setSection } = useAdminSection();
  const [hoveredHealthRing, setHoveredHealthRing] = useState<HealthRingRow | null>(null);

  const latest = adminChart[adminChart.length - 1];
  const prev = adminChart[adminChart.length - 2];
  const userGrowth = pct(latest?.users ?? 0, Math.max(prev?.users ?? 1, 1));
  const eventGrowth = pct(latest?.events ?? 0, Math.max(prev?.events ?? 1, 1));
  const revenueGrowth = pct(latest?.revenue ?? 0, Math.max(prev?.revenue ?? 1, 1));

  const ringData: HealthRingRow[] = [
    {
      key: 'users',
      label: t('admin.healthUsers'),
      value: userGrowth,
      color: '#f43f5e',
      current: latest?.users ?? 0,
      previous: prev?.users ?? 0,
    },
    {
      key: 'events',
      label: t('admin.healthEvents'),
      value: eventGrowth,
      color: '#8b5cf6',
      current: latest?.events ?? 0,
      previous: prev?.events ?? 0,
    },
    {
      key: 'revenue',
      label: t('admin.healthRevenue'),
      value: revenueGrowth,
      color: '#38bdf8',
      current: latest?.revenue ?? 0,
      previous: prev?.revenue ?? 0,
      isCurrency: true,
    },
  ];

  const pendingItems = [
    ...pendingEvents.slice(0, 3).map((e) => ({
      id: e._id,
      title: e.Name,
      meta: e.organizer?.Username ?? 'Organizer pending',
      action: () => setSection('events'),
    })),
    ...pendingOrganizers.slice(0, 2).map((o) => ({
      id: o._id,
      title: o.organizationName ?? o.Username ?? 'Organizer application',
      meta: o.Username ?? 'New application',
      action: () => setSection('organizers'),
    })),
  ].slice(0, 5);

  const activityFeed: Array<{
    id: string;
    tag: string;
    title: string;
    body: string;
    onClick: () => void;
  }> = [
    ...pendingEvents.slice(0, 1).map((e) => ({
      id: `ev-${e._id}`,
      tag: t('admin.activityTagEvent'),
      title: e.Name,
      body: t('admin.activityEventPending'),
      onClick: () => setSection('events'),
    })),
    ...paymentPendingRequests.slice(0, 2).map((r) => ({
      id: `rs-${r._id}`,
      tag: t('admin.activityTagResale'),
      title:
        typeof r.listingId?.eventId === 'object' && r.listingId?.eventId?.Name
          ? r.listingId.eventId.Name
          : t('admin.activityResalePayment'),
      body: t('admin.activityResaleBuyer', {
        name: r.buyerId?.Username ?? r.buyerId?.Email ?? '—',
      }),
      onClick: () => setSection('resale'),
    })),
    ...pendingOrganizers.slice(0, 1).map((o) => ({
      id: `org-${o._id}`,
      tag: t('admin.activityTagOrganizer'),
      title: o.organizationName ?? t('admin.activityOrganizerApplication'),
      body: t('admin.activityOrganizerSubmitted', { name: o.Username ?? '—' }),
      onClick: () => setSection('organizers'),
    })),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-full text-muted-foreground py-6 text-center">{labels.loadingStats}</div>
        ) : (
          <>
            <AdminStatCard label={labels.totalUsers} value={adminStats ? adminStats.totalUsers.toLocaleString() : '—'} accent="rose" />
            <AdminStatCard label={labels.activeEvents} value={adminStats ? adminStats.activeEvents.toLocaleString() : '—'} accent="violet" />
            <AdminStatCard
              label={labels.platformRevenue}
              value={adminStats != null ? `EGP ${(adminStats.platformRevenue || 0).toLocaleString()}` : '—'}
              accent="sky"
            />
            <AdminStatCard
              label={labels.fraudDetected}
              value={adminStats ? String(adminStats.fraudCount) : '—'}
              accent="amber"
              onClick={() => setSection('security')}
              className="cursor-pointer hover:border-primary/35 transition-colors"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 admin-panel lg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h3 className="text-lg font-semibold">Platform revenue</h3>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Last 6 months</span>
          </div>
          {adminChart.length === 0 && !statsLoading ? (
            <p className="text-muted-foreground py-16 text-center">No revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={adminChart}>
                <defs>
                  <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" stroke={CHART_AXIS} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke={CHART_AXIS} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  cursor={{ stroke: 'rgba(244,63,94,0.35)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={<AdminMonthChartTooltip highlight="revenue" />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fill="url(#adminRevenueFill)"
                  activeDot={{ r: 6, stroke: '#f43f5e', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="admin-panel lg-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Needs review</h3>
              <Button variant="ghost" size="sm" className="text-primary h-8 px-2" onClick={() => setSection('events')}>
                View all
              </Button>
            </div>
            {pendingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing pending right now.</p>
            ) : (
              <ul className="space-y-3">
                {pendingItems.map((item) => (
                  <li key={item.id} className="admin-list-row flex items-center justify-between gap-3 rounded-2xl px-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.meta}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 h-8 rounded-full text-xs" onClick={item.action}>
                      Review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-panel lg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-lg font-semibold">{t('admin.growthTitle')}</h3>
              <span className="text-xs uppercase tracking-widest text-muted-foreground shrink-0">
                {t('admin.growthPeriod')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              {t('admin.growthDescription')}
            </p>
            {adminChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('admin.growthNoData')}</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={adminChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke={CHART_AXIS}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      interval={0}
                      tick={{ fill: CHART_AXIS }}
                    />
                    <YAxis
                      stroke={CHART_AXIS}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={32}
                      allowDecimals={false}
                      tick={{ fill: CHART_AXIS }}
                      label={{
                        value: t('admin.growthYAxis'),
                        angle: -90,
                        position: 'insideLeft',
                        fill: CHART_AXIS,
                        fontSize: 10,
                        dx: 8,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(139,92,246,0.12)' }}
                      content={<AdminMonthChartTooltip highlight="users" />}
                    />
                    <Bar
                      dataKey="users"
                      name={t('admin.growthTooltipUsers')}
                      radius={[8, 8, 0, 0]}
                      activeBar={{ fill: '#fb7185', stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }}
                    >
                      {adminChart.map((_, i) => (
                        <Cell key={i} fill={GROWTH_COLORS[i % GROWTH_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  {t('admin.growthLegend')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 admin-panel lg-card p-5 sm:p-6 overflow-visible">
          <h3 className="text-lg font-semibold mb-2">Platform health</h3>
          <p className="text-xs text-muted-foreground mb-5">{t('admin.healthHint')}</p>
          <div className="grid grid-cols-3 gap-3">
            {ringData.map((ring) => {
              const active = hoveredHealthRing?.key === ring.key;
              return (
                <button
                  key={ring.key}
                  type="button"
                  className={`flex flex-col items-center rounded-2xl p-2 transition-colors duration-500 ease-out outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active ? 'bg-muted/30' : 'hover:bg-muted/20'
                  }`}
                  onMouseEnter={() => setHoveredHealthRing(ring)}
                  onMouseLeave={() => setHoveredHealthRing(null)}
                  onFocus={() => setHoveredHealthRing(ring)}
                  onBlur={() => setHoveredHealthRing(null)}
                  aria-label={t('admin.healthRingAria', { label: ring.label, value: ring.value })}
                >
                  <div className="relative h-[92px] w-[92px] pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'growth', value: ring.value },
                            { name: 'rest', value: Math.max(0, 100 - ring.value) },
                          ]}
                          innerRadius={30}
                          outerRadius={42}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          stroke="none"
                          animationDuration={1400}
                          animationEasing="ease-in-out"
                          animationBegin={ring.key === 'users' ? 0 : ring.key === 'events' ? 180 : 360}
                        >
                          <Cell
                            fill={ring.color}
                            opacity={active ? 1 : 0.85}
                            style={{ transition: 'opacity 500ms ease-out' }}
                          />
                          <Cell fill="rgba(148,163,184,0.15)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                      {ring.value}%
                    </span>
                  </div>
                  <p className={`mt-2 text-xs transition-colors duration-500 ease-out ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {ring.label}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 min-h-[7.5rem]">
            <AnimatePresence mode="wait">
              {hoveredHealthRing ? (
                <AdminHealthRingDetails key={hoveredHealthRing.key} ring={hoveredHealthRing} />
              ) : (
                <motion.p
                  key="health-prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="text-xs text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border/50"
                >
                  {t('admin.healthHoverPrompt')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="xl:col-span-7 admin-panel lg-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <Link to="/white-market" className="text-xs font-medium text-primary hover:underline">
              White Market
            </Link>
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent admin alerts.</p>
          ) : (
            <ul className="space-y-3">
              {activityFeed.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="admin-list-row flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left border border-transparent transition-colors hover:bg-muted/40 hover:border-primary/25 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{item.title}</span>{' '}
                        <span className="text-primary">[{item.tag}]</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:text-primary group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
