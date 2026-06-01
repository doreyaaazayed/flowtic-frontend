import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Loader2, AlertCircle, Building2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VenueCard } from '../components/venues/VenueCard';
import { VenueCardSkeletonGrid } from '../components/venues/VenueCardSkeleton';
import {
  VenueFormDialog,
  venueFormToApiBody,
  type VenueFormValues,
} from '../components/venues/VenueFormDialog';
import { Reveal } from '../liquid/Reveal';
import { ScrollFadeRise } from '../cinematic/ScrollFadeRise';
import { Button } from '../components/ui/button';
import { venues as venuesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { VenueListItem } from '../types/venue';

const canManageVenues = (role?: string) => role === 'organizer' || role === 'admin';
const isAdmin = (role?: string) => role === 'admin';

const PAGE_SIZE = 12;

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && /abort/i.test(err.message)) return true;
  return false;
}

export function VenuesDiscovery() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const staff = canManageVenues(user?.role);
  const admin = isAdmin(user?.role);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [venuesList, setVenuesList] = useState<VenueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [venueFormOpen, setVenueFormOpen] = useState(false);
  const [venueFormMode, setVenueFormMode] = useState<'create' | 'edit'>('create');
  const [editingVenue, setEditingVenue] = useState<VenueListItem | null>(null);

  const refreshList = useCallback(() => {
    setRetryTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPage(1);
    venuesApi
      .listPage(
        { page: 1, limit: PAGE_SIZE, search: debouncedSearch || undefined },
        { signal: controller.signal },
      )
      .then((res) => {
        if (controller.signal.aborted) return;
        setVenuesList(res.data);
        setHasMore(res.hasMore);
        setTotalCount(res.total);
      })
      .catch((err) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : t('venues.loadFailed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedSearch, t, retryTick]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await venuesApi.listPage({
        page: nextPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setVenuesList((prev) => {
        const seen = new Set(prev.map((v) => v._id));
        return [...prev, ...res.data.filter((v) => !seen.has(v._id))];
      });
      setHasMore(res.hasMore);
      setTotalCount(res.total);
      setPage(nextPage);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err instanceof Error ? err.message : t('venues.loadFailed'));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, debouncedSearch, t]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const showEmpty = !loading && !error && venuesList.length === 0;

  return (
    <div className="min-h-screen pb-16">
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/5 via-background to-background px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollFadeRise>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                  <Building2 className="h-4 w-4" aria-hidden />
                  {t('venues.eyebrow')}
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {t('venues.title')}
                </h1>
                <p className="mt-3 text-muted-foreground">{t('venues.subtitle')}</p>
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:items-end">
                {!loading && totalCount != null ? (
                  <p className="text-sm text-muted-foreground">
                    {t('venues.count', { count: totalCount })}
                  </p>
                ) : null}
                {staff && (
                  <Button
                    type="button"
                    className="gap-2 bg-gradient-to-r from-primary to-secondary"
                    onClick={() => {
                      setVenueFormMode('create');
                      setEditingVenue(null);
                      setVenueFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {t('venues.addVenue')}
                  </Button>
                )}
              </div>
            </div>
          </ScrollFadeRise>

          {staff && (
            <ScrollFadeRise delay={0.05}>
              <p className="mt-4 text-sm text-muted-foreground">
                {admin ? t('venues.manageHintAdmin') : t('venues.manageHintOrganizer')}
              </p>
            </ScrollFadeRise>
          )}

          <ScrollFadeRise delay={0.08}>
            <div className="relative mt-8 max-w-xl">
              <Search
                className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('venues.searchPlaceholder')}
                className="w-full rounded-full border border-border bg-card/80 py-3 ps-11 pe-4 text-sm shadow-sm backdrop-blur-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label={t('venues.searchPlaceholder')}
              />
            </div>
          </ScrollFadeRise>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {error ? (
          <Reveal>
            <div
              role="alert"
              className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
            >
              <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
              <div>
                <p className="font-medium text-foreground">{t('venues.errorTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setRetryTick((n) => n + 1)}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {t('venues.retry')}
              </button>
            </div>
          </Reveal>
        ) : null}

        {loading ? <VenueCardSkeletonGrid count={6} /> : null}

        {showEmpty ? (
          <Reveal>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/60" aria-hidden />
              <div>
                <p className="text-lg font-medium text-foreground">{t('venues.emptyTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {debouncedSearch ? t('venues.emptySearch') : t('venues.emptyHint')}
                </p>
              </div>
              {debouncedSearch ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('venues.clearSearch')}
                </button>
              ) : (
                <Link
                  to="/events"
                  className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  {t('venues.browseEvents')}
                </Link>
              )}
            </div>
          </Reveal>
        ) : null}

        {!loading && !error && venuesList.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {venuesList.map((venue, i) => (
                <Reveal key={venue._id} delay={Math.min(i * 0.04, 0.24)}>
                  <VenueCard
                    venue={venue}
                    onEdit={
                      admin
                        ? (v) => {
                            setVenueFormMode('edit');
                            setEditingVenue(v);
                            setVenueFormOpen(true);
                          }
                        : undefined
                    }
                    onDelete={
                      admin
                        ? async (v) => {
                            if (!window.confirm(t('venues.deleteConfirm', { name: v.Name }))) return;
                            try {
                              await venuesApi.delete(v._id);
                              refreshList();
                            } catch (err) {
                              window.alert(err instanceof Error ? err.message : t('venues.loadFailed'));
                            }
                          }
                        : undefined
                    }
                  />
                </Reveal>
              ))}
            </div>
            <div ref={loadMoreRef} className="mt-10 flex justify-center py-4" aria-hidden={!hasMore}>
              {loadingMore ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label={t('venues.loadingMore')} />
              ) : null}
              {!hasMore && venuesList.length > 0 ? (
                <p className="text-sm text-muted-foreground">{t('venues.endOfList')}</p>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {staff && (
        <VenueFormDialog
          open={venueFormOpen}
          onOpenChange={setVenueFormOpen}
          mode={venueFormMode}
          initial={venueFormMode === 'edit' ? editingVenue : null}
          onSubmit={async (values: VenueFormValues) => {
            const body = venueFormToApiBody(values);
            if (venueFormMode === 'edit' && editingVenue) {
              await venuesApi.update(editingVenue._id, {
                ...body,
                imageUrl: values.imageUrl,
              });
            } else {
              await venuesApi.create(body);
            }
            refreshList();
          }}
        />
      )}
    </div>
  );
}
