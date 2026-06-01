import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChefHat } from 'lucide-react';
import { Section, Reveal, Pill } from '../liquid';
import { Button } from '../components/ui/button';

/** Legacy route `/food` — food ordering is per-event after ticket purchase. */
export function FoodOrdering() {
  const { t } = useTranslation();

  return (
    <Section tight>
      <Reveal>
        <Pill tone="gold" leadingIcon={<ChefHat className="h-3.5 w-3.5" />}>
          {t('food.pill')}
        </Pill>
        <h1 className="display-2 mt-4">{t('food.title')}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{t('foodOrder.selectEvent')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/events">
            <Button className="rounded-full bg-gradient-to-r from-primary to-secondary">
              {t('nav.events')}
            </Button>
          </Link>
          <Link to="/food/orders">
            <Button variant="outline">{t('foodOrder.myOr ders')}</Button>
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
