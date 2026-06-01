import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Calendar, ArrowUpRight, Building2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VenueListItem } from '../../types/venue';
import {
  venueImageUrl,
  venueDescriptionPreview,
  formatVenueCapacity,
  formatVenueDate,
} from '../../lib/venueDisplay';

interface VenueCardProps {
  venue: VenueListItem;
  onEdit?: (venue: VenueListItem) => void;
  onDelete?: (venue: VenueListItem) => void;
}

function VenueCardImpl({ venue, onEdit, onDelete }: VenueCardProps) {
  const { t, i18n } = useTranslation();
  const [imgLoaded, setImgLoaded] = useState(false);
  const image = venueImageUrl(venue);
  const preview = venueDescriptionPreview(venue);
  const capacity = formatVenueCapacity(venue.Capacity);
  const created = formatVenueDate(venue.createdAt, i18n.language);
  const status = venue.availabilityStatus ?? 'available';
  const eventsHref = `/events?VenueID=${venue.VenueID}`;

  return (
    <article
      className="lg-card group relative flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg"
      style={{ borderRadius: 'var(--radius)' }}
    >
      <Link to={eventsHref} className="relative block aspect-[16/10] w-full overflow-hidden">
        {!imgLoaded && <div className="lg-skeleton absolute inset-0" aria-hidden />}
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        {(onEdit || onDelete) && (
          <div className="absolute start-3 top-3 z-10 flex gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(venue);
                }}
                className="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70"
                aria-label={t('venues.edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(venue);
                }}
                className="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-destructive/80"
                aria-label={t('venues.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {venue.Type ? (
          <span
            className={`absolute ${onEdit || onDelete ? 'start-20' : 'start-3'} top-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm`}
          >
            {venue.Type}
          </span>
        ) : null}
        <span
          className={`absolute end-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${
            status === 'hosting'
              ? 'bg-violet-500/90 text-white'
              : 'bg-emerald-500/90 text-white'
          }`}
        >
          {status === 'hosting'
            ? t('venues.statusHosting', { count: venue.activeEventCount ?? 0 })
            : t('venues.statusAvailable')}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-snug text-foreground line-clamp-2">
            <Link to={eventsHref} className="hover:text-primary transition-colors">
              {venue.Name}
            </Link>
          </h3>
          <Link
            to={eventsHref}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            aria-label={t('venues.viewEvents')}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-2">{venue.Location}</span>
        </p>

        {preview ? (
          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{preview}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          {capacity ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {t('venues.capacity', { count: capacity })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {t('venues.capacityUnknown')}
            </span>
          )}
          {created ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {t('venues.added', { date: created })}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const VenueCard = memo(VenueCardImpl);
