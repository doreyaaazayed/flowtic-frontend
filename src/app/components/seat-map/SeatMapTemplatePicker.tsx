import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { StagePositionPicker, StageIndicator } from "./StagePositionPicker";
import type { StagePosition } from "./stagePosition";
import { normalizeStagePosition } from "./stagePosition";

export type TemplateRow = { label: string; seatCount: number };
export type TemplateSection = {
  name: string;
  ticketCategoryIndex: number; // 0 = first cat, 1 = second, etc.
  rows: TemplateRow[];
  placement?: "grid" | "arc";
};
export type VenueTemplate = {
  id: string;
  name: string;
  icon: string;
  description: string;
  sections: TemplateSection[];
};

const TEMPLATES: VenueTemplate[] = [
  {
    id: "theater",
    name: "Theater",
    icon: "🎭",
    description: "Classic stage layout — VIP front rows, standard rear",
    sections: [
      {
        name: "VIP",
        ticketCategoryIndex: 1,
        rows: [
          { label: "A", seatCount: 12 },
          { label: "B", seatCount: 12 },
          { label: "C", seatCount: 14 },
        ],
        placement: "grid",
      },
      {
        name: "Standard",
        ticketCategoryIndex: 0,
        rows: [
          { label: "D", seatCount: 16 },
          { label: "E", seatCount: 16 },
          { label: "F", seatCount: 18 },
          { label: "G", seatCount: 18 },
          { label: "H", seatCount: 20 },
        ],
        placement: "grid",
      },
    ],
  },
  {
    id: "stadium",
    name: "Stadium",
    icon: "🏟️",
    description: "Bowl seating — curved rows wrapping around the pitch",
    sections: [
      {
        name: "Platinum",
        ticketCategoryIndex: 2,
        rows: [
          { label: "A", seatCount: 20 },
          { label: "B", seatCount: 22 },
        ],
        placement: "arc",
      },
      {
        name: "Gold",
        ticketCategoryIndex: 1,
        rows: [
          { label: "C", seatCount: 24 },
          { label: "D", seatCount: 26 },
          { label: "E", seatCount: 28 },
        ],
        placement: "arc",
      },
      {
        name: "Standard",
        ticketCategoryIndex: 0,
        rows: [
          { label: "F", seatCount: 30 },
          { label: "G", seatCount: 30 },
          { label: "H", seatCount: 32 },
          { label: "I", seatCount: 32 },
        ],
        placement: "arc",
      },
    ],
  },
  {
    id: "concert",
    name: "Concert Hall",
    icon: "🎵",
    description: "Tiered hall — VIP floor, balcony, upper deck",
    sections: [
      {
        name: "Floor VIP",
        ticketCategoryIndex: 2,
        rows: [
          { label: "A", seatCount: 15 },
          { label: "B", seatCount: 15 },
          { label: "C", seatCount: 15 },
        ],
        placement: "arc",
      },
      {
        name: "Balcony",
        ticketCategoryIndex: 1,
        rows: [
          { label: "D", seatCount: 18 },
          { label: "E", seatCount: 18 },
          { label: "F", seatCount: 20 },
        ],
        placement: "arc",
      },
      {
        name: "Upper Deck",
        ticketCategoryIndex: 0,
        rows: [
          { label: "G", seatCount: 22 },
          { label: "H", seatCount: 22 },
          { label: "I", seatCount: 24 },
          { label: "J", seatCount: 24 },
        ],
        placement: "arc",
      },
    ],
  },
  {
    id: "classroom",
    name: "Conference",
    icon: "🎓",
    description: "Rows of seats facing a stage — ideal for talks & workshops",
    sections: [
      {
        name: "Front",
        ticketCategoryIndex: 1,
        rows: [
          { label: "A", seatCount: 8 },
          { label: "B", seatCount: 8 },
          { label: "C", seatCount: 8 },
        ],
        placement: "grid",
      },
      {
        name: "Rear",
        ticketCategoryIndex: 0,
        rows: [
          { label: "D", seatCount: 10 },
          { label: "E", seatCount: 10 },
          { label: "F", seatCount: 10 },
          { label: "G", seatCount: 10 },
        ],
        placement: "grid",
      },
    ],
  },
];

const SECTION_COLORS = [
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-sky-500",
];

type EditableSection = {
  name: string;
  ticketCategoryIndex: number;
  rows: TemplateRow[];
  placement: "grid" | "arc";
};

