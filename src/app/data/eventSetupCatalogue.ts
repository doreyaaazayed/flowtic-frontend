/**
 * Static event setup catalogue (frontend only — no DB).
 * Images: frontend/public/catalogue/{wedding|concert}/*.jpeg
 *
 * Prices are indicative EGP (Egypt) rental / setup estimates per item or package tier.
 * Adjust in this file when your vendor rates change.
 */

export type CatalogueItem = {
  id: string;
  name: string;
  priceEgp: number;
  /** Photo catalogue items only */
  image?: string;
  /** i18n prefix, e.g. creator.catalogue.menus.buffetSetClassic → .name, .description, .components */
  menuKey?: string;
};

/**
 * wedding = only when event category is Wedding
 * concert | catering = always visible in the catalogue
 */
export type CatalogueScope = 'wedding' | 'concert' | 'catering';

export type CatalogueSection = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  items: CatalogueItem[];
  /** Text cards with menu description + components (no photos) */
  display?: 'image' | 'menu';
  /** wedding / concert = category-gated; catering = always visible (buffet menus) */
  scope: CatalogueScope;
};

const PLACEHOLDER = '/catalogue/placeholder.svg';

function weddingImage(fileStem: string): string {
  return `/catalogue/wedding/${fileStem}.jpeg`;
}

function concertImage(fileStem: string): string {
  return `/catalogue/concert/${fileStem}.jpeg`;
}

function weddingItem(fileStem: string, name: string, priceEgp: number): CatalogueItem {
  return { id: `wedding-${fileStem}`, name, image: weddingImage(fileStem), priceEgp };
}

function buffetMenuItem(
  slug: string,
  name: string,
  priceEgp: number,
  menuKey: string,
): CatalogueItem {
  return { id: `wedding-${slug}`, name, priceEgp, menuKey };
}

function concertItem(fileStem: string, name: string, priceEgp: number): CatalogueItem {
  return { id: `concert-${fileStem}`, name, image: concertImage(fileStem), priceEgp };
}

/** Build items from parallel name + price arrays (keeps filenames in fileStem). */
function weddingItems(
  stems: string[],
  names: string[],
  prices: number[],
): CatalogueItem[] {
  return stems.map((stem, i) => weddingItem(stem, names[i], prices[i]));
}

function concertItems(
  stems: string[],
  names: string[],
  prices: number[],
): CatalogueItem[] {
  return stems.map((stem, i) => concertItem(stem, names[i], prices[i]));
}

