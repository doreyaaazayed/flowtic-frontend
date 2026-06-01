import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Shield, Sparkles, ChevronRight, Info, Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { AIBadge } from '../components/AIBadge';
import {
  events as eventsApi,
  ticketCategories as ticketCategoriesApi,
  venues as venuesApi,
  seatMap as seatMapApi,
  type SeatMapSection,
  type SeatMapLayout,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { SeatMapTemplatePicker } from '../components/seat-map/SeatMapTemplatePicker';
import { StagePositionPicker } from '../components/seat-map/StagePositionPicker';
import type { StagePosition } from '../components/seat-map/stagePosition';
import { normalizeStagePosition } from '../components/seat-map/stagePosition';

import { eventCardImageSrc } from '../lib/eventImage';
import {
  isExternalVenueRedacted,
  resolveEventMapQuery,
  resolveEventVenueLabel,
} from '../lib/eventHosting';
import { VenueMapEmbed } from '../components/VenueMapEmbed';

type SeatMapSectionForm = {
  name: string;
  ticketCategoryId: string;
  rows: Array<{ label: string; seatCount: number; rowFraction?: number }>;
  layout?: SeatMapLayout;
  placement?: "grid" | "arc";
};

export function EventDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const setupSeatMap = searchParams.get('setupSeatMap') === '1';
  const [event, setEvent] = useState<{
    _id: string;
    Name: string;
    Description?: string;
    StartDate: string;
    EndDate: string;
    VenueID?: number;
    CategoryID: number;
    hostingMode?: string;
    externalVenue?: { name?: string; location?: string; address?: string; capacity?: number };
    venueDetailsRevealed?: boolean;
    Status: string;
    capacity?: number;
    isSeated?: boolean;
    organizer?: string;
    seatMapFloorPlanUrl?: string;
    seatMapStagePosition?: StagePosition;
    imageUrl?: string;
  } | null>(null);
  const [ticketCats, setTicketCats] = useState<Array<{ _id: string; Name: string; Price: number; TotalQuantity: number }>>([]);
  const [venueName, setVenueName] = useState<string>('');
  const [venueMapQuery, setVenueMapQuery] = useState<string | null>(null);
  const [venueIsPublicOnly, setVenueIsPublicOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seatMapSections, setSeatMapSections] = useState<SeatMapSectionForm[]>([]);
  const [seatMapSubmitting, setSeatMapSubmitting] = useState(false);
  const [seatMapError, setSeatMapError] = useState('');
  const [seatMapDone, setSeatMapDone] = useState(false);
  const [existingSeatMapCount, setExistingSeatMapCount] = useState<number | null>(null);
  const [seatSetupMode, setSeatSetupMode] = useState<'template' | 'manual'>('template');
  const [enablingSeated, setEnablingSeated] = useState(false);
  const [deletingSeats, setDeletingSeats] = useState(false);
  const [floorPlanUploading, setFloorPlanUploading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [seatMapStagePosition, setSeatMapStagePosition] = useState<StagePosition>('bottom');
  const [savingStagePosition, setSavingStagePosition] = useState(false);
  const MAX_FLOOR_PLAN_MB = 2;

  const seedSeatMapSections = (cats: Array<{ _id: string }>) => {
    setSeatMapSections([
      { name: 'Platinum', ticketCategoryId: cats[0]?._id ?? '', rows: [{ label: 'A', seatCount: 10 }, { label: 'B', seatCount: 10 }] },
      { name: 'Gold', ticketCategoryId: cats[1]?._id ?? cats[0]?._id ?? '', rows: [{ label: 'A', seatCount: 8 }, { label: 'B', seatCount: 8 }] },
    ].filter((s) => s.ticketCategoryId));
  };

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setExistingSeatMapCount(null);
    setSeatMapDone(false);
    setSeatMapError('');
    setSeatMapSections([]);
    eventsApi
      .get(id, { signal: controller.signal, invite: searchParams.get('invite') ?? undefined })
      .then((ev) => {
        if (controller.signal.aborted) return null;
        setEvent(ev);
        const fetchSeatMap = setupSeatMap || ev.isSeated === true;
        return Promise.all([
          ticketCategoriesApi.listByEvent(id),
          venuesApi.list({ signal: controller.signal }),
          fetchSeatMap ? seatMapApi.get(id) : Promise.resolve(null),
          Promise.resolve(ev),
        ]);
      })
      .then((result) => {
        if (!result || controller.signal.aborted) return;
        const [cats, venues, seatMapRes, ev] = result;
        setTicketCats(cats);
        const venueRows = venues as Array<{ VenueID: number; Name: string; Location: string }>;
        setVenueName(resolveEventVenueLabel(ev, venueRows));
        setVenueMapQuery(resolveEventMapQuery(ev, venueRows));
        setVenueIsPublicOnly(isExternalVenueRedacted(ev));
        if (seatMapRes) {
          if (seatMapRes.stagePosition) {
            setSeatMapStagePosition(normalizeStagePosition(seatMapRes.stagePosition));
          }
          if (seatMapRes.sections?.length) {
            const count = seatMapRes.sections.reduce(
              (acc, s) => acc + s.rows.reduce((a, r) => a + (r.seats?.length ?? 0), 0),
              0,
            );
            setExistingSeatMapCount(count);
          }
        }
        if (ev.seatMapStagePosition) {
          setSeatMapStagePosition(normalizeStagePosition(ev.seatMapStagePosition));
        }
        if (
          ev.isSeated === true &&
          (!seatMapRes?.sections?.length || seatMapRes.sections.length === 0)
        ) {
          seedSeatMapSections(cats);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, setupSeatMap, searchParams]);


  if (loading || (!event && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t('eventDetails.loading')}</div>
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event not found</h2>
          <Link to="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const organizerId = event.organizer != null ? String(event.organizer) : '';
  const canManageEvent =
    !!user && (user.role === 'admin' || String(user.id) === organizerId);
  const seatMapConfigured = existingSeatMapCount != null && existingSeatMapCount > 0;
  const showSeatMapPanel =
    canManageEvent &&
    (setupSeatMap || (event.isSeated === true && !seatMapConfigured));

  const ticketTypes = ticketCats.map((t) => ({
    type: t.Name,
    price: t.Price,
    available: t.TotalQuantity,
    sold: false,
    ticketCategoryId: t._id,
  }));

  const addSeatMapSection = () => {
    setSeatMapSections((prev) => [
      ...prev,
      { name: '', ticketCategoryId: ticketCats[0]?._id ?? '', rows: [{ label: 'A', seatCount: 10 }] },
    ]);
  };
  const updateSeatMapSection = (idx: number, field: keyof SeatMapSectionForm, value: string | Array<{ label: string; seatCount: number }>) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      (next[idx] as Record<string, unknown>)[field] = value;
      return next;
    });
  };
  const updateSeatMapRow = (secIdx: number, rowIdx: number, field: 'label' | 'seatCount', value: string | number) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      const rows = [...next[secIdx].rows];
      if (field === 'label') rows[rowIdx] = { ...rows[rowIdx], label: String(value) };
      else rows[rowIdx] = { ...rows[rowIdx], seatCount: Number(value) || 0 };
      next[secIdx] = { ...next[secIdx], rows };
      return next;
    });
  };
  const addRowToSection = (secIdx: number) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      const rows = [...next[secIdx].rows];
      const last = rows[rows.length - 1];
      const nextLabel = last?.label ? String.fromCharCode(last.label.charCodeAt(0) + 1) : 'A';
      rows.push({ label: nextLabel, seatCount: 10 });
      next[secIdx] = { ...next[secIdx], rows };
      return next;
    });
  };
  const removeRowFromSection = (secIdx: number, rowIdx: number) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      next[secIdx] = { ...next[secIdx], rows: next[secIdx].rows.filter((_, i) => i !== rowIdx) };
      return next;
    });
  };
  const removeSeatMapSection = (secIdx: number) => {
    setSeatMapSections((prev) => prev.filter((_, i) => i !== secIdx));
  };
  const handleEnableSeatedEvent = async () => {
    if (!id) return;
    setSeatMapError('');
    setEnablingSeated(true);
    try {
      await eventsApi.update(id, { isSeated: true });
      setEvent((prev) => (prev ? { ...prev, isSeated: true } : null));
      const seatMapRes = await seatMapApi.get(id);
      setExistingSeatMapCount(null);
      if (seatMapRes?.sections?.length) {
        const count = seatMapRes.sections.reduce(
          (acc, s) => acc + s.rows.reduce((a, r) => a + (r.seats?.length ?? 0), 0),
          0
        );
        setExistingSeatMapCount(count);
      } else {
        seedSeatMapSections(ticketCats);
      }
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : 'Could not enable seated event. You must be the organizer or an admin.');
    } finally {
      setEnablingSeated(false);
    }
  };

  const handleClearFloorPlan = async () => {
    if (!id) return;
    setSeatMapError('');
    setFloorPlanUploading(true);
    try {
      await eventsApi.update(id, { seatMapFloorPlanUrl: '' });
      setEvent((prev) => (prev ? { ...prev, seatMapFloorPlanUrl: undefined } : null));
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : 'Could not remove floor plan');
    } finally {
      setFloorPlanUploading(false);
    }
  };

  const handleFloorPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!file.type.startsWith('image/')) {
      setSeatMapError('Please upload an image file.');
      return;
    }
    if (file.size > MAX_FLOOR_PLAN_MB * 1024 * 1024) {
      setSeatMapError(`Floor plan must be under ${MAX_FLOOR_PLAN_MB} MB.`);
      return;
    }
    setSeatMapError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFloorPlanUploading(true);
      try {
        const res = await seatMapApi.saveFloorPlan(id, dataUrl);
        setEvent((prev) => (prev ? { ...prev, seatMapFloorPlanUrl: res.seatMapFloorPlanUrl } : null));
      } catch (err) {
        setSeatMapError(err instanceof Error ? err.message : 'Could not save floor plan');
      } finally {
        setFloorPlanUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAnalyzeFloorPlan = async () => {
    if (!id) return;
    setAnalyzeLoading(true);
    setSeatMapError('');
    try {
      const { sections, stagePosition } = await seatMapApi.analyze(id);
      if (stagePosition) setSeatMapStagePosition(normalizeStagePosition(stagePosition));
      setSeatMapSections(
        sections.map((s) => ({
          name: s.name,
          ticketCategoryId: s.ticketCategoryId,
          rows: s.rows.map((r) => ({
            label: r.label,
            seatCount: r.seatCount,
            ...(r.rowFraction != null && Number.isFinite(r.rowFraction) ? { rowFraction: r.rowFraction } : {}),
          })),
          ...(s.layout ? { layout: s.layout } : {}),
          ...(s.placement === "arc" ? { placement: "arc" as const } : {}),
        }))
      );
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleDeleteSeatMap = async () => {
    if (!id) return;
    if (!window.confirm('This will delete all seats and tickets for this event. Buyers with existing bookings will not be affected but the seat map will be gone. Continue?')) return;
    setDeletingSeats(true);
    setSeatMapError('');
    try {
      await seatMapApi.deleteSeatMap(id);
      setExistingSeatMapCount(null);
      setSeatMapDone(false);
      seedSeatMapSections(ticketCats);
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : 'Could not delete seat map');
    } finally {
      setDeletingSeats(false);
    }
  };

  const handleSeatMapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSeatMapError('');
    const sections: SeatMapSection[] = seatMapSections
      .filter((s) => s.ticketCategoryId && s.name.trim() && s.rows.some((r) => r.seatCount > 0))
      .map((s) => ({
        name: s.name.trim(),
        ticketCategoryId: s.ticketCategoryId,
        rows: s.rows
          .filter((r) => r.seatCount > 0)
          .map((r) => ({
            label: r.label.trim() || 'A',
            seatCount: r.seatCount,
            ...(r.rowFraction != null && Number.isFinite(r.rowFraction) ? { rowFraction: r.rowFraction } : {}),
          })),
        ...(s.layout ? { layout: s.layout } : {}),
        ...(s.placement === 'arc' ? { placement: 'arc' as const } : {}),
      }));
    if (sections.length === 0) {
      setSeatMapError('Add at least one section with a category, name, and rows with seat count > 0.');
      return;
    }
    setSeatMapSubmitting(true);
    try {
      await seatMapApi.create(id, { sections, stagePosition: seatMapStagePosition });
      setSeatMapDone(true);
      setSearchParams((p) => { p.delete('setupSeatMap'); return p; });
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : 'Failed to create seat map');
    } finally {
      setSeatMapSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Image */}
      <div className="relative h-[400px] md:h-[500px]">
        <img
          src={eventCardImageSrc(event.imageUrl)}
          alt={event.Name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 cosmic-event-hero-fade" />
        
        {/* Breadcrumb */}
        <div className="absolute top-8 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-white">
              <Link to="/events" className="hover:underline">Events</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="font-medium">{event.Name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-20">
        {showSeatMapPanel && (
          <div className="cosmic-panel cosmic-panel-glow rounded-2xl border-2 border-primary/40 p-8 mb-6 scroll-mt-24 relative z-20">
            <h3 className="text-xl font-semibold mb-2">Set up seat map</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Define sections and rows so each seat has a unique number for F&B delivery (e.g. Platinum - Row C - Seat 9).
            </p>
            {!event.isSeated ? (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <p className="text-sm">
                  This event is not marked as <strong>seated</strong> yet, so the seat map builder stays hidden. That often happens for events created before this option existed, or if the checkbox was not selected when creating the event.
                </p>
                <Button type="button" disabled={enablingSeated} onClick={handleEnableSeatedEvent}>
                  {enablingSeated ? 'Enabling…' : 'Enable seated event & continue'}
                </Button>
                {seatMapError && (
                  <p className="text-sm text-destructive">{seatMapError}</p>
                )}
              </div>
            ) : existingSeatMapCount != null && existingSeatMapCount > 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <p className="font-medium text-green-700 dark:text-green-400">Seat map configured — {existingSeatMapCount} seats ready for buyers.</p>
                <p className="text-sm text-muted-foreground">Customers visiting the purchase page will see the interactive seat map and can select individual seats.</p>
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" onClick={() => setSearchParams((p) => { p.delete('setupSeatMap'); return p; })}>
                    Done
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={deletingSeats}
                    onClick={handleDeleteSeatMap}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {deletingSeats ? 'Deleting…' : 'Reset & rebuild seat map'}
                  </Button>
                </div>
                {seatMapError && <p className="text-sm text-destructive">{seatMapError}</p>}
              </div>
            ) : seatMapDone ? (
              <div className="p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 space-y-3">
                <p className="font-semibold">Seat map created successfully!</p>
                <p className="text-sm">Customers can now select seats on the purchase page. F&B can use seat numbers for delivery.</p>
                <div className="flex gap-3 flex-wrap">
                  <Link to={`/purchase/${id}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      Preview purchase page
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => { setSeatMapDone(false); setExistingSeatMapCount(null); seedSeatMapSections(ticketCats); }}>
                    Reset & rebuild
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {seatMapError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{seatMapError}</div>
                )}
                {ticketCats.length === 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
                    Add at least one ticket category (name + price) to this event first before building the seat map.
                  </div>
                )}

                {/* mode toggle */}
                <div className="flex gap-2 border-b border-border pb-3">
                  <button
                    type="button"
                    onClick={() => setSeatSetupMode('template')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      seatSetupMode === 'template'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    🏛️ Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeatSetupMode('manual')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      seatSetupMode === 'manual'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    ✏️ Manual
                  </button>
                </div>

                {/* ── TEMPLATE MODE ── */}
                {seatSetupMode === 'template' && (
                  <SeatMapTemplatePicker
                    ticketCategories={ticketCats}
                    initialStagePosition={seatMapStagePosition}
                    onApply={(sections, stagePos) => {
                      setSeatMapStagePosition(stagePos);
                      setSeatMapSections(
                        sections.map((s) => ({
                          name: s.name,
                          ticketCategoryId: s.ticketCategoryId,
                          rows: s.rows,
                          placement: s.placement,
                        }))
                      );
                      setSeatSetupMode('manual');
                    }}
                  />
                )}

                {/* ── MANUAL / REVIEW MODE ── */}
                {seatSetupMode === 'manual' && (
                  <form onSubmit={handleSeatMapSubmit} className="space-y-5">
                    <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
                      <StagePositionPicker
                        value={seatMapStagePosition}
                        onChange={async (pos) => {
                          setSeatMapStagePosition(pos);
                          if (existingSeatMapCount != null && existingSeatMapCount > 0 && id) {
                            setSavingStagePosition(true);
                            try {
                              await eventsApi.update(id, { seatMapStagePosition: pos });
                              setEvent((prev) => (prev ? { ...prev, seatMapStagePosition: pos } : null));
                            } catch (err) {
                              setSeatMapError(
                                err instanceof Error ? err.message : 'Could not save stage position',
                              );
                            } finally {
                              setSavingStagePosition(false);
                            }
                          }
                        }}
                      />
                      {savingStagePosition ? (
                        <p className="text-xs text-muted-foreground">Saving stage position…</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Upload a stadium photo below and use <strong>Analyze with AI</strong> — we detect
                        sections and suggest where the pitch sits.
                      </p>
                    </div>

                    {/* optional floor plan */}
                    <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                      <p className="text-sm font-medium">Floor plan image (optional)</p>
                      <p className="text-xs text-muted-foreground">
                        Upload a venue diagram image. It will be shown as a background overlay on the interactive seat map that buyers see at checkout.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          key={`floor-plan-file-${id}`}
                          id={`seat-map-floor-plan-${id}`}
                          name="seat_map_floor_plan"
                          type="file"
                          accept="image/*"
                          disabled={floorPlanUploading}
                          onChange={handleFloorPlanUpload}
                          className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-primary-foreground"
                        />
                        {event.seatMapFloorPlanUrl && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2 bg-gradient-to-r from-primary to-secondary text-white"
                              disabled={analyzeLoading || floorPlanUploading}
                              onClick={handleAnalyzeFloorPlan}
                            >
                              <Sparkles className="w-4 h-4" />
                              {analyzeLoading ? 'Analyzing…' : 'Analyze with AI'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={floorPlanUploading}
                              onClick={handleClearFloorPlan}
                            >
                              Remove image
                            </Button>
                          </>
                        )}
                      </div>
                      {floorPlanUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
                      {event.seatMapFloorPlanUrl && (
                        <img
                          src={event.seatMapFloorPlanUrl}
                          alt="Floor plan"
                          className="max-h-40 rounded-lg border border-border object-contain bg-muted"
                        />
                      )}
                    </div>

                    {/* sections editor */}
                    {seatMapSections.map((sec, secIdx) => (
                      <div key={secIdx} className="p-4 rounded-xl border border-border space-y-3">
                        <div className="flex flex-wrap gap-3 items-center">
                          <input
                            type="text"
                            placeholder="Section name (e.g. Platinum)"
                            value={sec.name}
                            onChange={(e) => updateSeatMapSection(secIdx, 'name', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <Select
                            value={sec.ticketCategoryId || undefined}
                            onValueChange={(v) => updateSeatMapSection(secIdx, 'ticketCategoryId', v)}
                          >
                            <SelectTrigger className="min-w-[10rem] h-9">
                              <SelectValue placeholder="Ticket type" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {ticketCats.map((c) => (
                                <SelectItem key={c._id} value={c._id}>
                                  {c.Name} – EGP {c.Price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeSeatMapSection(secIdx)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2 pl-2">
                          {sec.rows.map((row, rowIdx) => (
                            <div key={rowIdx} className="flex gap-2 items-center">
                              <span className="text-xs text-muted-foreground w-8">Row</span>
                              <input
                                type="text"
                                maxLength={3}
                                value={row.label}
                                onChange={(e) => updateSeatMapRow(secIdx, rowIdx, 'label', e.target.value)}
                                className="w-12 px-2 py-1.5 text-center rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <input
                                type="number"
                                min={1}
                                value={row.seatCount}
                                onChange={(e) => updateSeatMapRow(secIdx, rowIdx, 'seatCount', e.target.value)}
                                className="w-20 px-2 py-1.5 rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <span className="text-xs text-muted-foreground">seats</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeRowFromSection(secIdx, rowIdx)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => addRowToSection(secIdx)}>
                            <Plus className="w-4 h-4 mr-1" /> Add row
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-3 flex-wrap">
                      <Button type="button" variant="outline" onClick={addSeatMapSection}>
                        <Plus className="w-4 h-4 mr-1" /> Add section
                      </Button>
                      <Button
                        type="submit"
                        disabled={seatMapSubmitting || ticketCats.length === 0}
                        className="bg-gradient-to-r from-primary to-secondary text-white"
                      >
                        {seatMapSubmitting ? 'Creating seats…' : 'Generate seat map'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="cosmic-panel p-8 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {event.Status}
                    </span>
                    {event.Status === 'Active' && (
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent-orange to-accent text-white text-sm font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.Name}</h1>
                  <p className="text-muted-foreground mb-2">
                    Venue: <span className="text-foreground font-medium">{venueName || '—'}</span>
                  </p>
                  {venueIsPublicOnly && (
                    <p className="text-xs text-muted-foreground mb-4 max-w-xl">
                      {t('eventDetails.venuePublicOnly')}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                    <p className="font-medium">
                      {new Date(event.StartDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.StartDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {new Date(event.EndDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {venueIsPublicOnly ? t('eventDetails.venueAreaLabel') : 'Location'}
                    </p>
                    <p className="font-medium">{venueName || '—'}</p>
                    {venueIsPublicOnly && (
                      <p className="text-xs text-muted-foreground mt-1">{t('eventDetails.venuePublicOnly')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Capacity</p>
                    <p className="font-medium">{(event.capacity ?? 0).toLocaleString()} capacity</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-accent-orange" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="font-medium">Approx. 3-4 hours</p>
                    <p className="text-sm text-muted-foreground">Doors open 30 min early</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full justify-start mb-6">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="venue">Venue Map</TabsTrigger>
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                </TabsList>
                
                <TabsContent value="description" className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">About This Event</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {event.Description || 'No description available.'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">What to Expect</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        World-class performances from top artists
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        State-of-the-art sound and lighting systems
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        Food and beverage options available
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        Secure and organized entry with AI technology
                      </li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="venue">
                  {venueMapQuery ? (
                    <VenueMapEmbed query={venueMapQuery} label={venueName || undefined} height={400} />
                  ) : (
                    <div className="flex h-[400px] items-center justify-center rounded-xl bg-muted">
                      <div className="text-center px-6">
                        <MapPin className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('eventDetails.venueMapUnavailable')}</p>
                        {venueName && venueName !== '—' && (
                          <p className="mt-1 text-sm text-muted-foreground">{venueName}</p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="faq">
                  <div className="space-y-4">
                    {[
                      { q: "What should I bring?", a: "Your digital ticket (QR code) and valid ID. No paper tickets required!" },
                      { q: "Is there parking available?", a: "Yes, parking is available at the venue. We recommend arriving early." },
                      { q: "Can I transfer my ticket?", a: "Yes, tickets can be transferred through our secure white market." },
                      { q: "What are the COVID-19 safety measures?", a: "We follow all local health guidelines. Face ID entry helps minimize contact." }
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-muted/50">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          {item.q}
                        </h4>
                        <p className="text-muted-foreground text-sm">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* AI Security Info */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">AI-Powered Security</h3>
                    <AIBadge text="AI Verified" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    This event uses Face ID verification for secure, contactless entry. You'll register your face during ticket purchase for a seamless check-in experience.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Instant entry verification</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Fraud prevention</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Smart crowd management</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Ticket Purchase */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="cosmic-panel p-6">
                <h3 className="text-xl font-semibold mb-4">Select Tickets</h3>
                
                <div className="space-y-3 mb-6">
                  {ticketTypes.map((ticket, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        ticket.sold
                          ? 'border-border bg-muted/30 opacity-60'
                          : 'border-border hover:border-primary cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{ticket.type}</p>
                          <p className="text-2xl font-bold text-primary">EGP {ticket.price}</p>
                        </div>
                        {ticket.sold ? (
                          <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                            Sold Out
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {ticket.available} left
                          </span>
                        )}
                      </div>
                      {ticket.type.toLowerCase().includes('vip') && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Priority entry</li>
                          <li>• Premium seating</li>
                          <li>• Exclusive lounge access</li>
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {canManageEvent && (
                  <Link to={`/creator/events/${event._id}/edit`} className="block mb-3">
                    <Button variant="outline" className="w-full gap-2">
                      <Pencil className="h-4 w-4" />
                      {t('creator.edit.editButton')}
                    </Button>
                  </Link>
                )}

                <Link to={`/purchase/${event._id}`}>
                  <Button className="w-full mb-3 bg-gradient-to-r from-primary to-secondary text-lg h-12">
                    {t('eventDetails.buyTickets')}
                  </Button>
                </Link>
                
                <Link to={`/event/${event._id}/food`}>
                  <Button variant="outline" className="w-full mb-4">
                    {t('foodOrder.preOrderFood')}
                  </Button>
                </Link>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    Tickets are non-refundable but can be resold on our verified marketplace
                  </p>
                  <Link to="/white-market" className="text-sm text-primary hover:underline">
                    Learn about ticket resale →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
