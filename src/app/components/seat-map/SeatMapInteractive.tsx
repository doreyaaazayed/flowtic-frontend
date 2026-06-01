import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { objectContainOverlay, seatOnFloorPlan, splitRowIntoBlocks } from './seatMapHelpers';
import { StageIndicator } from './StagePositionPicker';
import type { StagePosition } from './stagePosition';
import { normalizeStagePosition } from './stagePosition';

const SeatMap3D = lazy(() => import('./SeatMap3D').then((m) => ({ default: m.SeatMap3D })));

export type InteractiveSeatMapSeat = {
  SeatID: number;
  SeatNumber: number;
  available: boolean;
  posX?: number;
  posY?: number;
};

export type InteractiveSeatMapSection = {
  name: string;
  ticketCategoryId?: string;
  ticketCategoryName?: string;
  price: number;
  rows: Array<{
    label: string;
    seats: InteractiveSeatMapSeat[];
  }>;
};

const SECTION_SEAT_SURFACE = [
  'border-[#cbd5f5] hover:border-[#818cf8]',
  'border-[#93c5fd] hover:border-[#2563eb]',
  'border-[#fcd34d] hover:border-[#d97706]',
  'border-[#86efac] hover:border-[#15803d]',
  'border-[#c4b5fd] hover:border-[#6d28d9]',
  'border-[#fda4af] hover:border-[#e11d48]',
];

type SeatChipProps = {
  seat: InteractiveSeatMapSeat;
  sectionIndex: number;
  interactive: boolean;
  selected: boolean;
  currency: string;
  sectionName: string;
  rowLabel: string;
  priceLabel: number;
  onToggle: () => void;
};

function SeatChip({
  seat,
  sectionIndex,
  interactive,
  selected,
  currency,
  sectionName,
  rowLabel,
  priceLabel,
  onToggle,
}: SeatChipProps) {
  const base =
    interactive && seat.available
      ? `border ${SECTION_SEAT_SURFACE[sectionIndex % SECTION_SEAT_SURFACE.length]} shadow-sm `
      : 'border-muted-foreground/40 opacity-65 cursor-not-allowed ';
  const avail = interactive && seat.available;
  const state = !seat.available
    ? 'bg-muted text-muted-foreground '
    : selected
      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30 scale-[1.02] z-[1]'
      : avail
        ? `bg-background text-foreground `
        : 'bg-muted text-muted-foreground';

  const titleParts = `${sectionName} • Row ${rowLabel} • Seat ${seat.SeatNumber} • ${currency} ${priceLabel.toFixed(2)}`;

  return (
    <button
      type="button"
      data-seat
      aria-pressed={selected}
      aria-label={
    seat.available
      ? selected
        ? `Seat ${seat.SeatNumber}, selected`
        : `Seat ${seat.SeatNumber}, available`
      : `Seat ${seat.SeatNumber}, unavailable`
  }
      title={seat.available ? titleParts : 'Unavailable'}
      disabled={interactive ? !seat.available : true}
      onClick={(e) => {
        e.stopPropagation();
        if (avail) onToggle();
      }}
      className={`h-9 min-w-[2.25rem] px-1.5 rounded-[4px] text-xs font-semibold tabular-nums transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${base}${state}${interactive && avail && !selected ? ' hover:bg-muted/70 active:scale-[0.96]' : ''}`}
    >
      {seat.SeatNumber}
    </button>
  );
}

type Props = {
  sections: InteractiveSeatMapSection[];
  currency?: string;
  floorPlanUrl?: string | null;
  stagePosition?: StagePosition;
  sectionVisible?: boolean[];
  selectedSeatIds: number[];
  defaultZoom?: number;
  onToggleSeat: (seatId: number, available: boolean) => void;
};

