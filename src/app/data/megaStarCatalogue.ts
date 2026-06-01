/**
 * Mega-star / headline act catalogue (indicative EGP, Egypt private events).
 * Photos: frontend/public/catalogue/mega-stars/ (see STAR_IMAGE_FILE)
 *
 * Market reference (2024–2025 press / industry reports):
 * - El Mogaz: wedding fees for Diab (~5M EGP), Hosny (~4M), Hamaki (~3M), Saad (~3M),
 *   Esseily (~250k), Wegz (500k+), Reda El Bahrawy (~100k) — elmogaz.com/795316
 * - Longer slots (90–120 / 120–150 min) scaled ~+15–30% vs ~1h base (typical negotiation).
 * - Band estimates: private corporate packages (no public fee list); aligned to draw tier.
 * Update prices when you have contracted vendor rates.
 */

import { CATALOGUE_PLACEHOLDER_IMAGE } from './eventSetupCatalogue';

export type MegaStarDurationOption = {
  id: string;
  labelKey: string;
  priceEgp: number;
};

export type MegaStarKind = 'artist' | 'band';

export type MegaStarOption = {
  id: string;
  nameKey: string;
  image: string;
  kind: MegaStarKind;
  durations: MegaStarDurationOption[];
};

export const MEGA_STAR_PLACEHOLDER_IMAGE = CATALOGUE_PLACEHOLDER_IMAGE;

/** Filenames under public/catalogue/mega-stars/ (must match uploaded files). */
const STAR_IMAGE_FILE: Record<string, string> = {
  'amr-diab': 'amr-diab.jpg',
  'tamer-hosny': 'tamer-hosny.jpg',
  'mahmoud-el-esseily': 'mahmoud-el-esseily.jpg',
  'pousy': 'bosy.jpg',
  'reda-el-bahrawy': 'reda-el-bahrawy.jpg',
  'mohamed-hamaki': 'mohamed-hamaki.jpg',
  sherine: 'sherine.jpg',
  wegz: 'wegz.jpg',
  'ahmed-saad': 'ahmed-saad.jpg',
  angham: 'angham.jpg',
  ruby: 'ruby.jpg',
  cairokee: 'cairokee.jpg',
  sharmoofers: 'sharmoofers.png',
  'disco-misr': 'disco-misr.jpg',
  'massar-egbari': 'massar-egbari.png',
};

function starImage(id: string): string {
  const file = STAR_IMAGE_FILE[id];
  return file
    ? `/catalogue/mega-stars/${file}`
    : `/catalogue/mega-stars/${id}.jpg`;
}

function d(
  id: string,
  labelKey: string,
  priceEgp: number,
): MegaStarDurationOption {
  return { id, labelKey, priceEgp };
}

function pricedDurations(
  p60: number,
  p90: number,
  p120: number,
): MegaStarDurationOption[] {
  return [
    d('60-90', 'creator.megaStar.durations.60to90', p60),
    d('90-120', 'creator.megaStar.durations.90to120', p90),
    d('120-150', 'creator.megaStar.durations.120to150', p120),
  ];
}

function pricedDurationsShort(
  p45: number,
  p60: number,
  p90: number,
): MegaStarDurationOption[] {
  return [
    d('45-60', 'creator.megaStar.durations.45to60', p45),
    d('60-90', 'creator.megaStar.durations.60to90', p60),
    d('90-120', 'creator.megaStar.durations.90to120', p90),
  ];
}

function artist(
  id: string,
  nameKey: string,
  durations: MegaStarDurationOption[],
): MegaStarOption {
  return { id, nameKey, image: starImage(id), kind: 'artist', durations };
}

function band(
  id: string,
  nameKey: string,
  durations: MegaStarDurationOption[],
): MegaStarOption {
  return { id, nameKey, image: starImage(id), kind: 'band', durations };
}

