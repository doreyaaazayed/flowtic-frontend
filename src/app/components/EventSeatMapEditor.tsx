import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { SeatMapTemplatePicker } from './seat-map/SeatMapTemplatePicker';
import { SeatMapFloorPlanAiPanel } from './seat-map/SeatMapFloorPlanAiPanel';
import { StagePositionPicker } from './seat-map/StagePositionPicker';
import type { StagePosition } from './seat-map/stagePosition';
import { normalizeStagePosition } from './seat-map/stagePosition';
import {
  events as eventsApi,
  seatMap as seatMapApi,
  type SeatMapSection,
} from '../lib/api';

export type SeatMapSectionForm = {
  name: string;
  ticketCategoryId: string;
  rows: Array<{ label: string; seatCount: number; rowFraction?: number }>;
  layout?: { x: number; y: number; w: number; h: number };
  placement?: 'grid' | 'arc';
};

type TicketCat = { _id: string; Name: string; Price: number };

export type EventSeatMapEditorProps = {
  eventId: string;
  isSeated: boolean;
  floorPlanUrl?: string | null;
  stagePosition?: StagePosition;
  ticketCategories: TicketCat[];
  onMetaChange?: (patch: {
    isSeated?: boolean;
    seatMapFloorPlanUrl?: string | null;
    seatMapStagePosition?: StagePosition;
  }) => void;
  onSeatMapCountChange?: (count: number | null) => void;
  disabled?: boolean;
};

