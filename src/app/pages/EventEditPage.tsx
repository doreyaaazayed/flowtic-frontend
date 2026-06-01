import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Package, Plus, Save, Star, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import {
  categories as categoriesApi,
  events as eventsApi,
  seatMap as seatMapApi,
  ticketCategories as ticketCategoriesApi,
  venues as venuesApi,
} from '../lib/api';
import { EventHostingModePicker } from '../components/EventHostingModePicker';
import { EventSeatMapEditor } from '../components/EventSeatMapEditor';
import { MegaStarPicker } from '../components/MegaStarPicker';
import type { StagePosition } from '../components/seat-map/stagePosition';
import {
  catalogueItemLabelWithPrice,
  catalogueSelectionTotalEgp,
  formatEgp,
} from '../data/eventSetupCatalogue';
import {
  buildMegaStarPayload,
  formatMegaStarEgp,
  getMegaStarById,
} from '../data/megaStarCatalogue';
import {
  type EquipmentDraftEntry,
  loadEquipmentDraft,
  saveEquipmentDraft,
} from '../lib/eventEquipmentDraft';
import {
  saveEventCategoryDraft,
} from '../lib/eventCategoryDraft';
import {
  type EventHostingMode,
  equipmentRequired,
  usesExternalVenue,
  usesPlatformEquipment,
  usesPlatformVenue,
} from '../lib/eventHosting';
import { eventCardImageSrc } from '../lib/eventImage';

type TicketRow = {
  _id?: string;
  name: string;
  price: string;
  quantity: string;
  _pendingDelete?: boolean;
};

const ADMIN_STATUSES = ['Pending', 'AwaitingDeposit', 'Active', 'Rejected', 'Cancelled', 'Completed'];

function splitIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function EventEditPage() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [categoryList, setCategoryList] = useState<Array<{ _id: string; CategoryID: number; Name: string }>>([]);
  const [venueList, setVenueList] = useState<Array<{ _id: string; VenueID: number; Name: string; Location: string }>>([]);
  const [eventStatus, setEventStatus] = useState('');
  const [adminStatus, setAdminStatus] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSeated, setIsSeated] = useState(false);
  const [seatMapSeatCount, setSeatMapSeatCount] = useState<number | null>(null);
  const [seatMapFloorPlanUrl, setSeatMapFloorPlanUrl] = useState<string | null>(null);
  const [seatMapStagePosition, setSeatMapStagePosition] = useState<StagePosition>('bottom');
  const hasSeatMap = seatMapSeatCount != null && seatMapSeatCount > 0;

  const [hostingMode, setHostingMode] = useState<EventHostingMode>('full_setup');
  const [venueId, setVenueId] = useState('');
  const [externalVenueName, setExternalVenueName] = useState('');
  const [externalVenueLocation, setExternalVenueLocation] = useState('');
  const [externalVenueAddress, setExternalVenueAddress] = useState('');
  const [externalVenueCapacity, setExternalVenueCapacity] = useState('');

  const [equipment, setEquipment] = useState<EquipmentDraftEntry[]>([]);
  const [megaStarEnabled, setMegaStarEnabled] = useState(false);
  const [megaStarId, setMegaStarId] = useState('');
  const [megaStarDurationId, setMegaStarDurationId] = useState('');

  const [ticketRows, setTicketRows] = useState<TicketRow[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);

  const selectedMegaStar = getMegaStarById(megaStarId);
  const selectedMegaStarDuration = selectedMegaStar?.durations.find((d) => d.id === megaStarDurationId);
  const megaStarPriceEgp = selectedMegaStarDuration?.priceEgp ?? 0;

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const [ev, cats, venues, tickets] = await Promise.all([
        eventsApi.get(eventId),
        categoriesApi.list(),
        venuesApi.list(),
        ticketCategoriesApi.listByEvent(eventId),
      ]);
      setCategoryList(cats);
      setVenueList(venues);

      const organizerId = ev.organizer != null ? String(ev.organizer) : '';
      const canEdit =
        isAdmin || (user?.id && organizerId && String(user.id) === organizerId);
      if (!canEdit) {
        setForbidden(true);
        return;
      }

      setEventStatus(ev.Status);
      setAdminStatus(ev.Status);
      setName(ev.Name ?? '');
      setDescription(ev.Description ?? '');
      const cat = cats.find((c) => c.CategoryID === ev.CategoryID);
      setCategoryId(cat?._id ?? '');
      if (cat) saveEventCategoryDraft(cat._id, cat.Name);

      const start = splitIso(ev.StartDate);
      const end = splitIso(ev.EndDate);
      setDate(start.date);
      setStartTime(start.time);
      setEndTime(end.time);

      setImageUrl(ev.imageUrl ?? null);
      setIsSeated(Boolean(ev.isSeated));
      setHostingMode((ev.hostingMode as EventHostingMode) ?? 'full_setup');

      if (ev.VenueID != null) {
        const v = venues.find((x) => x.VenueID === ev.VenueID);
        setVenueId(v?._id ?? '');
      }
      if (ev.externalVenue) {
        setExternalVenueName(ev.externalVenue.name ?? '');
        setExternalVenueLocation(ev.externalVenue.location ?? '');
        setExternalVenueAddress(ev.externalVenue.address ?? '');
        setExternalVenueCapacity(
          ev.externalVenue.capacity != null ? String(ev.externalVenue.capacity) : '',
        );
      }

      const eqSel = (ev as { equipmentSelection?: EquipmentDraftEntry[] }).equipmentSelection;
      if (Array.isArray(eqSel) && eqSel.length > 0) {
        setEquipment(eqSel);
        saveEquipmentDraft(eqSel);
      } else {
        setEquipment(loadEquipmentDraft());
      }

      if (ev.megaStar?.starId) {
        setMegaStarEnabled(true);
        setMegaStarId(ev.megaStar.starId);
        setMegaStarDurationId(ev.megaStar.durationId ?? '');
      }

      setTicketRows(
        tickets.map((tc) => ({
          _id: tc._id,
          name: tc.Name,
          price: String(tc.Price),
          quantity: String(tc.TotalQuantity ?? 0),
        })),
      );

      setSeatMapFloorPlanUrl(
        (ev as { seatMapFloorPlanUrl?: string }).seatMapFloorPlanUrl ?? null,
      );
      const stagePos = (ev as { seatMapStagePosition?: StagePosition }).seatMapStagePosition;
      if (stagePos) setSeatMapStagePosition(stagePos);

      if (ev.isSeated) {
        try {
          const sm = await seatMapApi.get(eventId);
          if (sm.stagePosition) setSeatMapStagePosition(sm.stagePosition as StagePosition);
          const count =
            sm.sections?.reduce(
              (acc, s) => acc + s.rows.reduce((a, r) => a + (r.seats?.length ?? 0), 0),
              0,
            ) ?? 0;
          setSeatMapSeatCount(count > 0 ? count : null);
        } catch {
          setSeatMapSeatCount(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('creator.edit.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [eventId, isAdmin, user?.id, t]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setError(null);
    setSuccess(null);

    const category = categoryList.find((c) => c._id === categoryId);
    if (!category) {
      setError(t('creator.edit.errors.category'));
      errorRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!name.trim()) {
      setError(t('creator.edit.errors.name'));
      return;
    }
    if (!date || !startTime || !endTime) {
      setError(t('creator.edit.errors.schedule'));
      return;
    }
    const startDate = new Date(`${date}T${startTime}`);
    const endDate = new Date(`${date}T${endTime}`);
    if (endDate <= startDate) {
      setError(t('creator.edit.errors.endBeforeStart'));
      return;
    }

    const venue = usesPlatformVenue(hostingMode)
      ? venueList.find((v) => v._id === venueId)
      : null;
    if (usesPlatformVenue(hostingMode) && !venue) {
      setError(t('creator.hosting.errors.platformVenueRequired'));
      return;
    }
    if (
      usesExternalVenue(hostingMode) &&
      (!externalVenueName.trim() || !externalVenueLocation.trim())
    ) {
      setError(t('creator.hosting.errors.externalVenueRequired'));
      return;
    }
    if (equipmentRequired(hostingMode) && equipment.length === 0) {
      setError(t('creator.hosting.errors.equipmentRequired'));
      return;
    }

    let megaStarPayload: ReturnType<typeof buildMegaStarPayload> = null;
    if (megaStarEnabled) {
      if (!megaStarId || !megaStarDurationId) {
        setError(t('creator.megaStar.errors.selectionRequired'));
        return;
      }
      megaStarPayload = buildMegaStarPayload(megaStarId, megaStarDurationId, t);
      if (!megaStarPayload) {
        setError(t('creator.megaStar.errors.selectionRequired'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const equipmentLabels = usesPlatformEquipment(hostingMode)
        ? equipment.map((row) => catalogueItemLabelWithPrice(row.id, row.quantity))
        : [];
      const cap = externalVenueCapacity.trim();

      await eventsApi.update(eventId, {
        hostingMode,
        ...(venue && { VenueID: venue.VenueID }),
        ...(usesExternalVenue(hostingMode) && {
          externalVenue: {
            name: externalVenueName.trim(),
            location: externalVenueLocation.trim(),
            ...(externalVenueAddress.trim() && { address: externalVenueAddress.trim() }),
            ...(cap && !Number.isNaN(Number(cap)) && Number(cap) >= 0
              ? { capacity: Number(cap) }
              : {}),
          },
        }),
        CategoryID: category.CategoryID,
        Name: name.trim(),
        Description: description.trim() || '',
        StartDate: startDate.toISOString(),
        EndDate: endDate.toISOString(),
        isSeated,
        ...(imageUrl !== null && { imageUrl: imageUrl || '' }),
        ...(equipmentLabels.length > 0 && { selectedEquipment: equipmentLabels }),
        ...(equipment.length > 0 && {
          equipmentSelection: equipment.map((row) => ({
            id: row.id,
            ...(row.quantity != null ? { quantity: row.quantity } : {}),
          })),
        }),
        megaStar: megaStarEnabled ? megaStarPayload : null,
        ...(isAdmin && adminStatus !== eventStatus && { Status: adminStatus }),
      });

      for (const row of ticketRows) {
        if (!row._pendingDelete || !row._id) continue;
        await ticketCategoriesApi.delete(eventId, row._id);
      }

      for (const row of ticketRows) {
        if (row._pendingDelete || row._id || !row.name.trim()) continue;
        const price = Number(row.price);
        const qty = Number(row.quantity);
        if (Number.isNaN(price) || price < 0) continue;
        await ticketCategoriesApi.create(eventId, {
          Name: row.name.trim(),
          Price: price,
          TotalQuantity:
            isSeated && hasSeatMap ? 0 : Number.isNaN(qty) || qty < 0 ? 0 : qty,
        });
      }

      for (const row of ticketRows) {
        if (row._pendingDelete || !row._id || !row.name.trim()) continue;
        const price = Number(row.price);
        if (Number.isNaN(price)) continue;
        const qty = isSeated && hasSeatMap ? undefined : Number(row.quantity);
        await ticketCategoriesApi.update(eventId, row._id, {
          Name: row.name.trim(),
          Price: price,
          ...(qty !== undefined && !Number.isNaN(qty) ? { TotalQuantity: qty } : {}),
        });
      }

      setSuccess(t('creator.edit.saved'));
      setEventStatus(isAdmin ? adminStatus : eventStatus);
      setTimeout(() => navigate(`/event/${eventId}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('creator.edit.saveFailed'));
      errorRef.current?.scrollIntoView({ behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard max-w-3xl text-center text-muted-foreground">
        {t('creator.edit.loading')}
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="admin-dashboard mx-auto max-w-lg space-y-4 text-center">
        <div className="admin-panel lg-card p-8 space-y-4">
          <p className="text-muted-foreground">{t('creator.edit.forbidden')}</p>
          <Button asChild variant="outline">
            <Link to="/">{t('creator.edit.back')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard max-w-4xl space-y-6">
      <Link
        to={`/event/${eventId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('creator.edit.backToEvent')}
      </Link>

      <p className="text-muted-foreground">{t('creator.edit.subtitle')}</p>

      {error && (
        <div ref={errorRef} className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-panel lg-card p-5 sm:p-8 space-y-6">
        {isAdmin && (
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.adminStatus')}</label>
            <Select value={adminStatus} onValueChange={setAdminStatus}>
              <SelectTrigger className="lg-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{t('creator.edit.adminStatusHint')}</p>
          </div>
        )}

        {!isAdmin && (
          <p className="text-sm rounded-lg border border-border bg-muted/30 px-3 py-2">
            {t('creator.edit.statusLabel')}: <strong>{eventStatus}</strong>
          </p>
        )}

        <EventHostingModePicker
          value={hostingMode}
          onChange={setHostingMode}
          disabled={submitting}
        />

        {usesPlatformVenue(hostingMode) && (
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.platformVenue')}</label>
            <Select value={venueId || undefined} onValueChange={setVenueId}>
              <SelectTrigger className="lg-input w-full">
                <SelectValue placeholder={t('creator.edit.platformVenue')} />
              </SelectTrigger>
              <SelectContent>
                {venueList.map((v) => (
                  <SelectItem key={v._id} value={v._id}>
                    {v.Name} — {v.Location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {usesExternalVenue(hostingMode) && (
          <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <p className="text-sm font-medium">{t('creator.hosting.externalVenueTitle')}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                value={externalVenueName}
                onChange={(e) => setExternalVenueName(e.target.value)}
                placeholder={t('creator.hosting.externalVenueNamePlaceholder')}
                className="input-cosmic w-full"
              />
              <input
                type="text"
                value={externalVenueLocation}
                onChange={(e) => setExternalVenueLocation(e.target.value)}
                placeholder={t('creator.hosting.externalVenueLocationPlaceholder')}
                className="input-cosmic w-full"
              />
            </div>
            <input
              type="text"
              value={externalVenueAddress}
              onChange={(e) => setExternalVenueAddress(e.target.value)}
              placeholder={t('creator.hosting.externalVenueAddressPlaceholder')}
              className="input-cosmic w-full"
            />
            <input
              type="number"
              value={externalVenueCapacity}
              onChange={(e) => setExternalVenueCapacity(e.target.value)}
              placeholder={t('creator.hosting.externalVenueCapacity')}
              className="input-cosmic max-w-xs"
              min={0}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.category')}</label>
            <Select value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger className="lg-input w-full">
                <SelectValue placeholder={t('creator.edit.category')} />
              </SelectTrigger>
              <SelectContent>
                {categoryList.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-cosmic w-full"
            />
          </div>
        </div>

        <div>
          <label className="form-label-cosmic mb-2 block">{t('creator.edit.description')}</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-cosmic w-full resize-y"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-cosmic w-full" />
          </div>
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.startTime')}</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-cosmic w-full" />
          </div>
          <div>
            <label className="form-label-cosmic mb-2 block">{t('creator.edit.endTime')}</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-cosmic w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('creator.edit.photo')}</label>
          {imageUrl && (
            <img
              src={eventCardImageSrc(imageUrl)}
              alt=""
              className="mb-3 h-32 w-auto rounded-lg border border-border object-cover"
            />
          )}
          <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm" />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="edit-is-seated"
            checked={isSeated}
            disabled={hasSeatMap}
            onChange={(e) => setIsSeated(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="edit-is-seated" className="text-sm font-medium">
            {t('creator.edit.seated')}
          </label>
        </div>
        {hasSeatMap && (
          <p className="text-xs text-muted-foreground -mt-4">{t('creator.edit.seatedLocked')}</p>
        )}

        <EventSeatMapEditor
          eventId={eventId}
          isSeated={isSeated}
          floorPlanUrl={seatMapFloorPlanUrl}
          stagePosition={seatMapStagePosition}
          ticketCategories={ticketRows
            .filter((r) => r._id && !r._pendingDelete)
            .map((r) => ({
              _id: r._id!,
              Name: r.name.trim() || t('creator.edit.ticketUnnamed'),
              Price: Number(r.price) || 0,
            }))}
          disabled={submitting}
          onMetaChange={(patch) => {
            if (patch.isSeated != null) setIsSeated(patch.isSeated);
            if (patch.seatMapFloorPlanUrl !== undefined) {
              setSeatMapFloorPlanUrl(patch.seatMapFloorPlanUrl);
            }
            if (patch.seatMapStagePosition) setSeatMapStagePosition(patch.seatMapStagePosition);
          }}
          onSeatMapCountChange={setSeatMapSeatCount}
        />

        {usesPlatformEquipment(hostingMode) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              {t('creator.equipment.sectionTitle')}
            </p>
            {equipment.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {equipment.map((row) => (
                  <li
                    key={row.id}
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25"
                  >
                    {catalogueItemLabelWithPrice(row.id, row.quantity)}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm font-medium">
              {t('creator.equipment.estimatedTotal', {
                total: formatEgp(catalogueSelectionTotalEgp(equipment) + (megaStarEnabled ? megaStarPriceEgp : 0)),
              })}
            </p>
            <Button type="button" variant="secondary" size="sm" className="gap-2" asChild>
              <Link to="/creator/catalogue" onClick={() => saveEquipmentDraft(equipment)}>
                <LayoutGrid className="h-4 w-4" />
                {t('creator.equipment.openCatalogue')}
              </Link>
            </Button>
          </div>
        )}

        <div className="rounded-xl border border-secondary/25 bg-secondary/5 p-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={megaStarEnabled}
              onChange={(e) => setMegaStarEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Star className="h-4 w-4 text-secondary" />
            {t('creator.megaStar.enable')}
          </label>
          {megaStarEnabled && (
            <MegaStarPicker
              starId={megaStarId}
              durationId={megaStarDurationId}
              onSelectStar={setMegaStarId}
              onSelectDuration={setMegaStarDurationId}
              disabled={submitting}
            />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">{t('creator.edit.ticketTypes')}</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={submitting}
              onClick={() =>
                setTicketRows((prev) => [
                  ...prev,
                  { name: '', price: '', quantity: isSeated ? '0' : '100' },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              {t('creator.edit.addTicketType')}
            </Button>
          </div>
          <div className="space-y-3">
            {ticketRows.map((row, index) => {
              if (row._pendingDelete) return null;
              return (
                <div
                  key={row._id ?? `new-${index}`}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg bg-muted/40 items-center"
                >
                  <input
                    className="sm:col-span-4 input-cosmic"
                    value={row.name}
                    onChange={(e) =>
                      setTicketRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
                      )
                    }
                    placeholder={t('creator.edit.ticketName')}
                  />
                  <input
                    type="number"
                    className="sm:col-span-3 input-cosmic"
                    value={row.price}
                    onChange={(e) =>
                      setTicketRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, price: e.target.value } : r)),
                      )
                    }
                    placeholder={t('creator.edit.ticketPrice')}
                    min={0}
                  />
                  <input
                    type="number"
                    className="sm:col-span-3 input-cosmic"
                    value={row.quantity}
                    disabled={isSeated && hasSeatMap}
                    onChange={(e) =>
                      setTicketRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)),
                      )
                    }
                    placeholder={t('creator.edit.ticketQty')}
                    min={0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="sm:col-span-1 justify-self-end"
                    disabled={submitting || ticketRows.filter((r) => !r._pendingDelete).length <= 1}
                    onClick={() => {
                      if (row._id && hasSeatMap) {
                        const ok = window.confirm(t('creator.edit.removeTicketConfirm'));
                        if (!ok) return;
                      }
                      setTicketRows((prev) => {
                        const active = prev.filter((r) => !r._pendingDelete);
                        if (active.length <= 1) return prev;
                        if (row._id) {
                          return prev.map((r, i) =>
                            i === index ? { ...r, _pendingDelete: true } : r,
                          );
                        }
                        return prev.filter((_, i) => i !== index);
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
          {isSeated && hasSeatMap && (
            <p className="text-xs text-muted-foreground mt-2">{t('creator.edit.ticketQtySeatMap')}</p>
          )}
          {!isSeated && (
            <p className="text-xs text-muted-foreground mt-2">{t('creator.edit.ticketQtyHint')}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 bg-gradient-to-r from-primary to-secondary"
          >
            <Save className="h-4 w-4" />
            {submitting ? t('creator.edit.saving') : t('creator.edit.save')}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={`/event/${eventId}`}>{t('creator.edit.cancel')}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