export const EVENT_SETUP_CATALOGUE: CatalogueSection[] = [
  {
    id: 'wedding-center-pieces',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.weddingTables.title',
    descriptionKey: 'creator.catalogue.sections.weddingTables.description',
    items: weddingItems(
      ['center-piece-1', 'center-piece-2', 'center-piece-3', 'center-piece-4', 'center-piece-5', 'center-piece-6', 'center-piece-7'],
      ['Center piece 1', 'Center piece 2', 'Center piece 3', 'Center piece 4', 'Center piece 5', 'Center piece 6', 'Center piece 7'],
      [950, 1_200, 1_450, 1_750, 2_100, 2_600, 3_250],
    ),
  },
  {
    id: 'wedding-flower-bouquets',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.flowerBouquets.title',
    descriptionKey: 'creator.catalogue.sections.flowerBouquets.description',
    items: weddingItems(
      ['flower-bouqet-1', 'flower-bouqet-2', 'flower-bouqet-3', 'flower-bouqet-4'],
      ['Flower bouquet 1', 'Flower bouquet 2', 'Flower bouquet 3', 'Flower bouquet 4'],
      [2_500, 3_800, 5_500, 8_500],
    ),
  },
  {
    id: 'wedding-buffet',
    scope: 'catering',
    display: 'menu',
    titleKey: 'creator.catalogue.sections.weddingBuffet.title',
    descriptionKey: 'creator.catalogue.sections.weddingBuffet.description',
    items: [
      buffetMenuItem(
        'buffet-set-classic',
        'Set menu — Classic',
        52_000,
        'creator.catalogue.menus.buffetSetClassic',
      ),
      buffetMenuItem(
        'buffet-set-premium',
        'Set menu — Premium',
        78_000,
        'creator.catalogue.menus.buffetSetPremium',
      ),
      buffetMenuItem(
        'buffet-set-signature',
        'Set menu — Signature',
        105_000,
        'creator.catalogue.menus.buffetSetSignature',
      ),
      buffetMenuItem(
        'buffet-open-standard',
        'Open buffet — Standard',
        62_000,
        'creator.catalogue.menus.buffetOpenStandard',
      ),
      buffetMenuItem(
        'buffet-open-premium',
        'Open buffet — Premium',
        88_000,
        'creator.catalogue.menus.buffetOpenPremium',
      ),
      buffetMenuItem(
        'buffet-open-grand',
        'Open buffet — Grand',
        128_000,
        'creator.catalogue.menus.buffetOpenGrand',
      ),
    ],
  },
  {
    id: 'wedding-dance-floor',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.danceFloor.title',
    descriptionKey: 'creator.catalogue.sections.danceFloor.description',
    items: weddingItems(
      ['wedding-dance-floor-1', 'wedding-dance-floor-2'],
      ['Dance floor 1', 'Dance floor 2'],
      [18_000, 32_000],
    ),
  },
  {
    id: 'wedding-hall',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.hallDecoration.title',
    descriptionKey: 'creator.catalogue.sections.hallDecoration.description',
    items: weddingItems(
      ['hall-decoration-1', 'hall-decoration-2', 'hall-decoration-3', 'hall-decoration-4'],
      ['Hall decoration 1', 'Hall decoration 2', 'Hall decoration 3', 'Hall decoration 4'],
      [35_000, 55_000, 78_000, 120_000],
    ),
  },
  {
    id: 'wedding-open-air',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.openAirHall.title',
    descriptionKey: 'creator.catalogue.sections.openAirHall.description',
    items: weddingItems(
      [
        'open-air-hall-decoration-1',
        'open-air-hall-decoration-2',
        'open-air-hall-decoration-3',
        'open-air-hall-decoration-4',
        'open-air-hall-decoration-5',
        'open-air-hall-decoration-6',
      ],
      [
        'Open air hall decoration 1',
        'Open air hall decoration 2',
        'Open air hall decoration 3',
        'Open air hall decoration 4',
        'Open air hall decoration 5',
        'Open air hall decoration 6',
      ],
      [45_000, 62_000, 85_000, 110_000, 145_000, 195_000],
    ),
  },
  {
    id: 'wedding-stages',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.weddingStages.title',
    descriptionKey: 'creator.catalogue.sections.weddingStages.description',
    items: weddingItems(
      ['wedding-stage-1', 'wedding-stage-2', 'wedding-stage-3'],
      ['Wedding stage 1', 'Wedding stage 2', 'Wedding stage 3'],
      [28_000, 48_000, 72_000],
    ),
  },
  {
    id: 'wedding-sound',
    scope: 'wedding',
    titleKey: 'creator.catalogue.sections.weddingAv.title',
    descriptionKey: 'creator.catalogue.sections.weddingAv.description',
    items: weddingItems(
      ['dj-mixer-1', 'dj-mixer-2', 'drums-1', 'mic-package-1'],
      ['DJ mixer 1', 'DJ mixer 2', 'Drums 1', 'Mic package 1'],
      [4_500, 6_500, 3_500, 4_200],
    ),
  },
  {
    id: 'concert-stages',
    scope: 'concert',
    titleKey: 'creator.catalogue.sections.concertStages.title',
    descriptionKey: 'creator.catalogue.sections.concertStages.description',
    items: concertItems(
      ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'],
      ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'],
      [85_000, 125_000, 180_000, 260_000, 350_000],
    ),
  },
  {
    id: 'concert-production',
    scope: 'concert',
    titleKey: 'creator.catalogue.sections.concertProduction.title',
    descriptionKey: 'creator.catalogue.sections.concertProduction.description',
    items: concertItems(
      ['lighting-rig-1', 'screen-1', 'dj-mixer-1', 'dj-mixer-2', 'mic-package-1', 'drums-1'],
      ['Lighting rig 1', 'LED screen 1', 'DJ mixer 1', 'DJ mixer 2', 'Mic package 1', 'Drums 1'],
      [55_000, 95_000, 7_500, 11_000, 8_500, 6_500],
    ),
  },
];

