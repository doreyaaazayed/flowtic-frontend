import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Settings, LayoutGrid, Package, Star, CreditCard, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { AdminStatCard } from '../components/admin/AdminStatCard';
import { OrganizerVendorPanel } from '../components/organizer/OrganizerVendorPanel';
import { OrganizerUshersPanel } from '../components/organizer/OrganizerUshersPanel';
import { OrganizerInvitationsPanel } from '../components/organizer/OrganizerInvitationsPanel';
import { Checkbox } from '../components/ui/checkbox';
import { useOrganizerSection, parseOrganizerSection } from '../context/OrganizerSectionContext';
import {
  VenueFormDialog,
  venueFormToApiBody,
} from '../components/venues/VenueFormDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts';
import {
  events,
  venues as venuesApi,
  categories as categoriesApi,
  ticketCategories,
  seatMap as seatMapApi,
  stats as statsApi,
  type SeatMapPreviewSection,
  type SeatMapSection,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { EventEntryPanel } from '../components/EventEntryPanel';
import {
  catalogueItemLabelWithPrice,
  catalogueSelectionTotalEgp,
  formatEgp,
} from '../data/eventSetupCatalogue';
import {
  clearEquipmentDraft,
  loadEquipmentDraft,
  pruneEquipmentDraftForCategory,
  type EquipmentDraftEntry,
  saveEquipmentDraft,
} from '../lib/eventEquipmentDraft';
import {
  clearEventCategoryDraft,
  loadEventCategoryDraft,
  saveEventCategoryDraft,
} from '../lib/eventCategoryDraft';
import {
  buildMegaStarPayload,
  formatMegaStarEgp,
  getMegaStarById,
} from '../data/megaStarCatalogue';
import { MegaStarPicker } from '../components/MegaStarPicker';
import {
  clearMegaStarDraft,
  loadMegaStarDraft,
  saveMegaStarDraft,
} from '../lib/eventMegaStarDraft';
import { EventHostingModePicker } from '../components/EventHostingModePicker';
import {
  EventSeatMapCreateDraft,
  type SeatMapSectionForm,
} from '../components/EventSeatMapCreateDraft';
import type { StagePosition } from '../components/seat-map/stagePosition';
import type { EventHostingMode } from '../lib/eventHosting';
import {
  equipmentRequired,
  loadHostingModeDraft,
  saveHostingModeDraft,
  usesExternalVenue,
  usesPlatformEquipment,
  usesPlatformVenue,
} from '../lib/eventHosting';
import {
  isPrivateEventCategory,
  privateEventKind,
  defaultInviteMessage,
} from '../lib/privateEventCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const TICKET_CHART_AXIS = 'rgba(148, 163, 184, 0.55)';
const TICKET_CHART_GRID = 'rgba(148, 163, 184, 0.12)';
const TICKET_CHART_TOOLTIP = {
  background: 'rgba(8,10,24,0.94)',
  border: '1px solid rgba(139,92,246,0.4)',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
};

function OrganizerSalesTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const sales = Number(payload[0]?.value ?? 0);
  return (
    <div className="px-3 py-2.5 text-xs" style={TICKET_CHART_TOOLTIP}>
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-violet-300 font-semibold">EGP {sales.toLocaleString()}</p>
    </div>
  );
}

type TicketTypeRow = { name: string; price: string; quantity: string };

const EMPTY_TICKET_ROW: TicketTypeRow = { name: '', price: '', quantity: '' };

const TICKET_TYPE_COLORS = [
  'from-primary to-secondary',
  'from-secondary to-accent',
  'from-accent to-primary',
  'from-violet-500 to-primary',
  'from-sky-500 to-secondary',
  'from-rose-500 to-accent',
] as const;

type OrganizerDemographics = {
  attendeeCount: number;
  ageKnownCount: number;
  ageDistribution: Array<{ range: string; count: number; percent: number }>;
  topLocations: Array<{ city: string; count: number }>;
  ticketTypes: Array<{ type: string; count: number; percent: number }>;
};

/** Only rows the user actually filled in — avoids creating default Standard/VIP stubs or blank priced rows. */
function collectTicketTypesForCreate(
  rows: TicketTypeRow[],
  isSeated: boolean,
): { ok: true; rows: TicketTypeRow[] } | { ok: false; errorKey: string } {
  const valid: TicketTypeRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;

    const priceStr = String(row.price ?? '').trim();
    if (priceStr === '') continue;

    const price = Number(priceStr);
    if (Number.isNaN(price) || price < 0) continue;

    if (!isSeated) {
      const qtyStr = String(row.quantity ?? '').trim();
      if (qtyStr === '') continue;
      const qty = Number(qtyStr);
      if (Number.isNaN(qty) || qty < 1) continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, errorKey: 'creator.create.ticketTypes.duplicateName' };
    }
    seen.add(key);
    valid.push({
      name,
      price: priceStr,
      quantity: isSeated ? '0' : String(row.quantity).trim(),
    });
  }

  if (valid.length === 0) {
    return { ok: false, errorKey: 'creator.create.ticketTypes.required' };
  }

  return { ok: true, rows: valid };
}

const canAddVenue = (role: string | undefined) =>
  role === 'organizer' || role === 'admin';