function seedSeatMapSections(cats: TicketCat[]): SeatMapSectionForm[] {
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

export function EventSeatMapEditor({
  eventId,
  isSeated,
  floorPlanUrl: floorPlanUrlProp,
  stagePosition: stagePositionProp,
  ticketCategories,
  onMetaChange,
  onSeatMapCountChange,
  disabled,
}: EventSeatMapEditorProps) {
  const { t } = useTranslation();
  const [floorPlanUrl, setFloorPlanUrl] = useState(floorPlanUrlProp ?? null);
  const [seatMapStagePosition, setSeatMapStagePosition] = useState<StagePosition>(
    stagePositionProp ?? 'bottom',
  );
  const [seatMapSections, setSeatMapSections] = useState<SeatMapSectionForm[]>([]);
  const [seatMapSubmitting, setSeatMapSubmitting] = useState(false);
  const [seatMapError, setSeatMapError] = useState('');
  const [existingSeatMapCount, setExistingSeatMapCount] = useState<number | null>(null);
  const [seatSetupMode, setSeatSetupMode] = useState<'template' | 'manual'>('template');
  const [enablingSeated, setEnablingSeated] = useState(false);
  const [deletingSeats, setDeletingSeats] = useState(false);
  const [floorPlanUploading, setFloorPlanUploading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [savingStagePosition, setSavingStagePosition] = useState(false);

  const syncCount = useCallback(
    (count: number | null) => {
      setExistingSeatMapCount(count);
      onSeatMapCountChange?.(count);
    },
    [onSeatMapCountChange],
  );

  const loadSeatMap = useCallback(async () => {
    if (!eventId || !isSeated) return;
    try {
      const seatMapRes = await seatMapApi.get(eventId);
      if (seatMapRes.stagePosition) {
        const pos = normalizeStagePosition(seatMapRes.stagePosition);
        setSeatMapStagePosition(pos);
        onMetaChange?.({ seatMapStagePosition: pos });
      }
      if (seatMapRes.sections?.length) {
        const count = seatMapRes.sections.reduce(
          (acc, s) => acc + s.rows.reduce((a, r) => a + (r.seats?.length ?? 0), 0),
          0,
        );
        syncCount(count);
      } else {
        syncCount(null);
        if (ticketCategories.length > 0) {
          setSeatMapSections(seedSeatMapSections(ticketCategories));
        }
      }
    } catch {
      syncCount(null);
    }
  }, [eventId, isSeated, onMetaChange, syncCount, ticketCategories]);

  useEffect(() => {
    setFloorPlanUrl(floorPlanUrlProp ?? null);
  }, [floorPlanUrlProp]);

  useEffect(() => {
    if (stagePositionProp) setSeatMapStagePosition(stagePositionProp);
  }, [stagePositionProp]);

  useEffect(() => {
    loadSeatMap();
  }, [loadSeatMap]);

  const updateSeatMapSection = (
    idx: number,
    field: keyof SeatMapSectionForm,
    value: string | SeatMapSectionForm['rows'],
  ) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      (next[idx] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const updateSeatMapRow = (
    secIdx: number,
    rowIdx: number,
    field: 'label' | 'seatCount',
    value: string | number,
  ) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      const rows = [...next[secIdx].rows];
      if (field === 'label') rows[rowIdx] = { ...rows[rowIdx], label: String(value) };
      else rows[rowIdx] = { ...rows[rowIdx], seatCount: Number(value) || 0 };
      next[secIdx] = { ...next[secIdx], rows };
      return next;
    });
  };

  const addRowToSection = (secIdx: number) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      const rows = [...next[secIdx].rows];
      const last = rows[rows.length - 1];
      const nextLabel = last?.label ? String.fromCharCode(last.label.charCodeAt(0) + 1) : 'A';
      rows.push({ label: nextLabel, seatCount: 10 });
      next[secIdx] = { ...next[secIdx], rows };
      return next;
    });
  };

  const removeRowFromSection = (secIdx: number, rowIdx: number) => {
    setSeatMapSections((prev) => {
      const next = [...prev];
      next[secIdx] = {
        ...next[secIdx],
        rows: next[secIdx].rows.filter((_, i) => i !== rowIdx),
      };
      return next;
    });
  };

  const addSeatMapSection = () => {
    setSeatMapSections((prev) => [
      ...prev,
      {
        name: '',
        ticketCategoryId: ticketCategories[0]?._id ?? '',
        rows: [{ label: 'A', seatCount: 10 }],
      },
    ]);
  };

  const removeSeatMapSection = (secIdx: number) => {
    setSeatMapSections((prev) => prev.filter((_, i) => i !== secIdx));
  };

  const handleEnableSeated = async () => {
    setSeatMapError('');
    setEnablingSeated(true);
    try {
      await eventsApi.update(eventId, { isSeated: true });
      onMetaChange?.({ isSeated: true });
      if (ticketCategories.length > 0) {
        setSeatMapSections(seedSeatMapSections(ticketCategories));
      }
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : t('creator.edit.seatMap.enableFailed'));
    } finally {
      setEnablingSeated(false);
    }
  };

  const handleClearFloorPlan = async () => {
    setSeatMapError('');
    setFloorPlanUploading(true);
    try {
      await eventsApi.update(eventId, { seatMapFloorPlanUrl: '' });
      setFloorPlanUrl(null);
      onMetaChange?.({ seatMapFloorPlanUrl: null });
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : t('creator.edit.seatMap.floorPlanFailed'));
    } finally {
      setFloorPlanUploading(false);
    }
  };

  const handleFloorPlanDataUrl = async (dataUrl: string | null) => {
    if (!dataUrl) {
      await handleClearFloorPlan();
      return;
    }
    setFloorPlanUploading(true);
    setSeatMapError('');
    try {
      const res = await seatMapApi.saveFloorPlan(eventId, dataUrl);
      setFloorPlanUrl(res.seatMapFloorPlanUrl);
      onMetaChange?.({ seatMapFloorPlanUrl: res.seatMapFloorPlanUrl });
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : t('creator.edit.seatMap.floorPlanFailed'));
    } finally {
      setFloorPlanUploading(false);
    }
  };

  const handleAnalyzeFloorPlan = async () => {
    setAnalyzeLoading(true);
    setSeatMapError('');
    try {
      const { sections, stagePosition } = await seatMapApi.analyze(eventId);
      if (stagePosition) {
        const pos = normalizeStagePosition(stagePosition);
        setSeatMapStagePosition(pos);
        onMetaChange?.({ seatMapStagePosition: pos });
      }
      setSeatMapSections(
        sections.map((s) => ({
          name: s.name,
          ticketCategoryId: s.ticketCategoryId,
          rows: s.rows.map((r) => ({
            label: r.label,
            seatCount: r.seatCount,
            ...(r.rowFraction != null && Number.isFinite(r.rowFraction)
              ? { rowFraction: r.rowFraction }
              : {}),
          })),
          ...(s.layout ? { layout: s.layout } : {}),
          ...(s.placement === 'arc' ? { placement: 'arc' as const } : {}),
        })),
      );
      setSeatSetupMode('manual');
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : t('creator.edit.seatMap.analyzeFailed'));
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleDeleteSeatMap = async () => {
    if (!window.confirm(t('creator.edit.seatMap.deleteConfirm'))) return;
    setDeletingSeats(true);
    setSeatMapError('');
    try {
      await seatMapApi.deleteSeatMap(eventId);
      syncCount(null);
      setSeatMapSections(
        ticketCategories.length > 0 ? seedSeatMapSections(ticketCategories) : [],
      );
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : t('creator.edit.seatMap.deleteFailed'));
    } finally {
      setDeletingSeats(false);
    }
  };

  const handleGenerateSeatMap = async () => {
    setSeatMapError('');
    const sections: SeatMapSection[] = seatMapSections
      .filter((s) => s.ticketCategoryId && s.name.trim() && s.rows.some((r) => r.seatCount > 0))
      .map((s) => ({
        name: s.name.trim(),
        ticketCategoryId: s.ticketCategoryId,
        rows: s.rows
          .filter((r) => r.seatCount > 0)
          .map((r) => ({
            label: r.label.trim() || 'A',
            seatCount: r.seatCount,
            ...(r.rowFraction != null && Number.isFinite(r.rowFraction)
              ? { rowFraction: r.rowFraction }
              : {}),
          })),
        ...(s.layout ? { layout: s.layout } : {}),
        ...(s.placement === 'arc' ? { placement: 'arc' as const } : {}),
      }));
    if (sections.length === 0) {
      setSeatMapError(t('creator.edit.seatMap.sectionsRequired'));
      return;
    }
    setSeatMapSubmitting(true);
    try {
      if (existingSeatMapCount != null && existingSeatMapCount > 0) {
        await seatMapApi.deleteSeatMap(eventId);
      }
      await seatMapApi.create(eventId, { sections, stagePosition: seatMapStagePosition });
      await eventsApi.update(eventId, { seatMapStagePosition });
      const count = sections.reduce(
        (acc, s) => acc + s.rows.reduce((a, r) => a + r.seatCount, 0),
        0,
      );
      syncCount(count);
      setSeatMapError('');
    } catch (err) {
      setSeatMapError(err instanceof Error ? err.message : t('creator.edit.seatMap.generateFailed'));
    } finally {
      setSeatMapSubmitting(false);
    }
  };

  if (!isSeated) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-medium">{t('creator.edit.seatMap.title')}</p>
        <p className="text-sm text-muted-foreground">{t('creator.edit.seatMap.notSeatedHint')}</p>
        <Button type="button" disabled={disabled || enablingSeated} onClick={handleEnableSeated}>
          {enablingSeated ? t('creator.edit.seatMap.enabling') : t('creator.edit.seatMap.enable')}
        </Button>
        {seatMapError && <p className="text-sm text-destructive">{seatMapError}</p>}
      </div>
    );
  }

  if (existingSeatMapCount != null && existingSeatMapCount > 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          {t('creator.edit.seatMap.configured', { count: existingSeatMapCount })}
        </p>
        <p className="text-xs text-muted-foreground">{t('creator.edit.seatMap.configuredHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30"
            disabled={disabled || deletingSeats}
            onClick={handleDeleteSeatMap}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {deletingSeats ? t('creator.edit.seatMap.resetting') : t('creator.edit.seatMap.reset')}
          </Button>
        </div>
        {seatMapError && <p className="text-sm text-destructive">{seatMapError}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-5">
      <div>
        <p className="text-sm font-medium">{t('creator.edit.seatMap.title')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('creator.edit.seatMap.subtitle')}</p>
      </div>

      {seatMapError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{seatMapError}</div>
      )}

      {ticketCategories.length === 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          {t('creator.edit.seatMap.needTicketTypes')}
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
          onClick={() => setSeatSetupMode('manual')}
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
            initialStagePosition={seatMapStagePosition}
            onApply={(sections, stagePos) => {
              setSeatMapStagePosition(stagePos);
              onMetaChange?.({ seatMapStagePosition: stagePos });
              setSeatMapSections(
                sections.map((s) => ({
                  name: s.name,
                  ticketCategoryId: s.ticketCategoryId,
                  rows: s.rows,
                  placement: s.placement,
                })),
              );
              setSeatSetupMode('manual');
            }}
          />
          <SeatMapFloorPlanAiPanel
            floorPlanUrl={floorPlanUrl}
            onFloorPlanChange={(url) => void handleFloorPlanDataUrl(url)}
            onAnalyze={handleAnalyzeFloorPlan}
            analyzeLoading={analyzeLoading}
            disabled={disabled}
            uploading={floorPlanUploading}
            stagePosition={seatMapStagePosition}
            previewSections={
              seatMapSections.length > 0
                ? seatMapSections.map((s) => ({
                    name: s.name,
                    rows: s.rows.map((r) => ({
                      label: r.label,
                      seatCount: r.seatCount,
                      ...(r.rowFraction != null ? { rowFraction: r.rowFraction } : {}),
                    })),
                    ...(s.layout ? { layout: s.layout } : {}),
                    ...(s.placement === 'arc' ? { placement: s.placement } : {}),
                  }))
                : null
            }
          />
        </div>
      )}

      {seatSetupMode === 'manual' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
            <StagePositionPicker
              value={seatMapStagePosition}
              onChange={async (pos) => {
                setSeatMapStagePosition(pos);
                onMetaChange?.({ seatMapStagePosition: pos });
                if (existingSeatMapCount != null && existingSeatMapCount > 0) {
                  setSavingStagePosition(true);
                  try {
                    await eventsApi.update(eventId, { seatMapStagePosition: pos });
                  } catch (err) {
                    setSeatMapError(
                      err instanceof Error ? err.message : t('creator.edit.seatMap.stageFailed'),
                    );
                  } finally {
                    setSavingStagePosition(false);
                  }
                }
              }}
            />
            {savingStagePosition && (
              <p className="text-xs text-muted-foreground">{t('creator.edit.seatMap.savingStage')}</p>
            )}
          </div>

          <SeatMapFloorPlanAiPanel
            floorPlanUrl={floorPlanUrl}
            onFloorPlanChange={(url) => void handleFloorPlanDataUrl(url)}
            onAnalyze={handleAnalyzeFloorPlan}
            analyzeLoading={analyzeLoading}
            disabled={disabled}
            uploading={floorPlanUploading}
            stagePosition={seatMapStagePosition}
            previewSections={
              seatMapSections.length > 0
                ? seatMapSections.map((s) => ({
                    name: s.name,
                    rows: s.rows.map((r) => ({
                      label: r.label,
                      seatCount: r.seatCount,
                      ...(r.rowFraction != null ? { rowFraction: r.rowFraction } : {}),
                    })),
                    ...(s.layout ? { layout: s.layout } : {}),
                    ...(s.placement === 'arc' ? { placement: s.placement } : {}),
                  }))
                : null
            }
          />

          {seatMapSections.map((sec, secIdx) => (
            <div key={secIdx} className="p-4 rounded-xl border border-border space-y-3 bg-card/50">
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder={t('creator.edit.seatMap.sectionName')}
                  value={sec.name}
                  disabled={disabled}
                  onChange={(e) => updateSeatMapSection(secIdx, 'name', e.target.value)}
                  className="input-cosmic w-40"
                />
                <Select
                  value={sec.ticketCategoryId || undefined}
                  onValueChange={(v) => updateSeatMapSection(secIdx, 'ticketCategoryId', v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="min-w-[10rem] h-9">
                    <SelectValue placeholder={t('creator.edit.seatMap.ticketType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketCategories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.Name} — EGP {c.Price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => removeSeatMapSection(secIdx)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2 pl-2">
                {sec.rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs text-muted-foreground w-8">{t('creator.edit.seatMap.row')}</span>
                    <input
                      type="text"
                      maxLength={3}
                      value={row.label}
                      disabled={disabled}
                      onChange={(e) => updateSeatMapRow(secIdx, rowIdx, 'label', e.target.value)}
                      className="w-12 px-2 py-1.5 text-center rounded border border-border bg-background text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.seatCount}
                      disabled={disabled}
                      onChange={(e) => updateSeatMapRow(secIdx, rowIdx, 'seatCount', e.target.value)}
                      className="w-20 px-2 py-1.5 rounded border border-border bg-background text-sm"
                    />
                    <span className="text-xs text-muted-foreground">{t('creator.edit.seatMap.seats')}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => removeRowFromSection(secIdx, rowIdx)}
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
                  onClick={() => addRowToSection(secIdx)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('creator.edit.seatMap.addRow')}
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={disabled} onClick={addSeatMapSection}>
              <Plus className="h-4 w-4 mr-1" />
              {t('creator.edit.seatMap.addSection')}
            </Button>
            <Button
              type="button"
              disabled={disabled || seatMapSubmitting || ticketCategories.length === 0}
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => void handleGenerateSeatMap()}
            >
              {seatMapSubmitting
                ? t('creator.edit.seatMap.generating')
                : t('creator.edit.seatMap.generate')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
