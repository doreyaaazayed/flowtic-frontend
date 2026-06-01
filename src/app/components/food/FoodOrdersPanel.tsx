import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChefHat, ArrowRight, Pencil, Calendar, Store, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { food } from '../../lib/api';
import { Button } from '../ui/button';
import { OrderTimeline } from './OrderTimeline';
import { isFoodOrderEditable } from '../../lib/cardValidation';
import { useFoodOrdersListPolling } from '../../hooks/useFoodOrderPolling';

type TicketEventRow = {
  _id: string;
  EventID: number;
  Name: string;
  StartDate: string;
  hasFood: boolean;
  restaurantCount: number;
  itemCount: number;
  restaurants: Array<{
    RestaurantID: number;
    Name: string;
    Description?: string;
    imageUrl?: string;
    itemCount: number;
  }>;
};

type OrderRow = {
  OrderID: number;
  Status: string;
  totalAmount: number;
  eventName?: string;
  itemCount: number;
  createdAt: string;
  estimatedReadyAt?: string;
  estimatedDeliveryMinutes?: number;
};

export function FoodOrdersPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ticketEvents, setTicketEvents] = useState<TicketEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const loadEvents = useCallback(() => {
    if (!user) return;
    setEventsLoading(true);
    food
      .myTicketEvents()
      .then((res) => {
        const list = res.events ?? [];
        setTicketEvents(list);
        setSelectedEventId((prev) => {
          if (prev && list.some((e) => e._id === prev)) return prev;
          return list.length === 1 ? list[0]._id : null;
        });
      })
      .catch(() => setTicketEvents([]))
      .finally(() => setEventsLoading(false));
  }, [user]);

  const loadOrders = useCallback(() => {
    if (!user) return;
    setOrdersLoading(true);
    food
      .myOrders(selectedEventId ?? undefined)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [user, selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useFoodOrdersListPolling(!!user, setOrders, selectedEventId ?? undefined);

  const selectedEvent = useMemo(
    () => ticketEvents.find((e) => e._id === selectedEventId) ?? null,
    [ticketEvents, selectedEventId],
  );

  const formatEventDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      <section className="admin-panel lg-card p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            {t('foodOrder.preOrderFood')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('foodOrder.selectEvent')}</p>
        </div>

        {eventsLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}

        {!eventsLoading && ticketEvents.length === 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-8 text-center space-y-4">
            <ChefHat className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">{t('foodOrder.noTicketEvents')}</p>
            <Link to="/events">
              <Button variant="outline">{t('foodOrder.browseEvents')}</Button>
            </Link>
          </div>
        )}

        {!eventsLoading && ticketEvents.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {ticketEvents.map((ev) => {
                const active = selectedEventId === ev._id;
                return (
                  <button
                    key={ev._id}
                    type="button"
                    onClick={() => setSelectedEventId(ev._id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      active
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                        : 'border-border bg-muted/15 hover:border-primary/40 hover:bg-muted/25'
                    }`}
                  >
                    <p className="font-semibold truncate">{ev.Name}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatEventDate(ev.StartDate)}
                    </p>
                    <p className="text-xs text-primary mt-2">
                      {ev.hasFood
                        ? t('foodOrder.vendorSummary', {
                            vendors: ev.restaurantCount,
                            items: ev.itemCount,
                          })
                        : t('foodOrder.noVendorsForEvent')}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedEvent && (
              <div className="space-y-4 border-t border-border/60 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-medium">{t('foodOrder.vendorsAtEvent', { name: selectedEvent.Name })}</h4>
                  {ticketEvents.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                      onClick={() => setSelectedEventId(null)}
                    >
                      {t('foodOrder.changeEvent')}
                    </button>
                  )}
                </div>

                {!selectedEvent.hasFood && (
                  <p className="text-sm text-muted-foreground rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    {t('foodOrder.noVendorsForEvent')}
                  </p>
                )}

                {selectedEvent.hasFood && selectedEvent.restaurants.length > 0 && (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {selectedEvent.restaurants.map((rest) => (
                      <li
                        key={rest.RestaurantID}
                        className="rounded-xl border border-border bg-muted/15 p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
                            <Store className="h-5 w-5 text-white" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{rest.Name}</p>
                            {rest.Description ? (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {rest.Description}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('foodOrder.menuItems', { count: rest.itemCount })}
                            </p>
                          </div>
                        </div>
                        <Button
                          asChild
                          className="w-full bg-gradient-to-r from-primary to-secondary"
                          size="sm"
                        >
                          <Link
                            to={`/event/${selectedEvent._id}/food?restaurant=${rest.RestaurantID}`}
                          >
                            {t('foodOrder.browseMenu')}
                            <ArrowRight className="h-4 w-4 ms-1 lg-arrow-flip" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedEvent.hasFood && selectedEvent.restaurants.length === 0 && (
                  <Button asChild className="bg-gradient-to-r from-primary to-secondary">
                    <Link to={`/event/${selectedEvent._id}/food`}>
                      {t('foodOrder.browseMenu')}
                      <ArrowRight className="h-4 w-4 ms-1 lg-arrow-flip" />
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {!selectedEvent && ticketEvents.length > 1 && (
              <p className="text-sm text-muted-foreground">{t('foodOrder.pickEventHint')}</p>
            )}
          </>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">{t('foodOrder.myOrders')}</h3>
        {ordersLoading && orders.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        )}
        {!ordersLoading && orders.length === 0 && (
          <div className="admin-panel lg-card p-8 text-center space-y-3">
            <ChefHat className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{t('foodOrder.noOrders')}</p>
          </div>
        )}
        {orders.map((o, i) => {
          const editable = isFoodOrderEditable(o.Status);
          return (
            <motion.div
              key={o.OrderID}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="admin-panel lg-card overflow-hidden p-5 transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Link to={`/food/orders/${o.OrderID}`} className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold">{o.eventName || `Order #${o.OrderID}`}</p>
                  <p className="text-sm text-muted-foreground">
                    #{o.OrderID} · {o.itemCount} {t('foodOrder.items')} ·{' '}
                    <span className="font-medium text-foreground">{o.Status}</span>
                  </p>
                  <p className="text-lg font-bold text-luxe">EGP {o.totalAmount}</p>
                </Link>
                <div className="flex items-center gap-2">
                  {editable && (
                    <Link to={`/food/orders/${o.OrderID}/edit`}>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-full">
                        <Pencil className="h-3.5 w-3.5" />
                        {t('foodOrder.editOrder')}
                      </Button>
                    </Link>
                  )}
                  <Link to={`/food/orders/${o.OrderID}`}>
                    <Button size="sm" variant="ghost" className="rounded-full">
                      <ArrowRight className="h-4 w-4 text-muted-foreground lg-arrow-flip" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mt-4 border-t border-border/60 pt-4">
                <OrderTimeline
                  status={o.Status}
                  compact
                  estimatedReadyAt={o.estimatedReadyAt}
                  estimatedDeliveryMinutes={o.estimatedDeliveryMinutes}
                />
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