export const MEGA_STAR_CATALOGUE: MegaStarOption[] = [
  // —— Artists ——
  artist('amr-diab', 'creator.megaStar.stars.amrDiab', pricedDurations(5_000_000, 5_800_000, 6_500_000)),
  artist('tamer-hosny', 'creator.megaStar.stars.tamerHosny', pricedDurations(4_000_000, 4_600_000, 5_300_000)),
  artist('mohamed-hamaki', 'creator.megaStar.stars.hamaki', pricedDurations(3_000_000, 3_500_000, 4_000_000)),
  artist('sherine', 'creator.megaStar.stars.sherine', pricedDurations(4_500_000, 5_200_000, 6_000_000)),
  artist('ahmed-saad', 'creator.megaStar.stars.ahmedSaad', pricedDurations(3_000_000, 3_500_000, 4_000_000)),
  artist('angham', 'creator.megaStar.stars.angham', pricedDurations(2_000_000, 2_400_000, 2_900_000)),
  artist('wegz', 'creator.megaStar.stars.wegz', pricedDurationsShort(550_000, 700_000, 850_000)),
  artist('ruby', 'creator.megaStar.stars.ruby', pricedDurations(700_000, 900_000, 1_100_000)),
  artist('mahmoud-el-esseily', 'creator.megaStar.stars.mahmoudElEsseily', pricedDurations(250_000, 320_000, 400_000)),
  artist('pousy', 'creator.megaStar.stars.pousy', pricedDurationsShort(300_000, 380_000, 480_000)),
  artist('reda-el-bahrawy', 'creator.megaStar.stars.redaElBahrawy', pricedDurationsShort(90_000, 100_000, 130_000)),
  // —— Bands (private event estimates) ——
  band('cairokee', 'creator.megaStar.stars.cairokee', pricedDurations(800_000, 1_000_000, 1_250_000)),
  band('sharmoofers', 'creator.megaStar.stars.sharmoofers', pricedDurations(550_000, 700_000, 850_000)),
  band('disco-misr', 'creator.megaStar.stars.discoMisr', pricedDurations(450_000, 580_000, 720_000)),
  band('massar-egbari', 'creator.megaStar.stars.massarEgbari', pricedDurations(500_000, 650_000, 800_000)),
];

export const MEGA_STAR_ARTISTS = MEGA_STAR_CATALOGUE.filter((s) => s.kind === 'artist');
export const MEGA_STAR_BANDS = MEGA_STAR_CATALOGUE.filter((s) => s.kind === 'band');

export function getMegaStarById(starId: string): MegaStarOption | undefined {
  return MEGA_STAR_CATALOGUE.find((s) => s.id === starId);
}

export function getMegaStarDisplayName(
  star: MegaStarOption,
  t: (key: string) => string,
): string {
  return t(star.nameKey);
}

export function getMegaStarDuration(
  starId: string,
  durationId: string,
): (MegaStarDurationOption & { star: MegaStarOption }) | undefined {
  const star = getMegaStarById(starId);
  if (!star) return undefined;
  const duration = star.durations.find((d) => d.id === durationId);
  if (!duration) return undefined;
  return { ...duration, star };
}

export type MegaStarSelectionPayload = {
  starId: string;
  starName: string;
  durationId: string;
  durationLabel: string;
  priceEgp: number;
  displayLabel: string;
};

export function buildMegaStarPayload(
  starId: string,
  durationId: string,
  t: (key: string) => string,
): MegaStarSelectionPayload | null {
  const match = getMegaStarDuration(starId, durationId);
  if (!match) return null;
  const starName = getMegaStarDisplayName(match.star, t);
  const durationLabel = t(match.labelKey);
  const priceEgp = match.priceEgp;
  const displayLabel = `${starName} — ${durationLabel} (${formatMegaStarEgp(priceEgp)})`;
  return {
    starId,
    starName,
    durationId,
    durationLabel,
    priceEgp,
    displayLabel,
  };
}

export function formatMegaStarEgp(value: number): string {
  return `EGP ${new Intl.NumberFormat('en-EG').format(Math.round(value))}`;
}