type Props = {
  ticketCategories: Array<{ _id: string; Name: string; Price: number }>;
  onApply: (
    sections: Array<{
      name: string;
      ticketCategoryId: string;
      rows: TemplateRow[];
      placement: "grid" | "arc";
    }>,
    stagePosition: StagePosition,
  ) => void;
  initialStagePosition?: StagePosition;
};

export function SeatMapTemplatePicker({
  ticketCategories,
  onApply,
  initialStagePosition = "bottom",
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editSections, setEditSections] = useState<EditableSection[]>([]);
  const [stagePosition, setStagePosition] = useState<StagePosition>(
    normalizeStagePosition(initialStagePosition),
  );
  const [step, setStep] = useState<"pick" | "customize">("pick");

  const handlePickTemplate = (tpl: VenueTemplate) => {
    setSelectedTemplate(tpl.id);
    setEditSections(
      tpl.sections.map((s) => ({
        name: s.name,
        ticketCategoryIndex: Math.min(s.ticketCategoryIndex, Math.max(0, ticketCategories.length - 1)),
        rows: s.rows.map((r) => ({ ...r })),
        placement: s.placement ?? "grid",
      }))
    );
    setStep("customize");
  };

  const updateSection = (si: number, field: keyof EditableSection, value: string | number) => {
    setEditSections((prev) => {
      const next = [...prev];
      (next[si] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const updateRow = (si: number, ri: number, field: "label" | "seatCount", value: string | number) => {
    setEditSections((prev) => {
      const next = [...prev];
      const rows = [...next[si].rows];
      if (field === "label") rows[ri] = { ...rows[ri], label: String(value) };
      else rows[ri] = { ...rows[ri], seatCount: Math.max(1, Number(value) || 1) };
      next[si] = { ...next[si], rows };
      return next;
    });
  };

  const addRow = (si: number) => {
    setEditSections((prev) => {
      const next = [...prev];
      const rows = [...next[si].rows];
      const last = rows[rows.length - 1];
      const nextLabel = last?.label
        ? String.fromCharCode(last.label.charCodeAt(0) + 1)
        : "A";
      rows.push({ label: nextLabel, seatCount: last?.seatCount ?? 10 });
      next[si] = { ...next[si], rows };
      return next;
    });
  };

  const removeRow = (si: number, ri: number) => {
    setEditSections((prev) => {
      const next = [...prev];
      next[si] = { ...next[si], rows: next[si].rows.filter((_, i) => i !== ri) };
      return next;
    });
  };

  const addSection = () => {
    setEditSections((prev) => [
      ...prev,
      { name: `Section ${prev.length + 1}`, ticketCategoryIndex: 0, rows: [{ label: "A", seatCount: 10 }], placement: "grid" },
    ]);
  };

  const removeSection = (si: number) => {
    setEditSections((prev) => prev.filter((_, i) => i !== si));
  };

  const handleApply = () => {
    const mapped = editSections
      .filter((s) => s.name.trim() && s.rows.some((r) => r.seatCount > 0))
      .map((s) => ({
        name: s.name.trim(),
        ticketCategoryId: ticketCategories[s.ticketCategoryIndex]?._id ?? ticketCategories[0]._id,
        rows: s.rows.filter((r) => r.seatCount > 0),
        placement: s.placement,
      }));
    onApply(mapped, stagePosition);
  };

  const totalSeats = editSections.reduce(
    (sum, s) => sum + s.rows.reduce((rs, r) => rs + r.seatCount, 0),
    0
  );

  if (step === "pick") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a template that matches your venue shape. You can customize section names, row labels, and seat counts in the next step.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handlePickTemplate(tpl)}
              className="group text-left p-5 rounded-2xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {/* mini diagram */}
              <div className="mb-4 flex flex-col items-center gap-1 h-20 justify-center">
                <TemplateDiagram id={tpl.id} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{tpl.icon}</span>
                <span className="font-semibold text-sm">{tpl.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tpl.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tpl.sections.length} sections ·{" "}
                {tpl.sections.reduce((s, sec) => s + sec.rows.reduce((rs, r) => rs + r.seatCount, 0), 0)} seats default
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // customize step
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            Customize sections & rows
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {editSections.length} section(s) · {totalSeats} seats total
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStep("pick")}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          ← Change template
        </button>
      </div>

      {/* sections */}
      <div className="space-y-4">
        {editSections.map((sec, si) => {
          const dotColor = SECTION_COLORS[si % SECTION_COLORS.length];
          const sectionTotal = sec.rows.reduce((s, r) => s + r.seatCount, 0);
          return (
            <div key={si} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              {/* section header */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
                <input
                  type="text"
                  value={sec.name}
                  onChange={(e) => updateSection(si, "name", e.target.value)}
                  placeholder="Section name"
                  className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {ticketCategories.length > 0 && (
                  <Select
                    value={String(sec.ticketCategoryIndex)}
                    onValueChange={(v) => updateSection(si, "ticketCategoryIndex", Number(v))}
                  >
                    <SelectTrigger className="min-w-[9rem] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {ticketCategories.map((c, ci) => (
                        <SelectItem key={c._id} value={String(ci)}>
                          {c.Name} — EGP {c.Price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={sec.placement}
                  onValueChange={(v) => updateSection(si, "placement", v)}
                >
                  <SelectTrigger className="min-w-[8.5rem] h-9" title="Row shape">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="grid">Straight rows</SelectItem>
                    <SelectItem value="arc">Curved / bowl</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeSection(si)}
                  className="text-xs text-destructive hover:underline"
                  disabled={editSections.length <= 1}
                >
                  Remove
                </button>
              </div>

              {/* rows */}
              <div className="space-y-2 pl-6">
                {sec.rows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">Row</span>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateRow(si, ri, "label", e.target.value)}
                      maxLength={3}
                      className="w-12 px-2 py-1.5 text-center rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={row.seatCount}
                      onChange={(e) => updateRow(si, ri, "seatCount", e.target.value)}
                      className="w-20 px-2 py-1.5 rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-xs text-muted-foreground">seats</span>
                    {/* mini seat dots */}
                    <div className="hidden sm:flex gap-0.5 flex-wrap max-w-[160px] overflow-hidden">
                      {Array.from({ length: Math.min(row.seatCount, 20) }).map((_, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${dotColor} opacity-70`} />
                      ))}
                      {row.seatCount > 20 && (
                        <span className="text-xs text-muted-foreground ml-1">+{row.seatCount - 20}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(si, ri)}
                      disabled={sec.rows.length <= 1}
                      className="text-xs text-muted-foreground hover:text-destructive ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRow(si)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  + Add row
                </button>
              </div>

              {/* section summary */}
              <p className="text-xs text-muted-foreground pl-6">
                {sec.rows.length} row(s) · {sectionTotal} seats
              </p>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="text-sm text-primary hover:underline"
      >
        + Add another section
      </button>

      <StagePositionPicker value={stagePosition} onChange={setStagePosition} />

      {/* full preview */}
      <SeatPreview sections={editSections} colors={SECTION_COLORS} stagePosition={stagePosition} />

      {/* apply */}
      {ticketCategories.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg px-4 py-3">
          Add at least one ticket category to this event before applying the seat map.
        </p>
      ) : (
        <Button
          type="button"
          onClick={handleApply}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white h-11"
          disabled={editSections.length === 0 || ticketCategories.length === 0}
        >
          <Check className="w-4 h-4 mr-2" />
          Apply this layout — {totalSeats} seats
        </Button>
      )}
    </div>
  );
}

// ── Mini template diagrams ────────────────────────────────────────────────────
function TemplateDiagram({ id }: { id: string }) {
  if (id === "theater") {
    return (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden>
        <rect x="2" y="44" width="76" height="6" rx="2" fill="currentColor" className="text-primary/30" />
        {[0, 1].map((r) => (
          <g key={r}>
            {Array.from({ length: 7 }).map((_, i) => (
              <circle key={i} cx={6 + i * 10} cy={10 + r * 12} r="3.5" fill="currentColor" className="text-violet-400" />
            ))}
          </g>
        ))}
        {[2, 3, 4].map((r) => (
          <g key={r}>
            {Array.from({ length: 8 }).map((_, i) => (
              <circle key={i} cx={2 + i * 10} cy={10 + r * 12} r="3.5" fill="currentColor" className="text-primary/50" />
            ))}
          </g>
        ))}
      </svg>
    );
  }
  if (id === "stadium") {
    return (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden>
        <rect x="22" y="26" width="36" height="18" rx="2" fill="currentColor" className="text-emerald-500/30" />
        {[0, 1, 2].map((tier) => {
          const colors = ["text-amber-400", "text-violet-400", "text-primary/50"];
          const r = 20 + tier * 9;
          const count = 6 + tier * 2;
          return Array.from({ length: count }).map((_, i) => {
            const angle = Math.PI * (0.1 + (0.8 * i) / (count - 1));
            return (
              <circle
                key={`${tier}-${i}`}
                cx={40 + r * Math.cos(Math.PI - angle)}
                cy={48 - r * Math.sin(Math.PI - angle)}
                r="3"
                fill="currentColor"
                className={colors[tier]}
              />
            );
          });
        })}
      </svg>
    );
  }
  if (id === "concert") {
    return (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden>
        <rect x="28" y="50" width="24" height="6" rx="2" fill="currentColor" className="text-primary/30" />
        {[0, 1, 2].map((tier) => {
          const colors = ["text-amber-400", "text-violet-400", "text-primary/50"];
          const r = 12 + tier * 12;
          const count = 5 + tier * 3;
          return Array.from({ length: count }).map((_, i) => {
            const t = count > 1 ? i / (count - 1) : 0.5;
            const angle = Math.PI * (1.05 + 0.9 * t);
            return (
              <circle
                key={`${tier}-${i}`}
                cx={40 + r * Math.cos(angle)}
                cy={52 + r * Math.sin(angle)}
                r="3"
                fill="currentColor"
                className={colors[tier]}
              />
            );
          });
        })}
      </svg>
    );
  }
  // conference
  return (
    <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden>
      <rect x="24" y="50" width="32" height="5" rx="2" fill="currentColor" className="text-primary/30" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          {Array.from({ length: 5 }).map((_, i) => (
            <circle
              key={i}
              cx={8 + i * 16}
              cy={8 + r * 12}
              r="4"
              fill="currentColor"
              className={r < 2 ? "text-violet-400" : "text-primary/50"}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// ── Live full seat preview ────────────────────────────────────────────────────
function SeatRowsPreview({
  sections,
  colors,
}: {
  sections: EditableSection[];
  colors: string[];
}) {
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1 min-w-0 flex-1">
      {sections.map((sec, si) => {
        const dotColor = colors[si % colors.length];
        return (
          <div key={si}>
            <p className="text-xs font-medium mb-1 flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`} />
              {sec.name || `Section ${si + 1}`}
            </p>
            <div className="space-y-1">
              {sec.rows.map((row, ri) => (
                <div key={ri} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-6 text-right shrink-0">
                    {row.label}
                  </span>
                  <div className="flex gap-0.5 flex-wrap">
                    {Array.from({ length: Math.min(row.seatCount, 40) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-sm ${dotColor} opacity-80`}
                      />
                    ))}
                    {row.seatCount > 40 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{row.seatCount - 40}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {row.seatCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeatPreview({
  sections,
  colors,
  stagePosition,
}: {
  sections: EditableSection[];
  colors: string[];
  stagePosition: StagePosition;
}) {
  const totalSeats = sections.reduce(
    (s, sec) => s + sec.rows.reduce((rs, r) => rs + r.seatCount, 0),
    0
  );
  if (totalSeats === 0) return null;

  const seatsBlock = <SeatRowsPreview sections={sections} colors={colors} />;
  const stageBlock = <StageIndicator position={stagePosition} className="mx-auto" />;

  const layout =
    stagePosition === "top" ? (
      <div className="flex flex-col gap-3">
        {stageBlock}
        {seatsBlock}
      </div>
    ) : stagePosition === "left" ? (
      <div className="flex flex-row gap-3 items-stretch">
        <div className="flex items-center shrink-0">{stageBlock}</div>
        {seatsBlock}
      </div>
    ) : stagePosition === "right" ? (
      <div className="flex flex-row gap-3 items-stretch">
        {seatsBlock}
        <div className="flex items-center shrink-0">{stageBlock}</div>
      </div>
    ) : stagePosition === "center" ? (
      <div className="relative min-h-[100px]">
        {seatsBlock}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-card/95 px-1 shadow-sm ring-1 ring-border">{stageBlock}</div>
        </div>
      </div>
    ) : stagePosition === "none" ? (
      seatsBlock
    ) : (
      <div className="flex flex-col gap-3">
        {seatsBlock}
        {stageBlock}
      </div>
    );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Live preview — {totalSeats} seats
      </p>
      {layout}
    </div>
  );
}
