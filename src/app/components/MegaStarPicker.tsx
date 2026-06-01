import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  MEGA_STAR_ARTISTS,
  MEGA_STAR_BANDS,
  MEGA_STAR_PLACEHOLDER_IMAGE,
  formatMegaStarEgp,
  getMegaStarById,
  getMegaStarDisplayName,
  type MegaStarOption,
} from '../data/megaStarCatalogue';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type Props = {
  selectedStarId: string;
  selectedDurationId: string;
  onSelectStar: (starId: string) => void;
  onSelectDuration: (durationId: string) => void;
  disabled?: boolean;
};

function StarCard({
  star,
  selected,
  onSelect,
  disabled,
  t,
}: {
  star: MegaStarOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  const fromPrice = Math.min(...star.durations.map((d) => d.priceEgp));

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full text-left rounded-xl overflow-hidden border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? 'border-secondary ring-2 ring-secondary/40 shadow-lg shadow-secondary/10'
          : 'border-border hover:border-secondary/50'
      }`}
    >
      <div className="relative aspect-square bg-muted">
        <img
          src={star.image}
          alt={getMegaStarDisplayName(star, t)}
          className="h-full w-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.includes('placeholder')) {
              img.src = MEGA_STAR_PLACEHOLDER_IMAGE;
            }
          }}
        />
        {selected && (
          <span className="absolute top-2 end-2 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-md">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="px-2 py-2 bg-card/90 text-center">
        <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">
          {getMegaStarDisplayName(star, t)}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
          {t('creator.megaStar.fromPrice', { price: formatMegaStarEgp(fromPrice) })}
        </p>
      </div>
    </button>
  );
}

function StarGrid({
  title,
  stars,
  selectedStarId,
  onSelectStar,
  disabled,
  t,
}: {
  title: string;
  stars: MegaStarOption[];
  selectedStarId: string;
  onSelectStar: (id: string) => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {stars.map((star) => (
          <li key={star.id}>
            <StarCard
              star={star}
              selected={selectedStarId === star.id}
              onSelect={() => onSelectStar(star.id)}
              disabled={disabled}
              t={t}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MegaStarPicker({
  selectedStarId,
  selectedDurationId,
  onSelectStar,
  onSelectDuration,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const selectedStar = getMegaStarById(selectedStarId);

  const handleSelectStar = (id: string) => {
    onSelectStar(id);
    const star = getMegaStarById(id);
    if (star && !star.durations.some((d) => d.id === selectedDurationId)) {
      onSelectDuration(star.durations[0]?.id ?? '');
    }
  };

  return (
    <div className="space-y-6 pt-2 border-t border-border/60">
      <StarGrid
        title={t('creator.megaStar.sections.artists')}
        stars={MEGA_STAR_ARTISTS}
        selectedStarId={selectedStarId}
        onSelectStar={handleSelectStar}
        disabled={disabled}
        t={t}
      />
      <StarGrid
        title={t('creator.megaStar.sections.bands')}
        stars={MEGA_STAR_BANDS}
        selectedStarId={selectedStarId}
        onSelectStar={handleSelectStar}
        disabled={disabled}
        t={t}
      />

      <div className="min-w-0 max-w-md">
        <label htmlFor="create-megastar-duration" className="form-label-cosmic mb-2 block">
          {t('creator.megaStar.durationLabel')}
        </label>
        <Select
          value={selectedDurationId || undefined}
          onValueChange={onSelectDuration}
          disabled={disabled || !selectedStarId}
        >
          <SelectTrigger id="create-megastar-duration" className="lg-input w-full min-h-[48px]">
            <SelectValue placeholder={t('creator.megaStar.durationPlaceholder')} />
          </SelectTrigger>
          <SelectContent position="popper">
            {(selectedStar?.durations ?? []).map((dur) => (
              <SelectItem key={dur.id} value={dur.id}>
                {t(dur.labelKey)} — {formatMegaStarEgp(dur.priceEgp)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
