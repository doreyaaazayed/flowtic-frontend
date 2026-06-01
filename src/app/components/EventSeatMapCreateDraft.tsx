import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { SeatMapTemplatePicker } from './seat-map/SeatMapTemplatePicker';
import { StagePositionPicker } from './seat-map/StagePositionPicker';
import { SeatMapFloorPlanAiPanel } from './seat-map/SeatMapFloorPlanAiPanel';
import type { StagePosition } from './seat-map/stagePosition';
import { seatMap as seatMapApi, type SeatMapPreviewSection } from '../lib/api';
import type { SeatMapSectionForm } from './EventSeatMapEditor';

export type { SeatMapSectionForm };

type TicketTypeRow = { name: string; price: string };

export type EventSeatMapCreateDraftProps = {
  ticketTypes: TicketTypeRow[];
  floorPlanDataUrl: string | null;
  floorPlanLabel: string | null;
  onFloorPlanChange: (dataUrl: string | null, label: string | null) => void;
  sections: SeatMapSectionForm[];
  onSectionsChange: (sections: SeatMapSectionForm[]) => void;
  stagePosition: StagePosition;
  onStagePositionChange: (pos: StagePosition) => void;
  aiPreviewSections: SeatMapPreviewSection[] | null;
  onAiPreviewChange: (sections: SeatMapPreviewSection[] | null, stagePosition?: StagePosition) => void;
  disabled?: boolean;
  onError?: (message: string | null) => void;
};

function ticketTypesToCategories(rows: TicketTypeRow[]) {
  return rows
    .map((row, i) => ({
      _id: `draft-${i}`,
      Name: row.name.trim() || `Ticket ${i + 1}`,
      Price: Number(row.price) || 0,
    }))
    .filter((c) => c.Name);
}

function seedSections(cats: ReturnType<typeof ticketTypesToCategories>): SeatMapSectionForm[] {
  return [
    {
      name: 'Platinum',
      ticketCategoryId: cats[0]?._id ?? '',
      rows: [
        { label: 'A', seatCount: 10 },
        { label: 'B', seatCount: 10 },
      ],
    },
    {
      name: 'Gold',
      ticketCategoryId: cats[1]?._id ?? cats[0]?._id ?? '',
      rows: [
        { label: 'A', seatCount: 8 },
        { label: 'B', seatCount: 8 },
      ],
    },
  ].filter((s) => s.ticketCategoryId);
}

