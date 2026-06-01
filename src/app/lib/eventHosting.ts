/** What FlowTic supplies for this event */
export type EventHostingMode =
  | 'ticketing_only'
  | 'equipment_only'
  | 'venue_only'
  | 'full_setup';

export type ExternalVenue = {
  name?: string;
  /** City / area — public on listings */
  location?: string;
  /** Street / building — private until ticket purchase */
  address?: string;
  capacity?: number;
};

export type EventVenueSource = {
  hostingMode?: EventHostingMode | string;
  VenueID?: number;
  externalVenue?: ExternalVenue;
  venueDetailsRevealed?: boolean;
};

const HOSTING_MODE_KEY = 'flowtic_event_hosting_mode';

export const HOSTING_MODE_OPTIONS: EventHostingMode[] = [
  'ticketing_only',
  'equipment_only',
  'venue_only',
  'full_setup',
];

export function normalizeHostingMode(raw?: string | null): EventHostingMode {
  const m = String(raw || '').trim();
  if (HOSTING_MODE_OPTIONS.includes(m as EventHostingMode)) {
    return m as EventHostingMode;
  }
  return 'full_setup';
}

export function usesPlatformVenue(mode: EventHostingMode): boolean {
  return mode === 'venue_only' || mode === 'full_setup';
}

export function usesExternalVenue(mode: EventHostingMode): boolean {
  return mode === 'ticketing_only' || mode === 'equipment_only';
}

export function usesPlatformEquipment(mode: EventHostingMode): boolean {
  return mode === 'equipment_only' || mode === 'full_setup';
}

export function equipmentRequired(mode: EventHostingMode): boolean {
  return mode === 'equipment_only' || mode === 'full_setup';
}

export function isExternalVenueRedacted(event: EventVenueSource): boolean {
  const mode = normalizeHostingMode(event.hostingMode);
  if (!usesExternalVenue(mode)) return false;
  const ext = event.externalVenue;
  if (!ext?.location) return false;
  return !ext.name && !ext.address;
}

export function saveHostingModeDraft(mode: EventHostingMode): void {
  try {
    sessionStorage.setItem(HOSTING_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function loadHostingModeDraft(): EventHostingMode | null {
  try {
    const raw = sessionStorage.getItem(HOSTING_MODE_KEY);
    if (!raw) return null;
    return normalizeHostingMode(raw);
  } catch {
    return null;
  }
}

/** Public listing / card location (city/area only for external venues). */
export function resolveEventPublicLocation(
  event: EventVenueSource,
  platformVenues: Array<{ VenueID: number; Name: string; Location?: string }>,
): string {
  const mode = normalizeHostingMode(event.hostingMode);
  if (usesExternalVenue(mode) && event.externalVenue?.location) {
    return event.externalVenue.location;
  }
  if (event.VenueID != null) {
    const v = platformVenues.find((x) => x.VenueID === event.VenueID);
    return v?.Location || v?.Name || `Venue ${event.VenueID}`;
  }
  return '—';
}

/** Full venue line for ticket holders, organizers, admins. */
export function resolveEventVenueLabel(
  event: EventVenueSource,
  platformVenues: Array<{ VenueID: number; Name: string; Location?: string }>,
): string {
  const mode = normalizeHostingMode(event.hostingMode);
  if (usesExternalVenue(mode) && event.externalVenue) {
    const { name, location, address } = event.externalVenue;
    if (!name && !address && location) {
      return location;
    }
    const parts = [name, address, location].filter(Boolean);
    return parts.length > 0 ? parts.join(' — ') : '—';
  }
  if (event.VenueID != null) {
    const v = platformVenues.find((x) => x.VenueID === event.VenueID);
    if (v) return `${v.Name}${v.Location ? ` — ${v.Location}` : ''}`;
    return `Venue #${event.VenueID}`;
  }
  return '—';
}

/** Address string for Google Maps search / directions. */
export function resolveEventMapQuery(
  event: EventVenueSource,
  platformVenues: Array<{ VenueID: number; Name: string; Location?: string }>,
): string | null {
  const mode = normalizeHostingMode(event.hostingMode);
  if (usesExternalVenue(mode) && event.externalVenue) {
    const { name, location, address } = event.externalVenue;
    const parts = [name, address, location].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  if (event.VenueID != null) {
    const v = platformVenues.find((x) => x.VenueID === event.VenueID);
    if (v) {
      const parts = [v.Name, v.Location].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : null;
    }
  }
  return null;
}

/** @deprecated Prefer resolveEventPublicLocation or resolveEventVenueLabel */
export function resolveEventLocationLine(
  event: EventVenueSource,
  platformVenues: Array<{ VenueID: number; Name: string; Location?: string }>,
): string {
  if (isExternalVenueRedacted(event)) {
    return resolveEventPublicLocation(event, platformVenues);
  }
  return resolveEventVenueLabel(event, platformVenues);
}
