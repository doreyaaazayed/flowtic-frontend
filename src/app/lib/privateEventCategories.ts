/** Prom (4), Weddings (5), Private (6) — hidden from public discovery. */
export const PRIVATE_CATEGORY_IDS = [4, 5, 6] as const;

export function isPrivateCategoryId(categoryId: number | string | null | undefined): boolean {
  return PRIVATE_CATEGORY_IDS.includes(Number(categoryId) as (typeof PRIVATE_CATEGORY_IDS)[number]);
}

export function isPrivateCategoryName(name: string | null | undefined): boolean {
  const n = String(name ?? '').toLowerCase().trim();
  if (!n) return false;
  return (
    /\bprom\b/.test(n) ||
    /\bwedding/.test(n) ||
    n.includes('bridal') ||
    n.includes('marriage') ||
    /\bprivate\b/.test(n)
  );
}

export function isPrivateEventCategory(
  categoryId: number | string | null | undefined,
  categoryName?: string | null,
): boolean {
  return isPrivateCategoryId(categoryId) || isPrivateCategoryName(categoryName);
}

export type PrivateEventKind = 'wedding' | 'prom' | 'private';

export function privateEventKind(
  categoryId: number | string | null | undefined,
  categoryName?: string | null,
): PrivateEventKind {
  const id = Number(categoryId);
  const n = String(categoryName ?? '').toLowerCase();
  if (id === 5 || /\bwedding/.test(n) || n.includes('bridal') || n.includes('marriage')) {
    return 'wedding';
  }
  if (id === 4 || /\bprom\b/.test(n)) {
    return 'prom';
  }
  return 'private';
}

export function defaultInviteMessage(kind: PrivateEventKind): string {
  if (kind === 'wedding') return "You're invited to attend our wedding";
  if (kind === 'prom') return "You're invited to attend our prom";
  return "You're invited to this private celebration";
}

export type InvitationDetails = {
  brideName?: string;
  groomName?: string;
  honoreeName?: string;
  hostNames?: string;
  customMessage?: string;
};