export function EventSeatMapCreateDraft({
  ticketTypes,
  floorPlanDataUrl,
  floorPlanLabel,
  onFloorPlanChange,
  sections,
  onSectionsChange,
  stagePosition,
  onStagePositionChange,
  aiPreviewSections,
  onAiPreviewChange,
  disabled,
  onError,
}: EventSeatMapCreateDraftProps) {
  const { t } = useTranslation();
  const [seatSetupMode, setSeatSetupMode] = useState<'template' | 'manual'>('template');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const ticketCategories = ticketTypesToCategories(ticketTypes);

  const handleAnalyze = useCallback(async () => {
    if (!floorPlanDataUrl) return;
    setAnalyzeLoading(true);
    onError?.(null);
    try {
      const { sections: detected, stagePosition: detectedStage } =
        await seatMapApi.analyzePreview(floorPlanDataUrl);
      if (!detected?.length) {
        onError?.(t('creator.create.seatMap.aiNoSections'));
        onAiPreviewChange(null);
        return;
      }
      onAiPreviewChange(detected, detectedStage);
      if (detectedStage) onStagePositionChange(detectedStage);
      const mapped: SeatMapSectionForm[] = detected.map((sec) => {
        const match =
          ticketCategories.find((c) =>
            sec.name.toLowerCase().includes(c.Name.toLowerCase()),
          ) ?? ticketCategories[0];
        return {
          name: sec.name,
          ticketCategoryId: match?._id ?? '',
          rows: sec.rows.map((r) => ({
            label: r.label,
            seatCount: r.seatCount,
            ...(r.rowFraction != null ? { rowFraction: r.rowFraction } : {}),
          })),
          ...(sec.layout ? { layout: sec.layout } : {}),
          ...(sec.placement === 'arc' ? { placement: 'arc' as const } : {}),
        };
      });
      onSectionsChange(mapped.filter((s) => s.ticketCategoryId));
      setSeatSetupMode('manual');
    } catch (err) {
      onAiPreviewChange(null);
      onError?.(err instanceof Error ? err.message : t('creator.edit.seatMap.analyzeFailed'));
    } finally {
      setAnalyzeLoading(false);
    }
  }, [
    floorPlanDataUrl,
    onAiPreviewChange,
    onError,
    onSectionsChange,
    onStagePositionChange,
    t,
    ticketCategories,
  ]);

  const updateSection = (
    idx: number,
    field: keyof SeatMapSectionForm,
    value: string | SeatMapSectionForm['rows'],
  ) => {
    const next = [...sections];
    (next[idx] as Record<string, unknown>)[field] = value;
    onSectionsChange(next);
  };

  const updateRow = (
    secIdx: number,
    rowIdx: number,
    field: 'label' | 'seatCount',
    value: string | number,
  ) => {
    const next = [...sections];
    const rows = [...next[secIdx].rows];
    if (field === 'label') rows[rowIdx] = { ...rows[rowIdx], label: String(value) };
    else rows[rowIdx] = { ...rows[rowIdx], seatCount: Number(value) || 0 };
    next[secIdx] = { ...next[secIdx], rows };
    onSectionsChange(next);
  };

  const aiPanel = (
    <SeatMapFloorPlanAiPanel
      floorPlanUrl={floorPlanDataUrl}
      floorPlanLabel={floorPlanLabel}
      onFloorPlanChange={(url, label) => {
        onFloorPlanChange(url, label);
        if (!url) onAiPreviewChange(null);
      }}
      onAnalyze={handleAnalyze}
      analyzeLoading={analyzeLoading}
      disabled={disabled}
      previewSections={aiPreviewSections}
      stagePosition={stagePosition}
      showCreateHint
      onValidationError={onError}
    />
  );

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-5">
      <div>
        <p className="text-sm font-medium">{t('creator.edit.seatMap.title')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('creator.edit.seatMap.subtitle')}</p>
      </div>

      {ticketCategories.length === 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          {t('creator.create.seatMap.needTicketTypesFirst')}
        </div>
      )}

      <div className="flex gap-2 border-b border-border pb-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setSeatSetupMode('template')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            seatSetupMode === 'template'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('creator.edit.seatMap.templates')}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setSeatSetupMode('manual');
            if (sections.length === 0 && ticketCategories.length > 0) {
              onSectionsChange(seedSections(ticketCategories));
            }
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            seatSetupMode === 'manual'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('creator.edit.seatMap.manual')}
        </button>
      </div>

      {seatSetupMode === 'template' && (
        <div className="space-y-5">
          <SeatMapTemplatePicker
            ticketCategories={ticketCategories}
            initialStagePosition={stagePosition}
            onApply={(applied, stagePos) => {
              onStagePositionChange(stagePos);
              onSectionsChange(
                applied.map((s) => ({
                  name: s.name,
                  ticketCategoryId: s.ticketCategoryId,
                  rows: s.rows,
                  placement: s.placement,
                })),
              );
              setSeatSetupMode('manual');
            }}
          />
          {aiPanel}
        </div>
      )}

      {seatSetupMode === 'manual' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <StagePositionPicker value={stagePosition} onChange={onStagePositionChange} />
          </div>

          {aiPanel}

          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="p-4 rounded-xl border border-border space-y-3 bg-card/50">
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder={t('creator.edit.seatMap.sectionName')}
                  value={sec.name}
                  disabled={disabled}
                  onChange={(e) => updateSection(secIdx, 'name', e.target.value)}
                  className="input-cosmic w-40"
                />
                <Select
                  value={sec.ticketCategoryId || undefined}
                  onValueChange={(v) => updateSection(secIdx, 'ticketCategoryId', v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="min-w-[10rem] h-9">
                    <SelectValue placeholder={t('creator.edit.seatMap.ticketType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketCategories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.Name}
                        {Number(c.Price) > 0 ? ` — EGP ${c.Price}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onSectionsChange(sections.filter((_, i) => i !== secIdx))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2 pl-2">
                {sec.rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs text-muted-foreground w-8">
                      {t('creator.edit.seatMap.row')}
                    </span>
                    <input
                      type="text"
                      maxLength={3}
                      value={row.label}
                      disabled={disabled}
                      onChange={(e) => updateRow(secIdx, rowIdx, 'label', e.target.value)}
                      className="w-12 px-2 py-1.5 text-center rounded border border-border bg-background text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.seatCount}
                      disabled={disabled}
                      onChange={(e) => updateRow(secIdx, rowIdx, 'seatCount', e.target.value)}
                      className="w-20 px-2 py-1.5 rounded border border-border bg-background text-sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('creator.edit.seatMap.seats')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        const next = [...sections];
                        next[secIdx] = {
                          ...next[secIdx],
                          rows: next[secIdx].rows.filter((_, i) => i !== rowIdx),
                        };
                        onSectionsChange(next);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    const next = [...sections];
                    const rows = [...next[secIdx].rows];
                    const last = rows[rows.length - 1];
                    const nextLabel = last?.label
                      ? String.fromCharCode(last.label.charCodeAt(0) + 1)
                      : 'A';
                    rows.push({ label: nextLabel, seatCount: 10 });
                    next[secIdx] = { ...next[secIdx], rows };
                    onSectionsChange(next);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('creator.edit.seatMap.addRow')}
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            disabled={disabled || ticketCategories.length === 0}
            onClick={() =>
              onSectionsChange([
                ...sections,
                {
                  name: '',
                  ticketCategoryId: ticketCategories[0]?._id ?? '',
                  rows: [{ label: 'A', seatCount: 10 }],
                },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('creator.edit.seatMap.addSection')}
          </Button>

          <p className="text-xs text-muted-foreground">{t('creator.create.seatMap.generateOnSubmit')}</p>
        </div>
      )}
    </div>
  );
}
