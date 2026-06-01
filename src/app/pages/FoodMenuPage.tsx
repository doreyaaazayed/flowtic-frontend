import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, ChefHat, ArrowLeft, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  food,
  type FoodMenuItem,
  type FoodCartLine,
  type FoodRestaurant,
  type FoodVenueInfo,
} from '../lib/api';
import { Section, Reveal, Pill } from '../liquid';
import { FoodMenuCard } from '../components/food/FoodMenuCard';
import { CartSidebar } from '../components/food/CartSidebar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const SERVICE_RATE = 0.05;
const TAX_RATE = 0.14;

function pickupTotals(subtotal: number) {
  const sub = Math.max(0, subtotal);
  const serviceFee = Math.round(sub * SERVICE_RATE * 100) / 100;
  const taxAmount = Math.round((sub + serviceFee) * TAX_RATE * 100) / 100;
  return {
    subtotal: sub,
    serviceFee,
    taxAmount,
    totalAmount: Math.round((sub + serviceFee + taxAmount) * 100) / 100,
  };
}

export function FoodMenuPage() {
  const { eventId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const initialRestaurant = searchParams.get('restaurant') || 'all';
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [eventName, setEventName] = useState('');
  const [venueInfo, setVenueInfo] = useState<FoodVenueInfo | null>(null);
  const [restaurants, setRestaurants] = useState<FoodRestaurant[]>([]);
  const [items, setItems] = useState<FoodMenuItem[]>([]);
  const [popular, setPopular] = useState<FoodMenuItem[]>([]);
  const [featured, setFeatured] = useState<FoodMenuItem[]>([]);
  const [venueExclusive, setVenueExclusive] = useState<FoodMenuItem[]>([]);
  const [categories, setCategories] = useState<Array<{ CategoryID: number; Name: string }>>([]);
  const [cartItems, setCartItems] = useState<FoodCartLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totals, setTotals] = useState<{
    subtotal: number;
    serviceFee: number;
    taxAmount: number;
    totalAmount: number;
  }>();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [sort, setSort] = useState('popular');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');

  const filterKey = useMemo(
    () =>
      JSON.stringify({ search, category, restaurant, sort, minPrice, maxPrice, minRating }),
    [search, category, restaurant, sort, minPrice, maxPrice, minRating],
  );
  const [debouncedFilterKey, setDebouncedFilterKey] = useState(filterKey);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilterKey(filterKey), 300);
    return () => window.clearTimeout(timer);
  }, [filterKey]);

  const debouncedFilters = useMemo(() => {
    const parsed = JSON.parse(debouncedFilterKey) as {
      search: string;
      category: string;
      restaurant: string;
      sort: string;
      minPrice: string;
      maxPrice: string;
      minRating: string;
    };
    return parsed;
  }, [debouncedFilterKey]);

  const loadMenu = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { sort: debouncedFilters.sort };
      if (debouncedFilters.search) params.search = debouncedFilters.search;
      if (debouncedFilters.category !== 'all') params.category = debouncedFilters.category;
      if (debouncedFilters.minPrice) params.minPrice = debouncedFilters.minPrice;
      if (debouncedFilters.maxPrice) params.maxPrice = debouncedFilters.maxPrice;
      if (debouncedFilters.minRating) params.minRating = debouncedFilters.minRating;
      if (debouncedFilters.restaurant !== 'all') {
        params.restaurant = debouncedFilters.restaurant;
      }

      const data = await food.getMenu(eventId, params);
      setEventName(data.event.Name);
      setVenueInfo(data.venue);
      setRestaurants(data.restaurants || []);
      setItems(data.items);
      setPopular(data.popular || []);
      setFeatured(data.featured || []);
      setVenueExclusive(data.venueExclusive || []);
      setCategories(data.categories);
      setCartItems(data.cart.items);
      setSubtotal(data.cart.subtotal);
      setTotals(pickupTotals(data.cart.subtotal));
      setDenied(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('ticket')) {
        setDenied(true);
      } else {
        toast.error(msg || t('foodOrder.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, debouncedFilters, t]);

  useEffect(() => {
    const fromUrl = searchParams.get('restaurant');
    if (fromUrl) setRestaurant(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      navigate('/signin', { state: { from: `/event/${eventId}/food` } });
      return;
    }
    loadMenu();
  }, [user, eventId, navigate, loadMenu]);

  const qtyMap = useMemo(() => {
    const m: Record<number, number> = {};
    cartItems.forEach((l) => {
      m[l.foodItemId] = l.quantity;
    });
    return m;
  }, [cartItems]);

  const syncCart = (res: { items: FoodCartLine[]; subtotal: number }) => {
    setCartItems(res.items);
    setSubtotal(res.subtotal);
    setTotals(pickupTotals(res.subtotal));
  };

  const handleAdd = async (item: FoodMenuItem) => {
    try {
      const res = await food.addToCart({ eventId, foodItemId: item.FoodItemID, quantity: 1 });
      syncCart(res);
      toast.success(t('foodOrder.added'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('foodOrder.error'));
    }
  };

  const handleQty = async (foodItemId: number, quantity: number) => {
    try {
      const res =
        quantity <= 0
          ? await food.removeFromCart({ eventId, foodItemId })
          : await food.updateCart({ eventId, foodItemId, quantity });
      syncCart(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('foodOrder.error'));
    }
  };

  const handleFavorite = async (item: FoodMenuItem) => {
    try {
      const res = await food.toggleFavorite(item.FoodItemID);
      setItems((prev) =>
        prev.map((i) =>
          i.FoodItemID === item.FoodItemID ? { ...i, isFavorite: res.isFavorite } : i,
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('foodOrder.error'));
    }
  };

  if (denied) {
    return (
      <Section tight>
        <div className="lg-card mx-auto max-w-lg p-10 text-center">
          <Ticket className="mx-auto h-12 w-12 text-primary opacity-80" />
          <h1 className="mt-4 text-xl font-bold">{t('foodOrder.accessDeniedTitle')}</h1>
          <p className="mt-2 text-muted-foreground">{t('foodOrder.accessDenied')}</p>
          <Link to={`/event/${eventId}`} className="mt-6 inline-block">
            <Button className="rounded-full">{t('foodOrder.getTickets')}</Button>
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <Section tight>
      <Reveal>
        <Link
          to={`/event/${eventId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 lg-arrow-flip" />
          {eventName || t('foodOrder.backToEvent')}
        </Link>
        <Pill tone="gold" leadingIcon={<ChefHat className="h-3.5 w-3.5" />}>
          {t('food.pill')}
        </Pill>
        <h1 className="display-2 mt-4 text-balance">{eventName}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {venueInfo
            ? t('food.subtitleVenue', { venue: venueInfo.Name })
            : t('food.subtitle')}
        </p>
      </Reveal>

      {!loading && restaurants.length > 0 ? (
        <Reveal delay={60}>
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">{t('food.restaurants')}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setRestaurant('all')}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                  restaurant === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {t('foodOrder.allRestaurants')}
              </button>
              {restaurants.map((r) => (
                <button
                  key={r.RestaurantID}
                  type="button"
                  onClick={() => setRestaurant(String(r.RestaurantID))}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                    restaurant === String(r.RestaurantID)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : null}
                  <span className="font-medium">{r.Name}</span>
                  {r.categoryType ? (
                    <span className="text-xs text-muted-foreground">{r.categoryType}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      <Reveal delay={80}>
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-10"
              placeholder={t('foodOrder.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder={t('foodOrder.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('foodOrder.allCategories')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.CategoryID} value={c.Name}>
                  {c.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t('foodOrder.sortPopular')}</SelectItem>
              <SelectItem value="price-low">{t('events.priceLowHigh')}</SelectItem>
              <SelectItem value="price-high">{t('events.priceHighLow')}</SelectItem>
              <SelectItem value="rating">{t('foodOrder.sortRating')}</SelectItem>
              <SelectItem value="newest">{t('foodOrder.sortNewest')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={minRating || 'all'} onValueChange={(v) => setMinRating(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full lg:w-36">
              <SelectValue placeholder={t('foodOrder.minRating')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('foodOrder.anyRating')}</SelectItem>
              <SelectItem value="3">3+ ★</SelectItem>
              <SelectItem value="4">4+ ★</SelectItem>
              <SelectItem value="4.5">4.5+ ★</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadMenu()}>
            {t('foodOrder.applyFilters')}
          </Button>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="lg-card h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {featured.length > 0 && category === 'all' && restaurant === 'all' && !search && (
                <section className="mb-10">
                  <h2 className="mb-4 text-lg font-semibold">{t('foodOrder.featuredSection')}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {featured.map((item) => (
                      <FoodMenuCard
                        key={`f-${item.FoodItemID}`}
                        item={item}
                        qtyInCart={qtyMap[item.FoodItemID] || 0}
                        onAdd={() => handleAdd(item)}
                        onQtyChange={(q) => handleQty(item.FoodItemID, q)}
                        onToggleFavorite={() => handleFavorite(item)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {popular.length > 0 && category === 'all' && !search && (
                <section className="mb-10">
                  <h2 className="mb-4 text-lg font-semibold">{t('foodOrder.popularSection')}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {popular.map((item) => (
                      <FoodMenuCard
                        key={item.FoodItemID}
                        item={item}
                        qtyInCart={qtyMap[item.FoodItemID] || 0}
                        onAdd={() => handleAdd(item)}
                        onQtyChange={(q) => handleQty(item.FoodItemID, q)}
                        onToggleFavorite={() => handleFavorite(item)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {venueExclusive.length > 0 &&
                category === 'all' &&
                restaurant === 'all' &&
                !search && (
                  <section className="mb-10">
                    <h2 className="mb-4 text-lg font-semibold">
                      {t('foodOrder.venueExclusiveSection')}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {venueExclusive.map((item) => (
                        <FoodMenuCard
                          key={`vx-${item.FoodItemID}`}
                          item={item}
                          qtyInCart={qtyMap[item.FoodItemID] || 0}
                          onAdd={() => handleAdd(item)}
                          onQtyChange={(q) => handleQty(item.FoodItemID, q)}
                          onToggleFavorite={() => handleFavorite(item)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <FoodMenuCard
                    key={item.FoodItemID}
                    item={item}
                    qtyInCart={qtyMap[item.FoodItemID] || 0}
                    onAdd={() => handleAdd(item)}
                    onQtyChange={(q) => handleQty(item.FoodItemID, q)}
                    onToggleFavorite={() => handleFavorite(item)}
                  />
                ))}
              </div>
              {items.length === 0 && (
                <p className="py-12 text-center text-muted-foreground">{t('foodOrder.noItems')}</p>
              )}
            </>
          )}
        </div>

        <CartSidebar
          eventId={eventId}
          items={cartItems}
          subtotal={subtotal}
          totals={totals}
          onUpdateQty={handleQty}
          onRemove={(id) => handleQty(id, 0)}
          onClear={async () => {
            const res = await food.clearCart(eventId);
            syncCart(res);
            toast.success(t('foodOrder.cleared'));
          }}
        />
      </div>
    </Section>
  );
}
