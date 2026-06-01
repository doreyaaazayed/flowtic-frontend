import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChefHat, Plus, RefreshCw } from 'lucide-react';
import { adminFood, venues as venuesApi, type FoodRestaurant } from '../../lib/api';
import type { VenueListItem } from '../../types/venue';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function AdminVenueFoodPanel() {
  const { t } = useTranslation();
  const [venueList, setVenueList] = useState<VenueListItem[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [restaurants, setRestaurants] = useState<FoodRestaurant[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restName, setRestName] = useState('');
  const [restType, setRestType] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [targetRestaurantId, setTargetRestaurantId] = useState<string>('');

  useEffect(() => {
    venuesApi.list().then(setVenueList).catch(() => {});
  }, []);

  const loadSummary = useCallback(async () => {
    if (!selectedVenueId) return;
    setLoading(true);
    try {
      const res = await adminFood.getVenueSummary(selectedVenueId);
      setRestaurants(res.restaurants);
      setItemCount(res.itemCount);
      if (res.restaurants.length && !targetRestaurantId) {
        setTargetRestaurantId(String(res.restaurants[0].RestaurantID));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('adminFood.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedVenueId, targetRestaurantId, t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleAddRestaurant = async () => {
    if (!selectedVenueId || !restName.trim()) return;
    try {
      await adminFood.createRestaurant(selectedVenueId, {
        Name: restName.trim(),
        categoryType: restType.trim() || undefined,
      });
      setRestName('');
      setRestType('');
      toast.success(t('adminFood.restaurantAdded'));
      loadSummary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('adminFood.error'));
    }
  };

  const handleAddItem = async () => {
    const rid = Number(targetRestaurantId);
    const price = Number(itemPrice);
    if (!rid || !itemName.trim() || Number.isNaN(price)) return;
    try {
      await adminFood.createFoodItem(rid, {
        Name: itemName.trim(),
        Price: price,
        categoryName: itemCategory.trim() || 'General',
      });
      setItemName('');
      setItemPrice('');
      toast.success(t('adminFood.itemAdded'));
      loadSummary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('adminFood.error'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <Label>{t('adminFood.selectVenue')}</Label>
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t('adminFood.selectVenue')} />
            </SelectTrigger>
            <SelectContent>
              {venueList.map((v) => (
                <SelectItem key={v._id} value={String(v.VenueID)}>
                  {v.Name} ({v.Type || v.Location})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => loadSummary()} disabled={!selectedVenueId || loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {selectedVenueId ? (
        <>
          <p className="text-sm text-muted-foreground">
            {t('adminFood.summary', { restaurants: restaurants.length, items: itemCount })}
          </p>

          <div className="lg-card p-6 space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <ChefHat className="h-5 w-5 text-primary" />
              {t('adminFood.addRestaurant')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder={t('adminFood.restaurantName')}
                value={restName}
                onChange={(e) => setRestName(e.target.value)}
              />
              <Input
                placeholder={t('adminFood.restaurantType')}
                value={restType}
                onChange={(e) => setRestType(e.target.value)}
              />
              <Button onClick={handleAddRestaurant} disabled={!restName.trim()}>
                <Plus className="h-4 w-4 me-1" />
                {t('adminFood.add')}
              </Button>
            </div>
          </div>

          <div className="lg-card p-6 space-y-4">
            <h3 className="font-semibold">{t('adminFood.addItem')}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={targetRestaurantId} onValueChange={setTargetRestaurantId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('adminFood.restaurant')} />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r.RestaurantID} value={String(r.RestaurantID)}>
                      {r.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t('adminFood.itemName')}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t('adminFood.price')}
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
              />
              <Input
                placeholder={t('adminFood.category')}
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
              />
              <Button onClick={handleAddItem} disabled={!itemName.trim() || !targetRestaurantId}>
                <Plus className="h-4 w-4 me-1" />
                {t('adminFood.addItemBtn')}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => (
              <div key={r.RestaurantID} className="lg-card overflow-hidden">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
                ) : (
                  <div className="aspect-[2/1] bg-muted" />
                )}
                <div className="p-4">
                  <p className="font-semibold">{r.Name}</p>
                  {r.categoryType ? (
                    <p className="text-xs text-muted-foreground">{r.categoryType}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">{t('adminFood.pickVenueHint')}</p>
      )}
    </div>
  );
}
