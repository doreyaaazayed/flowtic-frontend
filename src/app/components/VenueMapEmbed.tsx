import { ExternalLink, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsEmbedUrl } from '../lib/googleMaps';
import { openExternalUrl } from '../lib/openExternalUrl';
import { cn } from './ui/utils';

type VenueMapEmbedProps = {
  query: string;
  label?: string;
  className?: string;
  height?: number;
};

export function VenueMapEmbed({ query, label, className, height = 400 }: VenueMapEmbedProps) {
  const { t } = useTranslation();
  const trimmed = query.trim();
  const directionsUrl = buildGoogleMapsDirectionsUrl(trimmed);
  const mapLabel = label?.trim() || trimmed;

  const openDirections = () => {
    void openExternalUrl(directionsUrl);
  };

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border/60 bg-muted', className)}
      style={{ height }}
    >
      <iframe
        title={mapLabel}
        src={buildGoogleMapsEmbedUrl(trimmed)}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <button
        type="button"
        onClick={openDirections}
        className="absolute inset-0 flex cursor-pointer flex-col items-center justify-end bg-gradient-to-t from-background/80 via-transparent to-transparent p-4 text-left transition-colors hover:from-background/90"
        aria-label={t('eventDetails.openInGoogleMaps')}
      >
        <span className="inline-flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/95 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.01]">
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{mapLabel}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-primary">
            {t('eventDetails.getDirections')}
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </span>
      </button>
    </div>
  );
}
