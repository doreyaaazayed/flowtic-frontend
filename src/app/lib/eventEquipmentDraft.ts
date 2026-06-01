import {
  getAllCatalogueItems,
  getVisibleCatalogueItemIds,
  supportsCatalogueQuantity,
} from '../data/eventSetupCatalogue';

const STORAGE_KEY = 'flowtic_create_event_equipment';

export type EquipmentDraftEntry = {
  id: string;
  /** Tables / units — center pieces only; does not change catalogue price */
  quantity?: number;
};

function normalizeDraftIds(ids: string[]): string[] {
  const validIds = new Set(getAllCatalogueItems().map((i) => i.id));
  const byLegacyTail = new Map<string, string[]>();
  for (const id of validIds) {
    const tail = id.replace(/^(wedding|concert)-/, '');
    const arr = byLegacyTail.get(tail) || [];
    arr.push(id);
    byLegacyTail.set(tail, arr);
  }

  const out: string[] = [];
  for (const raw of ids) {
    if (validIds.has(raw)) {
      out.push(raw);
      continue;
    }
    const match = byLegacyTail.get(raw);
    if (match && match.length === 1) out.push(match[0]);
  }
  return [...new Set(out)];
}

function clampCenterPieceQty(n: number): number {
  return Math.max(1, Math.min(999, Math.floor(n) || 1));
}

function normalizeEntry(raw: unknown): EquipmentDraftEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof (raw as EquipmentDraftEntry).id === 'string' ? (raw as EquipmentDraftEntry).id : '';
  if (!id) return null;
  const validIds = new Set(getAllCatalogueItems().map((i) => i.id));
  const normalizedIds = normalizeDraftIds([id]);
  const resolvedId = normalizedIds[0];
  if (!resolvedId || !validIds.has(resolvedId)) return null;

  if (supportsCatalogueQuantity(resolvedId)) {
    const q = (raw as EquipmentDraftEntry).quantity;
    return { id: resolvedId, quantity: clampCenterPieceQty(Number(q) || 1) };
  }
  return { id: resolvedId };
}

function normalizeDraft(entries: EquipmentDraftEntry[]): EquipmentDraftEntry[] {
  const map = new Map<string, EquipmentDraftEntry>();
  for (const e of entries) {
    const n = normalizeEntry(e);
    if (n) map.set(n.id, n);
  }
  return [...map.values()];
}

function parseStoredDraft(raw: string): EquipmentDraftEntry[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  if (parsed.length > 0 && typeof parsed[0] === 'string') {
    return normalizeDraft(
      normalizeDraftIds(parsed.filter((x): x is string => typeof x === 'string')).map((id) => ({
        id,
        ...(supportsCatalogueQuantity(id) ? { quantity: 1 } : {}),
      })),
    );
  }

  const entries: EquipmentDraftEntry[] = [];
  for (const row of parsed) {
    const n = normalizeEntry(row);
    if (n) entries.push(n);
  }
  return normalizeDraft(entries);
}

export function loadEquipmentDraft(): EquipmentDraftEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const normalized = parseStoredDraft(raw);
    if (normalized.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function saveEquipmentDraft(entries: EquipmentDraftEntry[]): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeDraft(entries);
  if (normalized.length > 0) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function clearEquipmentDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getEquipmentDraftIds(entries: EquipmentDraftEntry[]): string[] {
  return entries.map((e) => e.id);
}

export function getEntryQuantity(entries: EquipmentDraftEntry[], id: string): number {
  const row = entries.find((e) => e.id === id);
  if (!row) return 1;
  if (supportsCatalogueQuantity(id)) return row.quantity ?? 1;
  return 1;
}

/** Drop selections that are hidden for the current event category. */
export function pruneEquipmentDraftForCategory(
  entries: EquipmentDraftEntry[],
  categoryName: string | null | undefined,
): EquipmentDraftEntry[] {
  const visible = getVisibleCatalogueItemIds(categoryName);
  return normalizeDraft(entries.filter((e) => visible.has(e.id)));
}
