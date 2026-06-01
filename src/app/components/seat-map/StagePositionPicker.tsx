import type { StagePosition } from './stagePosition';
import { STAGE_POSITIONS, STAGE_POSITION_LABELS, STAGE_POSITION_SHORT, stageArrow } from './stagePosition';

type Props = {
  value: StagePosition;
  onChange: (value: StagePosition) => void;
  compact?: boolean;
  className?: string;
};

/** Visual picker for where the stage / pitch sits relative to seating. */
export function StagePositionPicker({ value, onChange, compact, className = '' }: Props) {
  const options = STAGE_POSITIONS;

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {options.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              value === pos
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40'
            }`}
          >
            {STAGE_POSITION_SHORT[pos]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <p className="text-sm font-medium">Stage / pitch position</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Match your venue photo — where the field or stage sits relative to the stands.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
              value === pos
                ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                : 'border-border bg-muted/20 hover:border-primary/40'
            }`}
          >
            <StageMiniDiagram position={pos} active={value === pos} />
            <span className="text-xs font-medium leading-tight">{STAGE_POSITION_SHORT[pos]}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{STAGE_POSITION_LABELS[value]}</p>
    </div>
  );
}

function StageMiniDiagram({ position, active }: { position: StagePosition; active: boolean }) {
  const stageCls = active ? 'bg-primary/80' : 'bg-muted-foreground/50';
  const seatCls = active ? 'bg-primary/25' : 'bg-muted-foreground/20';

  if (position === 'none') {
    return (
      <div className="w-14 h-10 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <div className="w-14 h-10 rounded border border-border/80 bg-background/80 p-1 flex items-center justify-center">
      {position === 'bottom' && (
        <div className="flex flex-col items-center gap-0.5 w-full h-full justify-end">
          <div className={`w-full h-2 rounded-sm ${seatCls}`} />
          <div className={`w-8 h-1.5 rounded-full ${stageCls}`} />
        </div>
      )}
      {position === 'top' && (
        <div className="flex flex-col items-center gap-0.5 w-full h-full justify-start">
          <div className={`w-8 h-1.5 rounded-full ${stageCls}`} />
          <div className={`w-full h-2 rounded-sm ${seatCls}`} />
        </div>
      )}
      {position === 'left' && (
        <div className="flex items-center gap-0.5 w-full h-full">
          <div className={`w-2 h-full rounded-sm ${stageCls}`} />
          <div className={`flex-1 h-2 rounded-sm ${seatCls}`} />
        </div>
      )}
      {position === 'right' && (
        <div className="flex items-center gap-0.5 w-full h-full">
          <div className={`flex-1 h-2 rounded-sm ${seatCls}`} />
          <div className={`w-2 h-full rounded-sm ${stageCls}`} />
        </div>
      )}
      {position === 'center' && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className={`absolute inset-1 rounded-sm ${seatCls} opacity-80`} />
          <div className={`relative z-[1] h-3 w-3 rounded-full ${stageCls}`} />
        </div>
      )}
    </div>
  );
}

export function StageIndicator({
  position,
  label = 'Stage / Pitch',
  className = '',
}: {
  position: StagePosition;
  label?: string;
  className?: string;
}) {
  if (position === 'none') return null;
  const arrow = stageArrow(position);
  return (
    <div
      className={`flex justify-center items-center px-6 py-1.5 rounded-full bg-muted text-xs text-muted-foreground border border-border shrink-0 ${className}`}
    >
      {arrow ? <span className="me-1.5 opacity-80">{arrow}</span> : null}
      {label}
    </div>
  );
}