export function SeatMapInteractive({
  sections,
  currency = 'EGP',
  floorPlanUrl,
  stagePosition: stagePositionProp = 'bottom',
  sectionVisible,
  selectedSeatIds,
  defaultZoom = 0.7,
  onToggleSeat,
}: Props) {
  const stagePosition = normalizeStagePosition(stagePositionProp);
  const use3DBowl = stagePosition === 'center';
  const hasFloor = Boolean(floorPlanUrl && String(floorPlanUrl).trim()) && !use3DBowl;
  const [zoom, setZoom] = useState(defaultZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const [dragActive, setDragActive] = useState(false);
  const dragSnapshot = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const diagramRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [overlay, setOverlay] = useState<NonNullable<
    ReturnType<typeof objectContainOverlay>
  > | null>(null);

  const hasAnyCoords = sections.some((sec) =>
    sec.rows.some((r) => r.seats.some((s) => seatOnFloorPlan(s, !!hasFloor))),
  );
  const showDiagram = hasFloor && hasAnyCoords;

  useLayoutEffect(() => {
    if (!showDiagram || !diagramRef.current || !natural || natural.w <= 0 || natural.h <= 0) {
      setOverlay(null);
      return;
    }
    const el = diagramRef.current;
    const next = objectContainOverlay(el.clientWidth, el.clientHeight, natural.w, natural.h);
    setOverlay(next);
    const ro = new ResizeObserver(() => {
      if (!diagramRef.current || !natural) return;
      setOverlay(
        objectContainOverlay(diagramRef.current!.clientWidth, diagramRef.current!.clientHeight, natural.w, natural.h),
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [natural, showDiagram, floorPlanUrl]);

  const resetZoom = () => {
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
  };

  /** Wheel zoom only applies on the floor-plan viewport (does not hijack page scroll on the schematic). */
  useEffect(() => {
    const el = diagramRef.current;
    if (!showDiagram || !el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const isPinch = e.ctrlKey;
      const magnitude = Math.min(1.2, Math.abs(e.deltaY) / 240);
      const delta = Math.sign(-e.deltaY) * magnitude * (isPinch ? 0.05 : 0.065);
      setZoom((z) => Math.min(2.5, Math.max(0.35, +(z + delta).toFixed(2))));
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [showDiagram]);

  const onPointerDownVp = useCallback((e: React.PointerEvent) => {
    if (!showDiagram) return;
    if ((e.target as HTMLElement).closest('[data-seat]')) return;
    dragging.current = true;
    setDragActive(true);
    dragSnapshot.current = { x: pan.x, y: pan.y, px: e.clientX, py: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y, showDiagram]);

  const onPointerMoveVp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !showDiagram) return;
      const dx = e.clientX - dragSnapshot.current.px;
      const dy = e.clientY - dragSnapshot.current.py;
      setPan({ x: dragSnapshot.current.x + dx, y: dragSnapshot.current.y + dy });
    },
    [showDiagram],
  );

  const endDrag = () => {
    dragging.current = false;
    setDragActive(false);
  };

  const pctLabel = `${Math.round(zoom * 100)}%`;

  const legend = (
    <div className="flex flex-wrap gap-4 text-xs mb-6 text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-8 w-8 rounded-[4px] border border-border bg-background shadow-sm align-middle" />
        Available
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-8 w-8 rounded-[4px] bg-primary shadow-sm align-middle" />
        Selected
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-8 w-8 rounded-[4px] border border-muted bg-muted align-middle opacity-70" />
        Taken
      </span>
    </div>
  );

  if (use3DBowl) {
    return (
      <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/10 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 border-b border-border/60 bg-card/95">
          <p className="text-sm font-medium">Stadium bowl — 3D view</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Center pitch layout with rounded stands. Rotate and zoom to explore, then click seats to select.
          </p>
        </div>
        <div className="px-5 py-6">
          {legend}
          <Suspense
            fallback={
              <div className="h-[min(56vh,520px)] min-h-[320px] rounded-xl bg-muted/30 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
                Loading 3D map…
              </div>
            }
          >
            <SeatMap3D
              sections={sections}
              stagePosition={stagePosition}
              sectionVisible={sectionVisible}
              selectedSeatIds={selectedSeatIds}
              currency={currency}
              onToggleSeat={onToggleSeat}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/10 shadow-sm overflow-hidden">
      {/* Toolbar — mirrors reference cinema controls */}
      <div className="flex flex-wrap justify-end gap-2 items-center px-4 py-3 border-b border-border/60 bg-card/95">
        <div className="flex items-center rounded-xl border border-border/80 bg-background/95 shadow-inner p-1 gap-0">
          <button
            type="button"
            className="h-10 px-4 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
            onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))}
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5 mx-auto" />
          </button>
          <button
            type="button"
            className="h-10 px-3 rounded-lg text-sm font-semibold tabular-nums text-muted-foreground hover:bg-muted transition-colors bg-muted/30"
            onClick={resetZoom}
            aria-label="Reset zoom and pan"
          >
            Reset
          </button>
          <button
            type="button"
            className="h-10 px-4 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5 mx-auto" />
          </button>
        </div>
        <div className="min-w-[3.75rem] text-center rounded-lg px-3 py-2 text-xs font-semibold tabular-nums text-muted-foreground border border-transparent bg-muted/25">
          {pctLabel}
        </div>
      </div>

      <div className="relative">
        {showDiagram && (
          <>
            <div className="px-5 pt-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Venue diagram — pinch or scroll wheel to zoom • drag pan space to move • click seats by number.
              </p>
              <div
                ref={diagramRef}
                className="relative w-full rounded-xl overflow-hidden bg-[#ebe7de] ring-1 ring-black/10 dark:bg-muted aspect-[16/10] shadow-inner select-none touch-none cursor-grab active:cursor-grabbing max-h-[min(56vh,520px)]"
                onPointerDown={onPointerDownVp}
                onPointerMove={onPointerMoveVp}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                role="presentation"
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: dragActive ? 'none' : 'transform 80ms linear',
                  }}
                >
                  <img
                    src={floorPlanUrl ?? ''}
                    alt=""
                    draggable={false}
                    className="max-w-none w-full h-full object-contain pointer-events-none opacity-95"
                    onLoad={(e) =>
                      setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                    }
                  />
                  {/* Seat overlays */}
                  {overlay &&
                    sections.flatMap((section, si) => {
                      const vis = !(sectionVisible && sectionVisible[si] === false);
                      return section.rows.flatMap((row) =>
                        row.seats.map((seat) => {
                          if (seat.posX == null || seat.posY == null) return null;
                          const px = seat.posX!;
                          const py = seat.posY!;
                          const sx =
                            overlay.cw > 0
                              ? ((overlay.ox + px * overlay.dw) / overlay.cw) * 100
                              : px * 100;
                          const sy =
                            overlay.ch > 0
                              ? ((overlay.oy + py * overlay.dh) / overlay.ch) * 100
                              : py * 100;
                          const interactive = !!(vis && seat.available);
                          return (
                            <div
                              key={`fp-${seat.SeatID}`}
                              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                              style={{
                                left: `${sx}%`,
                                top: `${sy}%`,
                              }}
                            >
                              <span
                                style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'center center' }}
                                className="block [&>button]:pointer-events-auto"
                              >
                                <SeatChip
                                  seat={{ ...seat, available: vis ? seat.available : false }}
                                  sectionIndex={si}
                                  interactive={interactive}
                                  selected={selectedSeatIds.includes(seat.SeatID)}
                                  currency={currency}
                                  sectionName={section.name}
                                  rowLabel={row.label}
                                  priceLabel={section.price}
                                  onToggle={() => onToggleSeat(seat.SeatID, !!seat.available)}
                                />
                              </span>
                            </div>
                          );
                        }),
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="h-4" />
          </>
        )}

        <div className="px-5 pb-10">
          {legend}

          {(() => {
            const sectionBlocks = sections.map((section, si) => {
              if (sectionVisible && sectionVisible[si] === false) return null;
              const rowsForGrid = section.rows
                .map((row) => ({
                  label: row.label,
                  seats:
                    showDiagram && row.seats.some((s) => seatOnFloorPlan(s, !!hasFloor))
                      ? row.seats.filter((s) => !seatOnFloorPlan(s, !!hasFloor))
                      : row.seats,
                }))
                .filter((r) => r.seats.length > 0);
              if (rowsForGrid.length === 0) return null;

              return (
                <div
                  key={`${section.name}-${si}-grid`}
                  className="rounded-2xl border border-border bg-card/95 p-4 md:p-6 mb-6 shadow-[0_1px_18px_-4px_rgba(15,15,35,0.12)] dark:shadow-black/35"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-4 border-b border-border/60 pb-3">
                    <h3 className="text-[1.05rem] font-bold tracking-tight text-primary">{section.name}</h3>
                    <span className="tabular-nums text-base font-semibold text-foreground whitespace-nowrap">
                      {currency} {typeof section.price === 'number' ? section.price.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="space-y-7">
                    {rowsForGrid.map((row) => {
                      const blocks = splitRowIntoBlocks(row.seats);
                      return (
                        <div key={`${section.name}-${row.label}-${si}`} className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                          <div className="w-14 shrink-0 pt-2 text-center lg:text-right pr-2">
                            <span className="sr-only">Row </span>
                            <span className="text-lg font-bold tabular-nums text-foreground leading-none">{row.label}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="flex flex-wrap items-center gap-x-8 gap-y-2.5 justify-center lg:justify-center pr-4"
                              aria-label={`Row ${row.label}`}
                            >
                              {blocks.map((blockSeats, bi) => (
                                <div
                                  key={bi}
                                  className="flex flex-wrap gap-[5px] items-center px-3 py-2 rounded-xl bg-background/95 ring-1 ring-border/50 shadow-inner"
                                >
                                  {blockSeats.map((seat) => (
                                    <SeatChip
                                      key={seat.SeatID}
                                      seat={seat}
                                      sectionIndex={si}
                                      interactive={!!seat.available}
                                      selected={selectedSeatIds.includes(seat.SeatID)}
                                      currency={currency}
                                      sectionName={section.name}
                                      rowLabel={row.label}
                                      priceLabel={section.price}
                                      onToggle={() =>
                                        onToggleSeat(seat.SeatID, seat.available)
                                      }
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });

            const stageEl = (
              <div className="flex justify-center py-2 shrink-0">
                <StageIndicator position={stagePosition} />
              </div>
            );

            if (stagePosition === 'top') {
              return (
                <>
                  {stageEl}
                  {sectionBlocks}
                </>
              );
            }
            if (stagePosition === 'left') {
              return (
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  <div className="lg:w-40 flex justify-center lg:justify-start shrink-0">{stageEl}</div>
                  <div className="min-w-0 flex-1">{sectionBlocks}</div>
                </div>
              );
            }
            if (stagePosition === 'right') {
              return (
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  <div className="min-w-0 flex-1 order-2 lg:order-1">{sectionBlocks}</div>
                  <div className="lg:w-40 flex justify-center lg:justify-end shrink-0 order-1 lg:order-2">
                    {stageEl}
                  </div>
                </div>
              );
            }
            if (stagePosition === 'none') {
              return sectionBlocks;
            }
            return (
              <>
                {sectionBlocks}
                {stageEl}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
