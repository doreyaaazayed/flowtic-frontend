import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import {
  CATALOGUE_PLACEHOLDER_IMAGE,
  CENTER_PIECES_SECTION_ID,
  type CatalogueItem,
  type CatalogueSection,
  catalogueSelectionTotalEgp,
  formatEgp,
  getCatalogueSectionsForCategory,
  isMenuCatalogueSection,
  isWeddingEventCategory,
  supportsCatalogueQuantity,
} from '../data/eventSetupCatalogue';
import { loadEventCategoryDraft } from '../lib/eventCategoryDraft';
import {
  type EquipmentDraftEntry,
  loadEquipmentDraft,
  pruneEquipmentDraftForCategory,
  saveEquipmentDraft,
} from '../lib/eventEquipmentDraft';
import {
  loadHostingModeDraft,
  usesPlatformEquipment,
} from '../lib/eventHosting';

function menuComponents(t: (key: string, opts?: { returnObjects?: boolean }) => string, menuKey: string): string[] {
  const raw = t(`${menuKey}.components`, { returnObjects: true });
  return Array.isArray(raw) ? (raw as string[]) : [];
}

type CatalogueItemCardProps = {
  item: CatalogueItem;
  section: CatalogueSection;
  isOn: boolean;
  qty: number;
  onToggle: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

function CatalogueItemCard({
  item,
  section,
  isOn,
  qty,
  onToggle,
  onSetQuantity,
  t,
}: CatalogueItemCardProps) {
  const hasQty = section.id === CENTER_PIECES_SECTION_ID;
  const isMenu = Boolean(item.menuKey);

  if (isMenu && item.menuKey) {
    const components = menuComponents(t, item.menuKey);
    return (
      <li key={item.id}>
        <div
          className={`h-full rounded-xl border transition-all ${
            isOn
              ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
              : 'border-border'
          }`}
        >
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            className="group flex h-full w-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-xl"
          >
            <div className="relative flex flex-1 flex-col gap-3 p-4 sm:p-5 bg-card/90">
              {isOn && (
                <span className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <div className="pe-10">
                <p className="text-base font-semibold text-foreground">{t(`${item.menuKey}.name`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('creator.catalogue.menuGuestsNote')}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`${item.menuKey}.description`)}
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-2">
                  {t('creator.catalogue.menuIncludes')}
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {components.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-auto pt-2 text-base font-semibold text-primary">{formatEgp(item.priceEgp)}</p>
            </div>
          </button>
        </div>
      </li>
    );
  }

  return (
    <li key={item.id}>
      <div
        className={`w-full rounded-xl overflow-hidden border transition-all ${
          isOn
            ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
            : 'border-border'
        }`}
      >
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          <div className="relative aspect-[4/3] bg-muted">
            <img
              src={item.image ?? CATALOGUE_PLACEHOLDER_IMAGE}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith('placeholder.svg')) {
                  img.src = CATALOGUE_PLACEHOLDER_IMAGE;
                }
              }}
            />
            {isOn && (
              <span className="absolute top-2 end-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Check className="h-4 w-4" />
              </span>
            )}
          </div>
          <div className="px-3 py-2.5 text-center bg-card/80">
            <p className="text-sm font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-primary mt-0.5">{formatEgp(item.priceEgp)}</p>
          </div>
        </button>

        {hasQty && isOn && (
          <div
            className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-muted-foreground">{t('creator.catalogue.tableCount')}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={t('creator.catalogue.decreaseQty')}
                disabled={qty <= 1}
                onClick={() => onSetQuantity(item.id, qty - 1)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">{qty}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={t('creator.catalogue.increaseQty')}
                disabled={qty >= 999}
                onClick={() => onSetQuantity(item.id, qty + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function EventSetupCatalogue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hostingMode = loadHostingModeDraft() ?? 'full_setup';
  const catalogueAllowed = usesPlatformEquipment(hostingMode);
  const categoryName = loadEventCategoryDraft()?.categoryName ?? '';
  const visibleSections = useMemo(
    () => getCatalogueSectionsForCategory(categoryName),
    [categoryName],
  );
  const weddingDecorVisible = isWeddingEventCategory(categoryName);
  const [selected, setSelected] = useState<EquipmentDraftEntry[]>(() =>
    pruneEquipmentDraftForCategory(loadEquipmentDraft(), categoryName),
  );

  if (!catalogueAllowed) {
    return (
      <div className="admin-dashboard mx-auto max-w-lg space-y-6 text-center">
        <div className="admin-panel lg-card p-8">
          <h2 className="text-xl font-semibold mb-3">{t('creator.catalogue.unavailableTitle')}</h2>
          <p className="text-muted-foreground mb-6">{t('creator.catalogue.unavailableBody')}</p>
          <Button asChild>
            <Link to="/creator?tab=create">{t('creator.catalogue.backToCreate')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSelected = (id: string) => selected.some((e) => e.id === id);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const exists = prev.some((e) => e.id === id);
      const next = exists
        ? prev.filter((e) => e.id !== id)
        : [
            ...prev,
            {
              id,
              ...(supportsCatalogueQuantity(id) ? { quantity: 1 } : {}),
            },
          ];
      saveEquipmentDraft(next);
      return next;
    });
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setSelected((prev) => {
      const next = prev.map((e) =>
        e.id === id ? { ...e, quantity: Math.max(1, Math.min(999, quantity)) } : e,
      );
      saveEquipmentDraft(next);
      return next;
    });
  }, []);

  const done = () => {
    saveEquipmentDraft(selected);
    navigate('/creator?tab=create');
  };

  return (
    <div className="admin-dashboard max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/creator?tab=create"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('creator.catalogue.backToCreate')}
          </Link>
          <p className="max-w-2xl text-muted-foreground">{t('creator.catalogue.subtitle')}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {selected.length > 0 && (
            <p className="text-sm font-medium text-foreground">
              {t('creator.catalogue.selectionTotal', {
                total: formatEgp(catalogueSelectionTotalEgp(selected)),
              })}
            </p>
          )}
          <Button
            type="button"
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={done}
          >
            {t('creator.catalogue.done', { count: selected.length })}
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground rounded-xl border border-border bg-muted/20 px-4 py-3">
        {t('creator.catalogue.hint')}
      </p>
      {weddingDecorVisible && (
        <p className="mb-4 text-sm text-muted-foreground rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          {t('creator.catalogue.centerPieceQtyHint')}
        </p>
      )}
      {!categoryName && (
        <p className="mb-4 text-sm text-muted-foreground rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          {t('creator.catalogue.selectCategoryHint')}
        </p>
      )}
      {categoryName && !weddingDecorVisible && (
        <p className="mb-4 text-sm text-muted-foreground rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          {t('creator.catalogue.weddingCategoryHint')}
        </p>
      )}

      <div className="space-y-14">
        {visibleSections.map((section, sectionIndex) => (
          <section key={section.id}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.05, duration: 0.4 }}
            >
              <h2 className="text-xl font-semibold">{t(section.titleKey)}</h2>
              <p className="mt-1 text-sm text-muted-foreground mb-6">{t(section.descriptionKey)}</p>
            </motion.div>
            <ul
              className={
                isMenuCatalogueSection(section.id)
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
                  : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'
              }
            >
              {section.items.map((item) => (
                <CatalogueItemCard
                  key={item.id}
                  item={item}
                  section={section}
                  isOn={isSelected(item.id)}
                  qty={selected.find((e) => e.id === item.id)?.quantity ?? 1}
                  onToggle={toggle}
                  onSetQuantity={setQuantity}
                  t={t}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button type="button" variant="outline" className="gap-2" onClick={done}>
          <ArrowLeft className="h-4 w-4" />
          {t('creator.catalogue.backToCreate')}
        </Button>
      </div>
    </div>
  );
}
