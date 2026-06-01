import { memo } from 'react';
import { motion } from 'motion/react';
import { Heart, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FoodMenuItem } from '../../lib/api';
import { RatingStars } from './RatingStars';
import { QuantitySelector } from './QuantitySelector';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

type Props = {
  item: FoodMenuItem;
  qtyInCart: number;
  onAdd: () => void;
  onQtyChange: (q: number) => void;
  onToggleFavorite: () => void;
};

function FoodMenuCardImpl({ item, qtyInCart, onAdd, onQtyChange, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const unavailable = !item.availability || item.stockQuantity < 1;

  return (
    <motion.article
      className={cn(
        'lg-card group overflow-hidden transition-shadow hover:shadow-lg',
        unavailable && 'opacity-60',
      )}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}
          alt=""
          loading="lazy"
          decoding="async"
          width={480}
          height={360}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={onToggleFavorite}
          className="absolute end-3 top-3 rounded-full bg-black/40 p-2 backdrop-blur-md transition hover:bg-black/60"
          aria-label="Favorite"
        >
          <Heart
            className={cn('h-4 w-4', item.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white')}
          />
        </button>
        {item.isVenueExclusive && (
          <span className="absolute start-3 bottom-3 rounded-full bg-violet-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {t('foodOrder.venueExclusive')}
          </span>
        )}
        {item.isPopular && (
          <span className="absolute start-3 top-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {t('foodOrder.popular')}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold tracking-tight text-foreground">{item.Name}</h3>
        {item.restaurantName ? (
          <p className="mt-0.5 text-xs text-primary/90">{item.restaurantName}</p>
        ) : null}
        {item.Description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.Description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <RatingStars value={item.ratingAvg || 0} count={item.ratingCount} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {item.preparationTimeMinutes} {t('foodOrder.min')}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('events.startingAt')}
            </p>
            <p className="text-lg font-bold text-luxe">EGP {item.Price}</p>
          </div>
          {qtyInCart > 0 ? (
            <QuantitySelector
              value={qtyInCart}
              max={Math.min(20, item.stockQuantity)}
              disabled={unavailable}
              onChange={onQtyChange}
            />
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={unavailable}
              className="rounded-full bg-gradient-to-r from-primary to-secondary"
              onClick={onAdd}
            >
              {t('foodOrder.addToCart')}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export const FoodMenuCard = memo(FoodMenuCardImpl);
