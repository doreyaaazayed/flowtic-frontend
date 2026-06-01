/** Map normalized seat coords (0–1 on image bitmap) to % positions inside a box that uses CSS object-contain. */
export function objectContainOverlay(
  cw: number,
  ch: number,
  nw: number,
  nh: number,
): { ox: number; oy: number; dw: number; dh: number; cw: number; ch: number } | null {
  if (cw <= 0 || ch <= 0 || nw <= 0 || nh <= 0) return null;
  const scale = Math.min(cw / nw, ch / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  const ox = (cw - dw) / 2;
  const oy = (ch - dh) / 2;
  return { ox, oy, dw, dh, cw, ch };
}

/** Seat has usable diagram coordinates for overlay on the uploaded floor image. */
export function seatOnFloorPlan(
  s: { posX?: number; posY?: number },
  hasFloorImage: boolean,
): boolean {
  return hasFloorImage && s.posX != null && s.posY != null;
}

/** Split row seats into contiguous blocks with visual “aisles” between (cinema-style). */
export function splitRowIntoBlocks<T>(seats: T[], opts?: { maxBlocks?: number; minSplitLength?: number }): T[][] {
  const n = seats.length;
  const maxBlocks = opts?.maxBlocks ?? 3;
  const minSplitLength = opts?.minSplitLength ?? 10;
  if (n <= minSplitLength || maxBlocks < 2) return [seats];
  const blocks = Math.min(maxBlocks, n);
  const out: T[][] = [];
  let cursor = 0;
  const base = Math.floor(n / blocks);
  const remainder = n % blocks;
  for (let b = 0; b < blocks; b++) {
    const sz = base + (b < remainder ? 1 : 0);
    out.push(seats.slice(cursor, cursor + sz));
    cursor += sz;
  }
  return out.filter((g) => g.length > 0);
}