function matchTicketCategoryForCreate(
  sectionName: string,
  categories: Array<{ _id: string; Name: string }>,
): { _id: string; Name: string } | null {
  if (!categories.length) return null;
  const n = String(sectionName || '').toLowerCase();
  for (const c of categories) {
    const cn = (c.Name || '').toLowerCase();
    if (n && (n.includes(cn) || cn.includes(n))) return c;
  }
  const words = n.split(/\W+/).filter((w) => w.length > 1);
  let best = categories[0];
  let score = 0;
  for (const c of categories) {
    const cn = (c.Name || '').toLowerCase();
    const s = words.filter((w) => cn.includes(w)).length;
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return best;
}

function mapCreateDraftSections(
  draftSections: SeatMapSectionForm[],
  cats: Array<{ _id: string; Name: string }>,
): SeatMapSection[] | null {
  const valid = draftSections.filter(
    (s) => s.name.trim() && s.ticketCategoryId && s.rows.some((r) => r.seatCount > 0),
  );
  if (!valid.length) return null;
  return valid.map((sec) => {
    const draftIdx = /^draft-(\d+)$/.exec(sec.ticketCategoryId);
    const cat =
      (draftIdx != null ? cats[Number(draftIdx[1])] : undefined) ??
      cats.find((c) => c._id === sec.ticketCategoryId) ??
      matchTicketCategoryForCreate(sec.name, cats);
    if (!cat) throw new Error('No ticket category');
    return {
      name: sec.name.trim(),
      ticketCategoryId: cat._id,
      rows: sec.rows
        .filter((r) => r.seatCount > 0)
        .map((r) => ({
          label: r.label.trim() || 'A',
          seatCount: r.seatCount,
          ...(r.rowFraction != null && Number.isFinite(r.rowFraction)
            ? { rowFraction: r.rowFraction }
            : {}),
        })),
      ...(sec.layout ? { layout: sec.layout } : {}),
      ...(sec.placement === 'arc' ? { placement: 'arc' as const } : {}),
    };
  });
}

type EventCreatorDashboardProps = {
  /** When true, only the create-event form is shown (e.g. embedded in admin dashboard). */
  embeddedCreateOnly?: boolean;
};

export function EventCreatorDashboard({ embeddedCreateOnly = false }: EventCreatorDashboardProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [venueList, setVenueList] = useState<Array<{ _id: string; VenueID: number; Name: string; Location: string }>>([]);
  const [categoryList, setCategoryList] = useState<Array<{ _id: string; CategoryID: number; Name: string }>>([]);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [createVenueId, setCreateVenueId] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createStartTime, setCreateStartTime] = useState('');
  const [createEndTime, setCreateEndTime] = useState('');
  const [createTicketTypes, setCreateTicketTypes] = useState<TicketTypeRow[]>([
    { ...EMPTY_TICKET_ROW },
  ]);
  const [createImageUrl, setCreateImageUrl] = useState<string | null>(null);
  const [createIsSeated, setCreateIsSeated] = useState(false);
  /** Seating diagram only — not the marketing event photo; saved to seat map after create. */
  const [createFloorPlanDataUrl, setCreateFloorPlanDataUrl] = useState<string | null>(null);
  const [createFloorPlanLabel, setCreateFloorPlanLabel] = useState<string | null>(null);
  const [createPreviewSections, setCreatePreviewSections] = useState<SeatMapPreviewSection[] | null>(null);
  const [createPreviewStagePosition, setCreatePreviewStagePosition] = useState<StagePosition>('bottom');
  const [createSeatMapSections, setCreateSeatMapSections] = useState<SeatMapSectionForm[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const { section, setSection } = useOrganizerSection();
  const [createSelectedEquipment, setCreateSelectedEquipment] = useState<EquipmentDraftEntry[]>(() =>
    loadEquipmentDraft(),
  );
  const [createHostingMode, setCreateHostingMode] = useState<EventHostingMode>(
    () => loadHostingModeDraft() ?? 'full_setup',
  );
  const [createExternalVenueName, setCreateExternalVenueName] = useState('');
  const [createExternalVenueLocation, setCreateExternalVenueLocation] = useState('');
  const [createExternalVenueCapacity, setCreateExternalVenueCapacity] = useState('');
  const [createExternalVenueAddress, setCreateExternalVenueAddress] = useState('');
  const [createMegaStarEnabled, setCreateMegaStarEnabled] = useState(
    () => loadMegaStarDraft().enabled,
  );
  const [createMegaStarId, setCreateMegaStarId] = useState(() => loadMegaStarDraft().starId);
  const [createMegaStarDurationId, setCreateMegaStarDurationId] = useState(
    () => loadMegaStarDraft().durationId,
  );
  const [createBrideName, setCreateBrideName] = useState('');
  const [createGroomName, setCreateGroomName] = useState('');
  const [createHonoreeName, setCreateHonoreeName] = useState('');
  const [createHostNames, setCreateHostNames] = useState('');
  const [createInviteMessage, setCreateInviteMessage] = useState('');
  const [addVenueOpen, setAddVenueOpen] = useState(false);
  const createErrorRef = useRef<HTMLDivElement>(null);
  const [organizerStats, setOrganizerStats] = useState<{
    eventCount: number;
    totalRevenue: number;
    totalTicketsSold: number;
    totalAttendees: number;
  } | null>(null);
  const [organizerChart, setOrganizerChart] = useState<Array<{ month: string; sales: number }>>([]);
  const [organizerDemographics, setOrganizerDemographics] = useState<OrganizerDemographics | null>(null);
  const [myEvents, setMyEvents] = useState<Array<{
    _id: string;
    Name: string;
    StartDate: string;
    Status: string;
    capacity: number;
    sold: number;
    entryGatingEnabled?: boolean;
  }>>([]);
  const [statsChartLoading, setStatsChartLoading] = useState(true);
  const [myEventsLoading, setMyEventsLoading] = useState(false);

  const MAX_IMAGE_SIZE_MB = 2;

  const handleEventImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCreateError('Please select an image file (JPEG, PNG, WebP, etc.).');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setCreateError(`Image must be under ${MAX_IMAGE_SIZE_MB} MB.`);
      return;
    }
    setCreateError(null);
    const reader = new FileReader();
    reader.onload = () => setCreateImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    venuesApi.list().then(setVenueList).catch(() => setVenueList([]));
    categoriesApi.list().then(setCategoryList).catch(() => setCategoryList([]));
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') ?? searchParams.get('section');
    if (!tab) return;
    const next = parseOrganizerSection(tab);
    setSection(next);
    if (next !== 'create') return;
    const draftMode = loadHostingModeDraft();
    if (draftMode) setCreateHostingMode(draftMode);
    const ms = loadMegaStarDraft();
    setCreateMegaStarEnabled(ms.enabled);
    setCreateMegaStarId(ms.starId);
    setCreateMegaStarDurationId(ms.durationId);
    const catDraft = loadEventCategoryDraft();
    const categoryName =
      categoryList.find((c) => c._id === createCategoryId)?.Name ??
      catDraft?.categoryName ??
      '';
    const equipment = pruneEquipmentDraftForCategory(loadEquipmentDraft(), categoryName);
    setCreateSelectedEquipment(equipment);
    saveEquipmentDraft(equipment);
  }, [searchParams, categoryList, createCategoryId, setSection]);

  useEffect(() => {
    if (!categoryList.length) return;
    const draft = loadEventCategoryDraft();
    if (!draft?.categoryId || createCategoryId) return;
    if (categoryList.some((c) => c._id === draft.categoryId)) {
      setCreateCategoryId(draft.categoryId);
    }
  }, [categoryList, createCategoryId]);

  const handleCreateCategoryChange = (categoryId: string) => {
    setCreateCategoryId(categoryId);
    const category = categoryList.find((c) => c._id === categoryId);
    const categoryName = category?.Name ?? '';
    saveEventCategoryDraft(categoryId, categoryName);
    setCreateSelectedEquipment((prev) => {
      const pruned = pruneEquipmentDraftForCategory(prev, categoryName);
      saveEquipmentDraft(pruned);
      return pruned;
    });
    if (isPrivateEventCategory(category?.CategoryID, categoryName)) {
      setCreateIsSeated(false);
      setCreateFloorPlanDataUrl(null);
      setCreateFloorPlanLabel(null);
      setCreatePreviewSections(null);
      setCreateSeatMapSections([]);
      setCreatePreviewStagePosition('bottom');
      setCreateTicketTypes([{ ...EMPTY_TICKET_ROW }]);
    }
  };

  useEffect(() => {
    saveMegaStarDraft({
      enabled: createMegaStarEnabled,
      starId: createMegaStarId,
      durationId: createMegaStarDurationId,
    });
  }, [createMegaStarEnabled, createMegaStarId, createMegaStarDurationId]);

  const selectedMegaStar = getMegaStarById(createMegaStarId);
  const selectedMegaStarDuration = selectedMegaStar?.durations.find(
    (d) => d.id === createMegaStarDurationId,
  );
  const megaStarPriceEgp = selectedMegaStarDuration?.priceEgp ?? 0;

  const handleHostingModeChange = (mode: EventHostingMode) => {
    setCreateHostingMode(mode);
    saveHostingModeDraft(mode);
    if (!usesPlatformVenue(mode)) setCreateVenueId('');
    if (!usesPlatformEquipment(mode)) {
      setCreateSelectedEquipment([]);
      clearEquipmentDraft();
    }
  };

  const fetchOrganizerData = useCallback(() => {
    setStatsChartLoading(true);
    Promise.all([
      statsApi.organizer().then(setOrganizerStats),
      statsApi.organizerChart().then(setOrganizerChart),
      statsApi.organizerDemographics().then(setOrganizerDemographics),
    ]).catch(() => {}).finally(() => setStatsChartLoading(false));
  }, []);

  const fetchMyEvents = useCallback(() => {
    setMyEventsLoading(true);
    events.my().then(setMyEvents).catch(() => setMyEvents([])).finally(() => setMyEventsLoading(false));
  }, []);

  useEffect(() => { fetchOrganizerData(); }, [fetchOrganizerData]);
  useEffect(() => { fetchMyEvents(); }, [fetchMyEvents]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSubmitting) return;
    setCreateError(null);
    setCreateSuccess(null);
    const category = categoryList.find((c) => c._id === createCategoryId);
    if (!category) {
      setCreateError('Please select a category.');
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const needsPlatformVenue = usesPlatformVenue(createHostingMode);
    const needsExternalVenue = usesExternalVenue(createHostingMode);
    const venue = needsPlatformVenue
      ? venueList.find((v) => v._id === createVenueId)
      : null;
    if (needsPlatformVenue && !venue) {
      setCreateError(t('creator.hosting.errors.platformVenueRequired'));
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (
      needsExternalVenue &&
      (!createExternalVenueName.trim() || !createExternalVenueLocation.trim())
    ) {
      setCreateError(t('creator.hosting.errors.externalVenueRequired'));
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (
      equipmentRequired(createHostingMode) &&
      createSelectedEquipment.length === 0
    ) {
      setCreateError(t('creator.hosting.errors.equipmentRequired'));
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (!createName.trim()) {
      setCreateError('Event name is required.');
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (createIsPrivateCategory) {
      if (createPrivateKind === 'wedding' && (!createBrideName.trim() || !createGroomName.trim())) {
        setCreateError(t('creator.invitations.errors.weddingNames'));
        createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (createPrivateKind === 'prom' && !createHonoreeName.trim()) {
        setCreateError(t('creator.invitations.errors.promHonoree'));
        createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (createPrivateKind === 'private' && !createHostNames.trim()) {
        setCreateError(t('creator.invitations.errors.hostNames'));
        createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
    }
    if (!createDate || !createStartTime || !createEndTime) {
      setCreateError('Date, start time, and end time are required.');
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const startDate = new Date(`${createDate}T${createStartTime}`);
    const endDate = new Date(`${createDate}T${createEndTime}`);
    if (endDate <= startDate) {
      setCreateError('End time must be after start time.');
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setCreateError(t('creator.create.errors.invalidSchedule'));
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const categoryIdNum = Number(category.CategoryID);
    if (!Number.isFinite(categoryIdNum)) {
      setCreateError(t('creator.create.errors.invalidCategory'));
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    let megaStarPayload: ReturnType<typeof buildMegaStarPayload> = null;
    if (createMegaStarEnabled) {
      if (!createMegaStarId || !createMegaStarDurationId) {
        setCreateError(t('creator.megaStar.errors.selectionRequired'));
        createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      megaStarPayload = buildMegaStarPayload(
        createMegaStarId,
        createMegaStarDurationId,
        t,
      );
      if (!megaStarPayload) {
        setCreateError(t('creator.megaStar.errors.selectionRequired'));
        createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
    }

    const ticketPayload = createIsPrivateCategory
      ? ({ ok: true as const, rows: [] as TicketTypeRow[] })
      : collectTicketTypesForCreate(createTicketTypes, createIsSeated);
    if (!ticketPayload.ok) {
      setCreateError(t(ticketPayload.errorKey));
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    setCreateSubmitting(true);
    const wasSeatedFlow = createIsPrivateCategory ? false : createIsSeated;
    const floorPlanToAttach = wasSeatedFlow ? createFloorPlanDataUrl : null;
    try {
      const equipmentLabels = usesPlatformEquipment(createHostingMode)
        ? createSelectedEquipment.map((row) =>
            catalogueItemLabelWithPrice(row.id, row.quantity),
          )
        : [];
      const cap = createExternalVenueCapacity.trim();
      const createPayload = {
        hostingMode: createHostingMode,
        CategoryID: categoryIdNum,
        Name: createName.trim(),
        Description: createDescription.trim(),
        StartDate: startDate.toISOString(),
        EndDate: endDate.toISOString(),
        isSeated: createIsPrivateCategory ? false : wasSeatedFlow,
        ...(venue && { VenueID: venue.VenueID }),
        ...(needsExternalVenue && {
          externalVenue: {
            name: createExternalVenueName.trim(),
            location: createExternalVenueLocation.trim(),
            ...(createExternalVenueAddress.trim() && {
              address: createExternalVenueAddress.trim(),
            }),
            ...(cap && !Number.isNaN(Number(cap)) && Number(cap) >= 0
              ? { capacity: Number(cap) }
              : {}),
          },
        }),
        ...(createImageUrl && { imageUrl: createImageUrl }),
        ...(equipmentLabels.length > 0 && { selectedEquipment: equipmentLabels }),
        ...(createSelectedEquipment.length > 0 && {
          equipmentSelection: createSelectedEquipment.map((row) => ({
            id: row.id,
            ...(row.quantity != null ? { quantity: row.quantity } : {}),
          })),
        }),
        ...(megaStarPayload && { megaStar: megaStarPayload }),
        ...(createIsPrivateCategory && {
          invitationDetails: {
            ...(createPrivateKind === 'wedding' && {
              brideName: createBrideName.trim(),
              groomName: createGroomName.trim(),
            }),
            ...(createPrivateKind === 'prom' && { honoreeName: createHonoreeName.trim() }),
            ...(createPrivateKind === 'private' && { hostNames: createHostNames.trim() }),
            ...(createInviteMessage.trim() && { customMessage: createInviteMessage.trim() }),
          },
        }),
      };
      const created = await events.create(createPayload) as { _id: string };
      if (!createIsPrivateCategory) {
        for (const row of ticketPayload.rows) {
          await ticketCategories.create(created._id, {
            Name: row.name,
            Price: Number(row.price),
            TotalQuantity: wasSeatedFlow ? 0 : Number(row.quantity),
          });
        }
        if (wasSeatedFlow && floorPlanToAttach) {
          await seatMapApi.saveFloorPlan(created._id, floorPlanToAttach);
        }
      }
      const isAdmin = user?.role === 'admin';
      let successMsg = isAdmin
        ? wasSeatedFlow
          ? 'Event created. Set up your seat map next.'
          : 'Event created successfully.'
        : createIsPrivateCategory
          ? t('creator.invitations.createSuccess')
          : t('creator.equipment.submitPending');
      let seatMapBuilt = false;
      if (!createIsPrivateCategory && wasSeatedFlow) {
        try {
          const cats = await ticketCategories.listByEvent(created._id);
          if (cats.length > 0) {
            const fromDraft = mapCreateDraftSections(createSeatMapSections, cats);
            if (fromDraft?.length) {
              await seatMapApi.create(created._id, {
                sections: fromDraft,
                stagePosition: createPreviewStagePosition,
              });
              seatMapBuilt = true;
              successMsg = t('creator.create.seatMap.successWithMap');
            } else if (createPreviewSections?.length) {
              const mapped: SeatMapSection[] = createPreviewSections.map((sec) => {
                const cat = matchTicketCategoryForCreate(sec.name, cats);
                if (!cat) throw new Error('No ticket category');
                return {
                  name: sec.name,
                  ticketCategoryId: cat._id,
                  rows: sec.rows,
                  ...(sec.layout ? { layout: sec.layout } : {}),
                  ...(sec.placement === 'arc' ? { placement: 'arc' as const } : {}),
                };
              });
              await seatMapApi.create(created._id, {
                sections: mapped,
                stagePosition: createPreviewStagePosition,
              });
              seatMapBuilt = true;
              successMsg = t('creator.create.seatMap.successWithAi');
            }
          }
        } catch {
          successMsg = t('creator.create.seatMap.successSetupLater');
        }
      }
      setCreateSuccess(successMsg);
      setCreateName('');
      setCreateDescription('');
      setCreateCategoryId('');
      setCreateVenueId('');
      setCreateExternalVenueName('');
      setCreateExternalVenueLocation('');
      setCreateExternalVenueCapacity('');
      setCreateExternalVenueAddress('');
      setCreateHostingMode('full_setup');
      saveHostingModeDraft('full_setup');
      setCreateDate('');
      setCreateStartTime('');
      setCreateEndTime('');
      setCreateImageUrl(null);
      setCreateFloorPlanDataUrl(null);
      setCreateFloorPlanLabel(null);
      setCreatePreviewSections(null);
      setCreatePreviewStagePosition('bottom');
      setCreateSeatMapSections([]);
      setCreateIsSeated(false);
      setCreateTicketTypes([{ ...EMPTY_TICKET_ROW }]);
      setCreateSelectedEquipment([]);
      clearEquipmentDraft();
      clearEventCategoryDraft();
      setCreateMegaStarEnabled(false);
      setCreateMegaStarId('');
      setCreateMegaStarDurationId('');
      clearMegaStarDraft();
      setCreateBrideName('');
      setCreateGroomName('');
      setCreateHonoreeName('');
      setCreateHostNames('');
      setCreateInviteMessage('');
      setTimeout(() => {
        setCreateSuccess(null);
        if (isAdmin) {
          navigate(
            wasSeatedFlow && !seatMapBuilt
              ? `/event/${created._id}?setupSeatMap=1`
              : `/event/${created._id}`,
          );
        } else if (createIsPrivateCategory && !embeddedCreateOnly) {
          setSection('invitations');
        } else {
          navigate(`/creator/events/${created._id}/deposit`);
        }
      }, 1500);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create event.');
      createErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const setTicketType = (index: number, field: keyof TicketTypeRow, value: string) => {
    setCreateTicketTypes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addTicketType = () => {
    setCreateTicketTypes((prev) => [...prev, { ...EMPTY_TICKET_ROW }]);
  };

  const removeTicketType = (index: number) => {
    setCreateTicketTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchVenues = () => venuesApi.list().then(setVenueList).catch(() => setVenueList([]));

  const selectedCreateCategory = categoryList.find((c) => c._id === createCategoryId);
  const createIsPrivateCategory = isPrivateEventCategory(
    selectedCreateCategory?.CategoryID,
    selectedCreateCategory?.Name,
  );
  const createPrivateKind = createIsPrivateCategory
    ? privateEventKind(selectedCreateCategory?.CategoryID, selectedCreateCategory?.Name)
    : null;

  useEffect(() => {
    if (!createIsPrivateCategory || !createPrivateKind) return;
    if (createInviteMessage.trim()) return;
    setCreateInviteMessage(defaultInviteMessage(createPrivateKind));
  }, [createIsPrivateCategory, createPrivateKind, createInviteMessage]);

  return (
    <div className="admin-dashboard space-y-6">
        {!embeddedCreateOnly && (
        <>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground">{t('creator.subtitle')}</p>
          </div>
          <Button
            type="button"
            className="gap-2 bg-gradient-to-r from-primary to-secondary shrink-0"
            onClick={() => setSection('create')}
          >
            <Plus className="w-5 h-5" />
            {t('creator.createNew')}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsChartLoading && !organizerStats ? (
            <div className="col-span-full text-muted-foreground py-4">Loading stats…</div>
          ) : (
            <>
              <AdminStatCard
                label="Total Events"
                value={organizerStats ? organizerStats.eventCount.toLocaleString() : '0'}
                accent="violet"
              />
              <AdminStatCard
                label="Total Revenue"
                value={organizerStats != null ? `EGP ${(organizerStats.totalRevenue || 0).toLocaleString()}` : 'EGP 0'}
                accent="sky"
              />
              <AdminStatCard
                label="Total Attendees"
                value={organizerStats ? organizerStats.totalAttendees.toLocaleString() : '0'}
                accent="rose"
              />
              <AdminStatCard
                label="Tickets Sold"
                value={organizerStats ? organizerStats.totalTicketsSold.toLocaleString() : '0'}
                accent="amber"
              />
            </>
          )}
        </div>
        </>
        )}

          {!embeddedCreateOnly && section === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Chart – live (revenue by month) */}
              <div className="admin-panel lg-card p-5 sm:p-6">
                <h3 className="text-xl font-semibold mb-6">Ticket Sales (last 6 months)</h3>
                {organizerChart.length === 0 && !statsChartLoading ? (
                  <p className="text-muted-foreground py-8 text-center">No sales data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={organizerChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={TICKET_CHART_GRID} strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        tick={{ fill: TICKET_CHART_AXIS }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={52}
                        tick={{ fill: TICKET_CHART_AXIS }}
                        tickFormatter={(v) =>
                          Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                        }
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(139,92,246,0.12)' }}
                        content={<OrganizerSalesTooltip />}
                      />
                      <defs>
                        <linearGradient id="organizerSalesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <Bar
                        dataKey="sales"
                        radius={[8, 8, 0, 0]}
                        fill="url(#organizerSalesGradient)"
                        activeBar={{ fill: '#c084fc', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Placeholder for future attendee breakdown */}
              <div className="admin-panel lg-card p-5 sm:p-6">
                <h3 className="text-xl font-semibold mb-6">Overview</h3>
                <p className="text-muted-foreground">Total attendees are shown in the stats above.</p>
              </div>
              </div>

            {/* Demographics */}
            <div className="admin-panel lg-card p-5 sm:p-6">
              <h3 className="text-xl font-semibold mb-6">{t('creator.demographics.title')}</h3>
              {statsChartLoading && !organizerDemographics ? (
                <p className="text-muted-foreground py-6 text-center">{t('creator.demographics.loading')}</p>
              ) : !organizerDemographics || organizerDemographics.attendeeCount === 0 ? (
                <p className="text-muted-foreground py-6 text-center">{t('creator.demographics.noAttendees')}</p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">{t('creator.demographics.ageDistribution')}</p>
                  {organizerDemographics.ageKnownCount === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('creator.demographics.noAgeData')}</p>
                  ) : (
                  <div className="space-y-3">
                    {organizerDemographics.ageDistribution.map((item) => (
                      <div key={item.range}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.range}</span>
                          <span className="font-medium">{item.percent}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-4">{t('creator.demographics.topLocations')}</p>
                  {organizerDemographics.topLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('creator.demographics.noLocationData')}</p>
                  ) : (
                  <div className="space-y-2">
                    {organizerDemographics.topLocations.map((item) => (
                      <div key={item.city} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.city}</span>
                        <span className="font-medium">{item.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-4">{t('creator.demographics.ticketTypes')}</p>
                  {organizerDemographics.ticketTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('creator.demographics.noTicketData')}</p>
                  ) : (
                  <div className="space-y-2">
                    {organizerDemographics.ticketTypes.map((item, index) => (
                      <div key={item.type} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${TICKET_TYPE_COLORS[index % TICKET_TYPE_COLORS.length]}`} />
                        <span className="flex-1 text-sm">{item.type}</span>
                        <span className="text-sm font-medium">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </div>
              )}
            </div>
            </div>
            )}

          {(embeddedCreateOnly || section === 'create') && (
            <div className="admin-panel lg-card p-5 sm:p-8">
              <h3 className="text-2xl font-bold mb-6">Create New Event</h3>
              {createError && (
                <div ref={createErrorRef} className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
                  {createSuccess}
                </div>
              )}
              <form className="space-y-6" onSubmit={handleCreateSubmit}>
                <EventHostingModePicker
                  value={createHostingMode}
                  onChange={handleHostingModeChange}
                  disabled={createSubmitting}
                />

                {usesExternalVenue(createHostingMode) && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <div>
                      <p className="text-sm font-medium">{t('creator.hosting.externalVenueTitle')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('creator.hosting.externalVenueHint')}
                      </p>
                      <p className="text-xs text-primary/90 mt-2">
                        {t('creator.hosting.externalVenuePrivacyNote')}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0">
                        <label htmlFor="create-external-venue-name" className="form-label-cosmic mb-2 block">
                          {t('creator.hosting.externalVenueName')}
                        </label>
                        <input
                          id="create-external-venue-name"
                          type="text"
                          value={createExternalVenueName}
                          onChange={(e) => setCreateExternalVenueName(e.target.value)}
                          placeholder={t('creator.hosting.externalVenueNamePlaceholder')}
                          className="input-cosmic w-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <label htmlFor="create-external-venue-location" className="form-label-cosmic mb-2 block">
                          {t('creator.hosting.externalVenueLocation')}
                        </label>
                        <input
                          id="create-external-venue-location"
                          type="text"
                          value={createExternalVenueLocation}
                          onChange={(e) => setCreateExternalVenueLocation(e.target.value)}
                          placeholder={t('creator.hosting.externalVenueLocationPlaceholder')}
                          className="input-cosmic w-full"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 md:col-span-2">
                      <label htmlFor="create-external-venue-address" className="form-label-cosmic mb-2 block">
                        {t('creator.hosting.externalVenueAddress')}
                      </label>
                      <input
                        id="create-external-venue-address"
                        type="text"
                        value={createExternalVenueAddress}
                        onChange={(e) => setCreateExternalVenueAddress(e.target.value)}
                        placeholder={t('creator.hosting.externalVenueAddressPlaceholder')}
                        className="input-cosmic w-full"
                      />
                    </div>
                    <div className="min-w-0 max-w-xs">
                      <label htmlFor="create-external-venue-capacity" className="form-label-cosmic mb-2 block">
                        {t('creator.hosting.externalVenueCapacity')}
                      </label>
                      <input
                        id="create-external-venue-capacity"
                        type="number"
                        min={0}
                        value={createExternalVenueCapacity}
                        onChange={(e) => setCreateExternalVenueCapacity(e.target.value)}
                        className="input-cosmic w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor="create-event-category" className="form-label-cosmic mb-2 block">
                      Category
                    </label>
                    <Select value={createCategoryId || undefined} onValueChange={handleCreateCategoryChange}>
                      <SelectTrigger
                        id="create-event-category"
                        className="lg-input h-auto min-h-[48px] w-full justify-between"
                      >
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-w-[var(--radix-select-trigger-width)]">
                        {categoryList.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.Name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="create-event-name" className="form-label-cosmic mb-2 block">
                      Event Name
                    </label>
                    <input
                      id="create-event-name"
                      name="event_name"
                      autoComplete="off"
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Summer Music Festival 2026"
                      className="input-cosmic w-full"
                    />
                  </div>
                </div>

                {createIsPrivateCategory && (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t('creator.invitations.privateEventTitle')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('creator.invitations.privateEventHint')}</p>
                    </div>
                    {createPrivateKind === 'wedding' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="create-bride-name" className="form-label-cosmic mb-2 block">
                            {t('creator.invitations.brideName')}
                          </label>
                          <input
                            id="create-bride-name"
                            type="text"
                            value={createBrideName}
                            onChange={(e) => setCreateBrideName(e.target.value)}
                            className="input-cosmic w-full"
                            placeholder={t('creator.invitations.brideNamePlaceholder')}
                          />
                        </div>
                        <div>
                          <label htmlFor="create-groom-name" className="form-label-cosmic mb-2 block">
                            {t('creator.invitations.groomName')}
                          </label>
                          <input
                            id="create-groom-name"
                            type="text"
                            value={createGroomName}
                            onChange={(e) => setCreateGroomName(e.target.value)}
                            className="input-cosmic w-full"
                            placeholder={t('creator.invitations.groomNamePlaceholder')}
                          />
                        </div>
                      </div>
                    )}
                    {createPrivateKind === 'prom' && (
                      <div>
                        <label htmlFor="create-honoree-name" className="form-label-cosmic mb-2 block">
                          {t('creator.invitations.honoreeName')}
                        </label>
                        <input
                          id="create-honoree-name"
                          type="text"
                          value={createHonoreeName}
                          onChange={(e) => setCreateHonoreeName(e.target.value)}
                          className="input-cosmic w-full"
                          placeholder={t('creator.invitations.honoreeNamePlaceholder')}
                        />
                      </div>
                    )}
                    {createPrivateKind === 'private' && (
                      <div>
                        <label htmlFor="create-host-names" className="form-label-cosmic mb-2 block">
                          {t('creator.invitations.hostNames')}
                        </label>
                        <input
                          id="create-host-names"
                          type="text"
                          value={createHostNames}
                          onChange={(e) => setCreateHostNames(e.target.value)}
                          className="input-cosmic w-full"
                          placeholder={t('creator.invitations.hostNamesPlaceholder')}
                        />
                      </div>
                    )}
                    <div>
                      <label htmlFor="create-invite-message" className="form-label-cosmic mb-2 block">
                        {t('creator.invitations.inviteMessage')}
                      </label>
                      <input
                        id="create-invite-message"
                        type="text"
                        value={createInviteMessage}
                        onChange={(e) => setCreateInviteMessage(e.target.value)}
                        className="input-cosmic w-full"
                        placeholder={t('creator.invitations.inviteMessagePlaceholder')}
                      />
                    </div>
                  </div>
                )}

                <div className="min-w-0">
                  <label htmlFor="create-event-description" className="form-label-cosmic mb-2 block">
                    Description
                  </label>
                  <textarea
                    id="create-event-description"
                    name="event_description"
                    rows={4}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Describe your event..."
                    className="input-cosmic w-full min-h-[7rem] resize-y"
                  />
                </div>

                <div>
                  <label htmlFor="create-event-photo" className="block text-sm font-medium mb-2">
                    Event photo
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex flex-col gap-2">
                      <input
                        id="create-event-photo"
                        name="event_photo"
                        type="file"
                        accept="image/*"
                        onChange={handleEventImageChange}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP. Max {MAX_IMAGE_SIZE_MB} MB.</p>
                    </div>
                    {createImageUrl && (
                      <div className="relative">
                        <img
                          src={createImageUrl}
                          alt="Event preview"
                          className="w-40 h-40 object-cover rounded-lg border border-border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 text-destructive hover:bg-destructive/10"
                          onClick={() => { setCreateImageUrl(null); setCreateError(null); }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="min-w-0">
                    <label htmlFor="create-event-date" className="form-label-cosmic mb-2 block">
                      Date
                    </label>
                    <input
                      id="create-event-date"
                      name="event_date"
                      type="date"
                      value={createDate}
                      onChange={(e) => setCreateDate(e.target.value)}
                      className="input-cosmic w-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="create-event-start-time" className="form-label-cosmic mb-2 block">
                      Start Time
                    </label>
                    <input
                      id="create-event-start-time"
                      name="event_start_time"
                      type="time"
                      value={createStartTime}
                      onChange={(e) => setCreateStartTime(e.target.value)}
                      className="input-cosmic w-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="create-event-end-time" className="form-label-cosmic mb-2 block">
                      End Time
                    </label>
                    <input
                      id="create-event-end-time"
                      name="event_end_time"
                      type="time"
                      value={createEndTime}
                      onChange={(e) => setCreateEndTime(e.target.value)}
                      className="input-cosmic w-full"
                    />
                  </div>
                </div>

                {usesPlatformVenue(createHostingMode) && (
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="create-event-venue" className="form-label-cosmic">
                        {t('creator.hosting.platformVenueTitle')}
                      </label>
                      {canAddVenue(user?.role) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setAddVenueOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t('venues.addVenue')}
                        </Button>
                      )}
                    </div>
                    <Select value={createVenueId || undefined} onValueChange={setCreateVenueId}>
                      <SelectTrigger
                        id="create-event-venue"
                        className="lg-input h-auto min-h-[48px] w-full justify-between"
                      >
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-w-[var(--radix-select-trigger-width)]">
                        {venueList.map((v) => (
                          <SelectItem key={v._id} value={v._id}>
                            {v.Name} – {v.Location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {canAddVenue(user?.role) && usesPlatformVenue(createHostingMode) && (
                  <VenueFormDialog
                    open={addVenueOpen}
                    onOpenChange={setAddVenueOpen}
                    mode="create"
                    onSubmit={async (values) => {
                      const created = await venuesApi.create(venueFormToApiBody(values));
                      await fetchVenues();
                      setCreateVenueId(created._id);
                    }}
                  />
                )}

                {!createIsPrivateCategory && (
                <>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="createIsSeated"
                    name="event_is_seated"
                    checked={createIsSeated}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setCreateIsSeated(on);
                      if (!on) {
                        setCreateFloorPlanDataUrl(null);
                        setCreateFloorPlanLabel(null);
                        setCreatePreviewSections(null);
                        setCreateSeatMapSections([]);
                        setCreatePreviewStagePosition('bottom');
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="createIsSeated" className="text-sm font-medium cursor-pointer">
                    {t('creator.edit.seated')}
                  </label>
                </div>

                {createIsSeated && (
                  <EventSeatMapCreateDraft
                    ticketTypes={createTicketTypes}
                    floorPlanDataUrl={createFloorPlanDataUrl}
                    floorPlanLabel={createFloorPlanLabel}
                    onFloorPlanChange={(url, label) => {
                      setCreateFloorPlanDataUrl(url);
                      setCreateFloorPlanLabel(label);
                      if (!url) setCreatePreviewSections(null);
                    }}
                    sections={createSeatMapSections}
                    onSectionsChange={setCreateSeatMapSections}
                    stagePosition={createPreviewStagePosition}
                    onStagePositionChange={setCreatePreviewStagePosition}
                    aiPreviewSections={createPreviewSections}
                    onAiPreviewChange={(sections, stagePos) => {
                      setCreatePreviewSections(sections);
                      if (stagePos) setCreatePreviewStagePosition(stagePos);
                    }}
                    disabled={createSubmitting}
                    onError={setCreateError}
                  />
                )}
                </>
                )}

                <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="create-megastar-enabled"
                      checked={createMegaStarEnabled}
                      onCheckedChange={(checked) => {
                        const on = checked === true;
                        setCreateMegaStarEnabled(on);
                        if (!on) {
                          setCreateMegaStarId('');
                          setCreateMegaStarDurationId('');
                        }
                      }}
                      disabled={createSubmitting}
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor="create-megastar-enabled"
                        className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <Star className="h-4 w-4 text-secondary" />
                        {t('creator.megaStar.enableLabel')}
                      </label>
                      <p className="text-xs text-muted-foreground">{t('creator.megaStar.enableHint')}</p>
                      <p className="text-xs text-muted-foreground/90">{t('creator.megaStar.marketNote')}</p>
                    </div>
                  </div>

                  {createMegaStarEnabled && (
                    <>
                      <MegaStarPicker
                        selectedStarId={createMegaStarId}
                        selectedDurationId={createMegaStarDurationId}
                        onSelectStar={setCreateMegaStarId}
                        onSelectDuration={setCreateMegaStarDurationId}
                        disabled={createSubmitting}
                      />
                      {selectedMegaStarDuration && (
                        <p className="text-sm font-medium text-foreground">
                          {t('creator.megaStar.priceLine', {
                            price: formatMegaStarEgp(megaStarPriceEgp),
                          })}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {usesPlatformEquipment(createHostingMode) && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {t('creator.equipment.sectionTitle')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('creator.equipment.sectionHint')}</p>
                    </div>
                    {createSelectedEquipment.length > 0 ? (
                      <>
                        <ul className="flex flex-wrap gap-2">
                          {createSelectedEquipment.map((row) => (
                            <li
                              key={row.id}
                              className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25"
                            >
                              {catalogueItemLabelWithPrice(row.id, row.quantity)}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm font-medium text-foreground">
                          {t('creator.equipment.estimatedTotal', {
                            total: formatEgp(catalogueSelectionTotalEgp(createSelectedEquipment)),
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('creator.catalogue.flatPriceNote')}
                        </p>
                        {createMegaStarEnabled && selectedMegaStarDuration && (
                          <p className="text-sm font-medium text-foreground pt-1">
                            {t('creator.megaStar.estimateLine', {
                              price: formatMegaStarEgp(megaStarPriceEgp),
                            })}
                          </p>
                        )}
                        {(createSelectedEquipment.length > 0 ||
                          (createMegaStarEnabled && selectedMegaStarDuration)) && (
                          <>
                            <p className="text-sm font-semibold text-primary border-t border-border/50 mt-2 pt-2">
                              {t('creator.megaStar.combinedEstimate', {
                                total: formatEgp(
                                  catalogueSelectionTotalEgp(createSelectedEquipment) +
                                    (createMegaStarEnabled ? megaStarPriceEgp : 0),
                                ),
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('creator.equipment.platformFeeNote', { percent: 10 })}
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('creator.equipment.noneSelected')}</p>
                    )}
                    {createSelectedEquipment.length === 0 &&
                      createMegaStarEnabled &&
                      selectedMegaStarDuration && (
                        <p className="text-sm font-medium text-foreground">
                          {t('creator.megaStar.estimateLine', {
                            price: formatMegaStarEgp(megaStarPriceEgp),
                          })}
                        </p>
                      )}
                    <Button type="button" variant="secondary" size="sm" className="gap-2" asChild>
                      <Link to="/creator/catalogue">
                        <LayoutGrid className="h-4 w-4" />
                        {t('creator.equipment.openCatalogue')}
                      </Link>
                    </Button>
                  </div>
                )}

                {!createIsPrivateCategory && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">Ticket Types</label>
                    {createIsSeated && (
                      <span className="text-xs text-muted-foreground">For seated events, add categories (e.g. Platinum, Gold). Seat counts are set when you define the seat map.</span>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={addTicketType}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add ticket type
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {createTicketTypes.map((row, index) => (
                      <div key={`ticket-${index}`} className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-lg bg-muted/50 items-center">
                        <div className="sm:col-span-4">
                          <input
                            id={`create-ticket-name-${index}`}
                            name={`ticket_type_${index}_name`}
                            type="text"
                            value={row.name}
                            onChange={(e) => setTicketType(index, 'name', e.target.value)}
                            placeholder="e.g. Standard, VIP"
                            className="w-full px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            id={`create-ticket-price-${index}`}
                            name={`ticket_type_${index}_price`}
                            type="number"
                            placeholder="Price"
                            value={row.price}
                            onChange={(e) => setTicketType(index, 'price', e.target.value)}
                            min={0}
                            step={0.01}
                            className="w-full px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            id={`create-ticket-qty-${index}`}
                            name={`ticket_type_${index}_quantity`}
                            type="number"
                            placeholder="Quantity"
                            value={row.quantity}
                            onChange={(e) => setTicketType(index, 'quantity', e.target.value)}
                            min={0}
                            disabled={createIsSeated}
                            className="w-full px-3 py-2 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeTicketType(index)}
                            disabled={createTicketTypes.length <= 1}
                            title={createTicketTypes.length <= 1 ? 'At least one ticket type is required' : 'Remove ticket type'}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" disabled={createSubmitting}>
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-primary to-secondary"
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? 'Creating…' : user?.role === 'admin' ? 'Publish Event' : 'Submit for review'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {!embeddedCreateOnly && section === 'events' && (
            <div className="space-y-4">
              {myEventsLoading ? (
                <p className="text-muted-foreground py-8">Loading your events…</p>
              ) : myEvents.length === 0 ? (
                <p className="text-muted-foreground py-8">You have not created any events yet. Use the Create Event tab to add one.</p>
              ) : (
                myEvents.map((event) => (
                  <div key={event._id} className="admin-panel lg-card p-5 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{event.Name}</h3>
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {event.Status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.StartDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Tickets Sold</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold">{event.sold.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">/ {(event.capacity || 0).toLocaleString()}</p>
                          </div>
                          <div className="h-2 bg-muted rounded-full w-32 mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                              style={{ width: `${event.capacity ? (event.sold / event.capacity) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {event.Status === 'AwaitingDeposit' && (
                            <Button size="sm" className="gap-1 bg-gradient-to-r from-primary to-secondary" asChild>
                              <Link to={`/creator/events/${event._id}/deposit`}>
                                <CreditCard className="w-4 h-4" />
                                {t('creator.deposit.payNow')}
                              </Link>
                            </Button>
                          )}
                          {event.Status === 'Pending' && (
                            <Button variant="secondary" size="sm" asChild>
                              <Link to={`/creator/events/${event._id}/deposit`}>
                                {t('creator.deposit.viewStatus')}
                              </Link>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="gap-1" asChild>
                            <Link to={`/creator/events/${event._id}/edit`}>
                              <Pencil className="w-4 h-4" />
                              {t('creator.edit.editButton')}
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" asChild>
                            <a href={`/event/${event._id}`}>
                              <Settings className="w-4 h-4" />
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <EventEntryPanel
                      eventMongoId={event._id}
                      eventName={event.Name}
                      sold={event.sold}
                      entryGatingEnabled={event.entryGatingEnabled}
                      onSetupComplete={() => fetchMyEvents()}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {!embeddedCreateOnly && section === 'vendors' && <OrganizerVendorPanel />}
          {!embeddedCreateOnly && section === 'ushers' && <OrganizerUshersPanel />}
          {!embeddedCreateOnly && section === 'invitations' && <OrganizerInvitationsPanel />}
    </div>
  );
}
