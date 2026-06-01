import type { StagePosition } from './stagePosition';

export type SeatMap3DSection = {
  name: string;
  price: number;
  rows: Array<{
    label: string;
    seats: Array<{ SeatID: number; SeatNumber: number; available: boolean }>;
  }>;
};

export type Seat3DInstance = {
  seatId: number;
  seat: { SeatID: number; SeatNumber: number; available: boolean };
  sectionIndex: number;
  sectionName: string;
  rowLabel: string;
  price: number;
  position: { x: number; y: number; z: number };
  colorHex: string;
  available: boolean;
};

const SECTION_COLORS = ['#818cf8', '#2563eb', '#d97706', '#15803d', '#6d28d9', '#e11d48'];

function stageFocal(stage: StagePosition): { x: number; z: number } {
  switch (stage) {
    case 'top':
      return { x: 0, z: -14 };
    case 'left':
      return { x: -14, z: 0 };
    case 'right':
      return { x: 14, z: 0 };
    case 'center':
      return { x: 0, z: 0 };
    case 'bottom':
    default:
      return { x: 0, z: 14 };
  }
}

/** Build instanced 3D seat positions in a rounded bowl around the stage focal point. */
export function buildSeat3DInstances(
  sections: SeatMap3DSection[],
  stagePosition: StagePosition,
  sectionVisible?: boolean[],
): Seat3DInstance[] {
  const focal = stageFocal(stagePosition);
  const isCenter = stagePosition === 'center';
  const out: Seat3DInstance[] = [];

  const visibleSections = sections
    .map((sec, si) => ({ sec, si }))
    .filter(({ si }) => !(sectionVisible && sectionVisible[si] === false));

  const nSec = visibleSections.length;
  visibleSections.forEach(({ sec, si }, visIdx) => {
    const colorHex = SECTION_COLORS[si % SECTION_COLORS.length];
    const sectionAngle =
      nSec > 1
        ? (2 * Math.PI * visIdx) / nSec - Math.PI / 2
        : -Math.PI / 2;
    const baseRadius = isCenter ? 10 : 8;
    const rowStep = 0.62;

    sec.rows.forEach((row, ri) => {
      const count = row.seats.length;
      if (count === 0) return;
      const radius = baseRadius + ri * rowStep;
      const arcSpan = Math.min(Math.PI * 0.92, Math.max(0.35, count * 0.065));

      row.seats.forEach((seat, ci) => {
        const t = count > 1 ? ci / (count - 1) : 0.5;
        const theta = sectionAngle - arcSpan / 2 + t * arcSpan;
        let x = focal.x + radius * Math.cos(theta);
        let z = focal.z + radius * Math.sin(theta);

        if (!isCenter && nSec === 1) {
          const spread = (ci - (count - 1) / 2) * 0.52;
          x = focal.x + spread;
          z = focal.z - ri * rowStep;
        }

        out.push({
          seatId: seat.SeatID,
          seat,
          sectionIndex: si,
          sectionName: sec.name,
          rowLabel: row.label,
          price: sec.price,
          position: { x, y: 0.12, z },
          colorHex,
          available: seat.available,
        });
      });
    });
  });

  return out;
}

export function stage3DPosition(stage: StagePosition): [number, number, number] {
  const f = stageFocal(stage);
  return [f.x, 0.08, f.z];
}
