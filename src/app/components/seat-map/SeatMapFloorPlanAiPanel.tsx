import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import type { SeatMapPreviewSection } from '../../lib/api';
import type { StagePosition } from './stagePosition';

const MAX_FLOOR_PLAN_MB = 2;

export type SeatMapFloorPlanAiPanelProps = {
  floorPlanUrl: string | null;
  floorPlanLabel?: string | null;
  onFloorPlanChange: (dataUrl: string | null, label: string | null) => void;
  onAnalyze: () => void | Promise<void>;
  analyzeLoading?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  previewSections?: SeatMapPreviewSection[] | null;
  stagePosition?: StagePosition;
  showCreateHint?: boolean;
  onValidationError?: (message: string | null) => void;
};

export function SeatMapFloorPlanAiPanel({
  floorPlanUrl,
  floorPlanLabel,
  onFloorPlanChange,
  onAnalyze,
  analyzeLoading,
  disabled,
  uploading,
  previewSections,
  stagePosition,
  showCreateHint,
  onValidationError,
}: SeatMapFloorPlanAiPanelProps) {
  const { t } = useTranslation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onValidationError?.(t('creator.edit.seatMap.imageOnly'));
      return;
    }
    if (file.size > MAX_FLOOR_PLAN_MB * 1024 * 1024) {
      onValidationError?.(t('creator.edit.seatMap.floorPlanSize', { mb: MAX_FLOOR_PLAN_MB }));
      return;
    }
    onValidationError?.(null);
    const reader = new FileReader();
    reader.onload = () => onFloorPlanChange(reader.result as string, file.name);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-muted/20 space-y-3">
      <p className="text-sm font-medium">{t('creator.edit.seatMap.floorPlan')}</p>
      <p className="text-xs text-muted-foreground">{t('creator.create.seatMap.aiHint')}</p>
      <input
        type="file"
        accept="image/*"
        disabled={disabled || uploading}
        onChange={handleFile}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-primary-foreground"
      />
      {floorPlanLabel && (
        <p className="text-xs text-muted-foreground">
          {t('creator.create.seatMap.selectedFile')}{' '}
          <span className="text-foreground font-medium">{floorPlanLabel}</span>
        </p>
      )}
      {floorPlanUrl && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start gap-3">
            <img
              src={floorPlanUrl}
              alt=""
              className="max-h-36 w-auto rounded-lg border border-border object-contain bg-muted"
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-gradient-to-r from-primary to-secondary"
                disabled={disabled || analyzeLoading || uploading}
                onClick={() => void onAnalyze()}
              >
                <Sparkles className="h-4 w-4" />
                {analyzeLoading
                  ? t('creator.edit.seatMap.analyzing')
                  : t('creator.edit.seatMap.analyze')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onFloorPlanChange(null, null)}
              >
                {t('creator.edit.seatMap.removeImage')}
              </Button>
            </div>
          </div>
          {previewSections && previewSections.length > 0 && (
            <div className="rounded-lg border border-border bg-background/80 p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">
                {t('creator.create.seatMap.aiSections', { count: previewSections.length })}
              </p>
              {stagePosition && (
                <p className="text-muted-foreground">
                  {t('creator.create.seatMap.stageDetected')}{' '}
                  <span className="text-foreground font-medium capitalize">{stagePosition}</span>
                </p>
              )}
              <ul className="list-disc list-inside text-muted-foreground">
                {previewSections.map((s, i) => (
                  <li key={`${s.name}-${i}`}>
                    <span className="text-foreground">{s.name}</span>
                    {' — '}
                    {s.rows?.length ?? 0} {t('creator.edit.seatMap.row').toLowerCase()}(s),{' '}
                    {(s.rows ?? []).reduce((acc, r) => acc + (Number(r.seatCount) || 0), 0)}{' '}
                    {t('creator.edit.seatMap.seats')}
                  </li>
                ))}
              </ul>
              {showCreateHint && (
                <p className="text-muted-foreground pt-1">{t('creator.create.seatMap.aiApplyOnSubmit')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
