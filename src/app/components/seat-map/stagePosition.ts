export type StagePosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'none';

export const STAGE_POSITIONS: StagePosition[] = ['top', 'bottom', 'left', 'right', 'center', 'none'];

export const STAGE_POSITION_LABELS: Record<StagePosition, string> = {
  top: 'Top (stage above seats)',
  bottom: 'Bottom (stage below seats)',
  left: 'Left side',
  right: 'Right side',
  center: 'Center (pitch or stage in the middle)',
  none: 'Hidden',
};

export const STAGE_POSITION_SHORT: Record<StagePosition, string> = {
  top: 'Top',
  bottom: 'Bottom',
  left: 'Left',
  right: 'Right',
  center: 'Center',
  none: 'None',
};

export function normalizeStagePosition(value: unknown): StagePosition {
  const v = String(value ?? 'bottom').toLowerCase();
  if (STAGE_POSITIONS.includes(v as StagePosition)) return v as StagePosition;
  if (v === 'front') return 'bottom';
  if (v === 'rear') return 'top';
  return 'bottom';
}

export function stageArrow(position: StagePosition): string {
  switch (position) {
    case 'top':
      return '▼';
    case 'bottom':
      return '▲';
    case 'left':
      return '▶';
    case 'right':
      return '◀';
    case 'center':
      return '◆';
    default:
      return '';
  }
}