export const CATALOGUE_PLACEHOLDER_IMAGE = PLACEHOLDER;

/** Section id for table centerpieces — quantity can be set; price stays flat per style. */
export const CENTER_PIECES_SECTION_ID = 'wedding-center-pieces';

export const WEDDING_BUFFET_SECTION_ID = 'wedding-buffet';

export function isMenuCatalogueSection(sectionId: string): boolean {
  const section = EVENT_SETUP_CATALOGUE.find((s) => s.id === sectionId);
  return section?.display === 'menu';
}

/** Matches category names such as "Weddings", "Wedding", etc. */
export function isWeddingEventCategory(categoryName: string | null | undefined): boolean {
  const n = String(categoryName ?? '').toLowerCase();
  if (!n) return false;
  return /\bwedding/.test(n) || n.includes('bridal') || n.includes('marriage');
}

export function isCatalogueSectionVisible(
  section: CatalogueSection,
  categoryName: string | null | undefined,
): boolean {
  if (section.scope === 'catering' || section.scope === 'concert') return true;
  if (section.scope === 'wedding') return isWeddingEventCategory(categoryName);
  return false;
}

export function getCatalogueSectionsForCategory(
  categoryName: string | null | undefined,
): CatalogueSection[] {
  return EVENT_SETUP_CATALOGUE.filter((s) => isCatalogueSectionVisible(s, categoryName));
}

export function isCatalogueItemVisibleForCategory(
  itemId: string,
  categoryName: string | null | undefined,
): boolean {
  for (const section of EVENT_SETUP_CATALOGUE) {
    if (!section.items.some((i) => i.id === itemId)) continue;
    return isCatalogueSectionVisible(section, categoryName);
  }
  return false;
}

export function getVisibleCatalogueItemIds(categoryName: string | null | undefined): Set<string> {
  return new Set(
    getCatalogueSectionsForCategory(categoryName).flatMap((s) => s.items.map((i) => i.id)),
  );
}

export function isCenterPieceItem(id: string): boolean {
  const section = EVENT_SETUP_CATALOGUE.find((s) => s.id === CENTER_PIECES_SECTION_ID);
  return section?.items.some((i) => i.id === id) ?? false;
}

export function supportsCatalogueQuantity(id: string): boolean {
  return isCenterPieceItem(id);
}

export function getAllCatalogueItems(): CatalogueItem[] {
  return EVENT_SETUP_CATALOGUE.flatMap((s) => s.items);
}

export function getCatalogueItemById(id: string): CatalogueItem | undefined {
  return getAllCatalogueItems().find((item) => item.id === id);
}

export function catalogueItemLabel(id: string): string {
  return getCatalogueItemById(id)?.name ?? id;
}

export function formatEgp(value: number): string {
  return `EGP ${new Intl.NumberFormat('en-EG').format(Math.round(value))}`;
}

export function catalogueItemLabelWithPrice(id: string, quantity?: number): string {
  const item = getCatalogueItemById(id);
  if (!item) return id;
  const base = `${item.name} (${formatEgp(item.priceEgp)})`;
  if (supportsCatalogueQuantity(id)) {
    const q = Math.max(1, Math.floor(quantity ?? 1) || 1);
    return `${base}, qty ${q}`;
  }
  return base;
}

export type CatalogueSelectionRow = { id: string; quantity?: number };

/** Sum of selected catalogue prices (EGP) — quantity does not multiply price. */
export function catalogueSelectionTotalEgp(
  selection: string[] | CatalogueSelectionRow[],
): number {
  const rows: CatalogueSelectionRow[] = Array.isArray(selection)
    ? typeof selection[0] === 'string'
      ? (selection as string[]).map((id) => ({ id }))
      : (selection as CatalogueSelectionRow[])
    : [];
  return rows.reduce((sum, { id }) => sum + (getCatalogueItemById(id)?.priceEgp ?? 0), 0);
}
