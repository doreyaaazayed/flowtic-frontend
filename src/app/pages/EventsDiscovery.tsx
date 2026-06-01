import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  X,
  Loader2,
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { EventCard } from '../components/EventCard';
import { EventCardSkeletonGrid } from '../components/EventCardSkeleton';
import { Reveal } from '../liquid/Reveal';
import { ParallaxLayer, ScrollOrb } from '../cinematic/Parallax';
import { ScrollFadeRise } from '../cinematic/ScrollFadeRise';
import { AIBadge } from '../components/AIBadge';
import {
  events as eventsApi,
  categories as categoriesApi,
  venues as venuesApi,
  type EventListItem,
} from '../lib/api';
import { resolveEventImageSrc } from '../lib/eventImage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const PAGE_SIZE = 10;

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && /abort/i.test(err.message)) return true;
  return false;
}

export function EventsDiscovery() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const venueIdFromUrl = searchParams.get('VenueID') || undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [eventsList, setEventsList] = useState<EventListItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<
    Array<{ _id: string; CategoryID: number; Name: string }>
  >([]);
  const [venuesList, setVenuesList] = useState<
    Array<{ VenueID: number; Name: string; Location: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Debounce typed search → only triggers a server hit ~300ms after the user stops typing.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  // Resolve the selected category pill (label) → CategoryID for the API.
  const categoryIdFromName = useMemo(() => {
    if (selectedCategory === 'all') return undefined;
    const match = categoriesList.find((c) => c.Name === selectedCategory);
    return match ? String(match.CategoryID) : undefined;
  }, [selectedCategory, categoriesList]);

  // Aux data — categories + venues — loaded once with their own cache layer.
  useEffect(() => {
    Promise.all([categoriesApi.list({ publicOnly: true }), venuesApi.list()])
      .then(([categoriesRes, venuesRes]) => {
        setCategoriesList(categoriesRes);
        setVenuesList(venuesRes);
      })
      .catch(() => {});
  }, []);

  // Paginated load — refetches from page 1 whenever filters or search change.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPage(1);
    eventsApi
      .listPage(
        {
          page: 1,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          CategoryID: categoryIdFromName,
          VenueID: venueIdFromUrl,
        },
        { signal: controller.signal },
      )
      .then((res) => {
        if (controller.signal.aborted) return;
        setEventsList(res.data);
        setHasMore(res.hasMore);
        setTotalCount(res.total);
      })
      .catch((err) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : t('events.loadFailed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedSearch, categoryIdFromName, venueIdFromUrl, t]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await eventsApi.listPage({
        page: nextPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        CategoryID: categoryIdFromName,
        VenueID: venueIdFromUrl,
      });
      setEventsList((prev) => {
        const seen = new Set(prev.map((e) => e._id));
        return [...prev, ...res.data.filter((e) => !seen.has(e._id))];
      });
      setHasMore(res.hasMore);
      setTotalCount(res.total);
      setPage(nextPage);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err instanceof Error ? err.message : t('events.loadFailed'));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, debouncedSearch, categoryIdFromName, venueIdFromUrl, t]);

  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    categoriesList.forEach((c) => {
      m[c.CategoryID] = c.Name;
    });
    return m;
  }, [categoriesList]);

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categoriesList.filter((c) => {
      if (seen.has(c.Name)) return false;
      seen.add(c.Name);
      return true;
    });
  }, [categoriesList]);

  const venueMap = useMemo(() => {
    const m: Record<number, string> = {};
    venuesList.forEach((v) => {
      m[v.VenueID] = v.Location || v.Name;
    });
    return m;
  }, [venuesList]);

  const cardEvents = useMemo(
    () =>
      eventsList.map((ev) => ({
        id: ev._id,
        title: ev.Name,
        category: categoryMap[ev.CategoryID] ?? 'Event',
        date: ev.StartDate,
        location:
          ev.externalVenue?.location ||
          (ev.VenueID != null ? venueMap[ev.VenueID] : undefined) ||
          (ev.VenueID != null ? `Venue ${ev.VenueID}` : '—'),
        price: ev.minPrice ?? 0,
        image: resolveEventImageSrc(ev.imageUrl),
        featured: ev.Status === 'Active',
      })),
    [eventsList, categoryMap, venueMap],
  );

  // Search + category are handled server-side. We only refine by date / price client-side
  // so users don't pay a round-trip when toggling those quick filters.
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return cardEvents.filter((event) => {
      if (selectedPrice !== 'all') {
        if (selectedPrice === 'free' && event.price !== 0) return false;
        if (selectedPrice === '0-50' && (event.price < 0 || event.price > 50)) return false;
        if (selectedPrice === '50-100' && (event.price < 50 || event.price > 100)) return false;
        if (selectedPrice === '100+' && event.price <= 100) return false;
      }
      if (selectedDate !== 'all') {
        const startTs = new Date(event.date).getTime();
        if (Number.isNaN(startTs)) return selectedDate === 'upcoming';
        if (selectedDate === 'today' && Math.abs(startTs - now) > day) return false;
        if (selectedDate === 'week' && (startTs - now > 7 * day || startTs - now < 0)) return false;
        if (selectedDate === 'month' && (startTs - now > 30 * day || startTs - now < 0)) return false;
        if (selectedDate === 'upcoming' && startTs < now) return false;
      }
      return true;
    });
  }, [cardEvents, selectedDate, selectedPrice]);

  const clearAll = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDate('all');
    setSelectedPrice('all');
  };

  return (
    <div className="relative isolate overflow-hidden pb-24 pt-12 md:pt-20">
      <ScrollOrb
        className="-left-24 top-4 opacity-55"
        color="rgba(139,92,246,0.34)"
        size={280}
        speed={0.24}
      />
      <ScrollOrb
        className="-right-8 top-40 opacity-45"
        color="rgba(6,182,212,0.26)"
        size={200}
        speed={0.16}
      />
      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal>
          <ParallaxLayer speed={0.14}>
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <AIBadge text={t('events.aiCurated')} />
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {t('events.discoverEyebrow')}
              </span>
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl md:text-6xl">
              <Trans
                i18nKey="events.discoverHeadline"
                components={{ accent: <span className="text-aurora" /> }}
              />
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              {loading
                ? t('events.loadingBrightest')
                : error
                  ? error
                  : t('events.liveCount', { count: eventsList.length })}
            </p>
          </div>
          </ParallaxLayer>
        </Reveal>

        {/* Search bar */}
        <Reveal delay={80}>
          <div
            className="relative mb-5 flex items-center gap-2 rounded-full border p-1.5"
            style={{
              background: 'rgba(8,10,24,0.45)',
              backdropFilter: 'blur(22px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
              borderColor: 'var(--lg-border-strong)',
              boxShadow: 'var(--lg-shadow)',
            }}
          >
            <span className="pl-3 text-muted-foreground">
              <Search className="h-5 w-5" />
            </span>
            <input
              id="events-discovery-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={t('events.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 sm:text-base"
            />
            {(searchQuery ||
              selectedCategory !== 'all' ||
              selectedDate !== 'all' ||
              selectedPrice !== 'all') && (
              <button
                onClick={clearAll}
                className="lg-btn lg-btn--ghost"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                <X className="h-4 w-4" />
                {t('events.clear')}
              </button>
            )}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="lg-btn"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('events.filters')}
            </button>
          </div>
        </Reveal>

        {/* Filter selects */}
        <Reveal delay={140}>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('events.date')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('events.anyDate')}</SelectItem>
                <SelectItem value="today">{t('events.today')}</SelectItem>
                <SelectItem value="week">{t('events.thisWeek')}</SelectItem>
                <SelectItem value="month">{t('events.thisMonth')}</SelectItem>
                <SelectItem value="upcoming">{t('events.upcoming')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPrice} onValueChange={setSelectedPrice}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('events.price')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('events.anyPrice')}</SelectItem>
                <SelectItem value="free">{t('events.free')}</SelectItem>
                <SelectItem value="0-50">EGP 0 – 50</SelectItem>
                <SelectItem value="50-100">EGP 50 – 100</SelectItem>
                <SelectItem value="100+">EGP 100+</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="popular">
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('events.sort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">{t('events.mostPopular')}</SelectItem>
                <SelectItem value="date">{t('events.date')}</SelectItem>
                <SelectItem value="price-low">{t('events.priceLowHigh')}</SelectItem>
                <SelectItem value="price-high">{t('events.priceHighLow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Reveal>

        {/* Advanced filters */}
        {showFilters && (
          <Reveal>
            <div className="lg-card mb-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="events-filter-location"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <MapPin className="h-4 w-4 text-[#a78bfa]" />
                    {t('events.location')}
                  </label>
                  <input
                    id="events-filter-location"
                    type="text"
                    placeholder={t('events.locationPlaceholder')}
                    className="lg-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="events-filter-max-price"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <DollarSign className="h-4 w-4 text-[#34d399]" />
                    {t('events.maxPrice')}
                  </label>
                  <input
                    id="events-filter-max-price"
                    type="number"
                    placeholder={t('events.enterAmount')}
                    className="lg-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="events-filter-specific-date"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <Calendar className="h-4 w-4 text-[#06b6d4]" />
                    {t('events.specificDate')}
                  </label>
                  <input id="events-filter-specific-date" type="date" className="lg-input" />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={clearAll} className="lg-btn lg-btn--ghost" style={{ padding: '0.5rem 1rem' }}>
                  {t('events.reset')}
                </button>
                <button className="lg-btn" style={{ padding: '0.5rem 1.1rem' }}>
                  {t('events.apply')}
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Category pills */}
        <Reveal delay={200}>
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-all"
              style={
                selectedCategory === 'all'
                  ? {
                      background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                      color: '#fff',
                      boxShadow: '0 8px 22px -8px rgba(139,92,246,0.55)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--lg-border)',
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                      color: 'var(--foreground)',
                    }
              }
            >
              {t('events.allEvents')}
            </button>
            {uniqueCategories.map((cat) => {
              const active = selectedCategory === cat.Name;
              return (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat.Name)}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition-all"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                          color: '#fff',
                          boxShadow: '0 8px 22px -8px rgba(139,92,246,0.55)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--lg-border)',
                          backdropFilter: 'blur(14px)',
                          WebkitBackdropFilter: 'blur(14px)',
                          color: 'var(--muted-foreground)',
                        }
                  }
                >
                  {cat.Name}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {loading ? '…' : filteredEvents.length}
            </span>{' '}
            {t('events.eventsLabel')}
            {totalCount != null && totalCount !== filteredEvents.length && !loading ? (
              <span className="ml-1 text-xs text-muted-foreground/70">/ {totalCount}</span>
            ) : null}
          </p>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-[#34d399]" />
            <span>{t('events.trending')}</span>
          </div>
        </div>

        {/* Events grid */}
        {loading ? (
          <EventCardSkeletonGrid count={PAGE_SIZE} />
        ) : error ? (
          <div className="lg-card mx-auto max-w-md p-10 text-center">
            <p className="font-bold text-destructive">{t('events.loadError')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('events.startBackend')}
            </p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event, i) => (
              <ScrollFadeRise key={event.id} delay={i * 40}>
                <EventCard event={event} />
              </ScrollFadeRise>
            ))}
          </div>
        ) : eventsList.length === 0 ? (
          <div className="lg-card mx-auto max-w-xl space-y-4 p-10 text-center">
            <div
              className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(6,182,212,0.14))',
              }}
            >
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">{t('events.noPublic')}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('events.noPublicDesc')}
            </p>
            <Link to="/admin" className="lg-btn lg-btn--ghost inline-flex">
              {t('events.adminReview')}
            </Link>
          </div>
        ) : (
          <div className="lg-card mx-auto max-w-md p-10 text-center">
            <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-bold">{t('events.noMatch')}</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {t('events.noMatchDesc')}
            </p>
            <button onClick={clearAll} className="lg-btn lg-btn--ghost">
              {t('events.clearAllFilters')}
            </button>
          </div>
        )}

        {hasMore && !loading && !error && filteredEvents.length > 0 && (
          <div className="mt-12 flex flex-col items-center gap-6">
            {loadingMore ? (
              <EventCardSkeletonGrid count={Math.min(PAGE_SIZE, 4)} />
            ) : null}
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="lg-btn lg-btn--ghost inline-flex items-center gap-2"
              style={{ padding: '0.85rem 1.6rem' }}
              aria-busy={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {loadingMore ? t('events.loadingMore') : t('events.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
