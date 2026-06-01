import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ChefHat,
  ClipboardList,
  DollarSign,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, vendorPortal, type VendorFoodOrder } from '../lib/api';
import { isValidPassword } from '../lib/authFieldValidation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

type VendorEvent = { EventID: number; Name: string };

function nextStatus(order: VendorFoodOrder): { status: string; labelKey: string } | null {
  switch (order.Status) {
    case 'Pending':
    case 'Confirmed':
      return { status: 'Preparing', labelKey: 'vendorDash.actionPreparing' };
    case 'Preparing':
      return {
        status: 'Ready',
        labelKey: order.isSeatDelivery
          ? 'vendorDash.actionReadySeat'
          : 'vendorDash.actionReadyPickup',
      };
    case 'Ready':
      return { status: 'Completed', labelKey: 'vendorDash.actionComplete' };
    default:
      return null;
  }
}

export function VendorDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [ctxLoading, setCtxLoading] = useState(true);
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [orders, setOrders] = useState<VendorFoodOrder[]>([]);
  const [earnings, setEarnings] = useState<{
    grossRevenue: number;
    orderCount: number;
    activeOrders: number;
  } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<
    Array<{ FoodItemID: number; Name: string; Price: number; availability?: boolean }>
  >([]);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [posCart, setPosCart] = useState<Record<number, number>>({});
  const [posCustomer, setPosCustomer] = useState('');
  const [posNotes, setPosNotes] = useState('');
  const [posBusy, setPosBusy] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((e) => e.EventID === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const loadContext = useCallback(async () => {
    setCtxLoading(true);
    try {
      const ctx = await vendorPortal.me();
      setVendorName(ctx.vendor.Name);
      const evs = (ctx.events?.length ? ctx.events : ctx.event ? [ctx.event] : []) as VendorEvent[];
      setEvents(evs);
      setSelectedEventId((prev) => {
        if (prev != null && evs.some((e) => e.EventID === prev)) return prev;
        return evs[0]?.EventID ?? null;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorDash.loadFailed'));
    } finally {
      setCtxLoading(false);
    }
  }, [t]);

  const loadOrders = useCallback(async () => {
    if (selectedEventId == null) return;
    setOrdersLoading(true);
    try {
      const [ordRes, earnRes] = await Promise.all([
        vendorPortal.orders({ eventId: selectedEventId }),
        vendorPortal.earnings(selectedEventId),
      ]);
      setOrders(ordRes.orders);
      setEarnings({
        grossRevenue: earnRes.grossRevenue,
        orderCount: earnRes.orderCount,
        activeOrders: earnRes.activeOrders,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorDash.loadFailed'));
    } finally {
      setOrdersLoading(false);
    }
  }, [selectedEventId, t]);

  const loadMenu = useCallback(async () => {
    try {
      const res = await vendorPortal.listMenuItems();
      setMenuItems(res.items);
    } catch {
      setMenuItems([]);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (selectedEventId == null) return;
    void loadOrders();
    void loadMenu();
    const id = window.setInterval(() => void loadOrders(), 20000);
    return () => clearInterval(id);
  }, [selectedEventId, loadOrders, loadMenu]);

  const handleStatus = async (order: VendorFoodOrder) => {
    const next = nextStatus(order);
    if (!next) return;
    setActionId(order.OrderID);
    try {
      await vendorPortal.updateOrderStatus(order.OrderID, next.status);
      toast.success(t('vendorDash.statusUpdated'));
      await loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorDash.error'));
    } finally {
      setActionId(null);
    }
  };

  const handleAddItem = async () => {
    const price = Number(itemPrice);
    if (!itemName.trim() || Number.isNaN(price) || selectedEventId == null) return;
    try {
      await vendorPortal.createMenuItem({
        Name: itemName.trim(),
        Price: price,
        EventID: selectedEventId,
        categoryName: itemCategory.trim() || 'Menu',
      });
      setItemName('');
      setItemPrice('');
      toast.success(t('vendorDash.itemAdded'));
      await loadMenu();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorDash.error'));
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) {
      toast.error(t('vendorDash.passwordRequired'));
      return;
    }
    if (newPwd.length < 8) {
      toast.error(t('vendorDash.passwordMin'));
      return;
    }
    if (!isValidPassword(newPwd)) {
      toast.error(t('vendorDash.passwordMix'));
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(t('vendorDash.passwordMismatch'));
      return;
    }
    setPwdBusy(true);
    try {
      await auth.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success(t('vendorDash.passwordUpdated'));
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorDash.error'));
    } finally {
      setPwdBusy(false);
    }
  };

  const posLines = useMemo(() => {
    return Object.entries(posCart)
      .map(([id, qty]) => {
        const item = menuItems.find((m) => m.FoodItemID === Number(id));
        if (!item || qty < 1) return null;
        return { item, qty, total: item.Price * qty };
      })
      .filter(Boolean) as Array<{ item: (typeof menuItems)[0]; qty: number; total: number }>;
  }, [posCart, menuItems]);

  const posTotal = posLines.reduce((s, l) => s + l.total, 0);

  const addToPos = (foodItemId: number) => {
    setPosCart((prev) => ({ ...prev, [foodItemId]: (prev[foodItemId] || 0) + 1 }));
  };

  const submitPos = async () => {
    if (selectedEventId == null || !posLines.length) return;
    setPosBusy(true);
    try {
      const res = await vendorPortal.createPosOrder({
        EventID: selectedEventId,
        items: posLines.map((l) => ({ foodItemId: l.item.FoodItemID, quantity: l.qty })),
        customerLabel: posCustomer.trim() || undefined,
        notes: posNotes.trim() || undefined,
        deliveryMethodCode: 'pickup',
        paymentMethod: 'cod',
      });
      toast.success(t('vendorDash.posOrderCreated', { id: res.order.OrderID }));
      setPosCart({});
      setPosCustomer('');
      setPosNotes('');
      await loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorDash.error'));
    } finally {
      setPosBusy(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t('vendorDash.loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-medium mb-1">
              {t('vendorDash.portal')}
            </p>
            <h1 className="text-2xl font-bold">{vendorName}</h1>
            {events.length > 1 ? (
              <div className="mt-2 max-w-xs">
                <Select
                  value={selectedEventId != null ? String(selectedEventId) : ''}
                  onValueChange={(v) => setSelectedEventId(Number(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('vendorDash.selectEvent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.EventID} value={String(ev.EventID)}>
                        {ev.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">
                {t('vendorDash.event')}: {selectedEvent?.Name ?? '—'}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadOrders()} disabled={ordersLoading}>
              <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">{t('vendorDash.mainSite')}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 me-1" />
              {t('nav.logOut')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="cosmic-panel rounded-xl p-4">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">EGP {(earnings?.grossRevenue ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('vendorDash.earnings')}</p>
          </div>
          <div className="cosmic-panel rounded-xl p-4">
            <ClipboardList className="h-5 w-5 text-secondary mb-2" />
            <p className="text-2xl font-bold">{earnings?.activeOrders ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t('vendorDash.activeOrders')}</p>
          </div>
          <div className="cosmic-panel rounded-xl p-4">
            <UtensilsCrossed className="h-5 w-5 text-accent mb-2" />
            <p className="text-2xl font-bold">{earnings?.orderCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t('vendorDash.completedOrders')}</p>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="orders">{t('vendorDash.tabOrders')}</TabsTrigger>
            <TabsTrigger value="pos">{t('vendorDash.tabPos')}</TabsTrigger>
            <TabsTrigger value="menu">{t('vendorDash.tabMenu')}</TabsTrigger>
            <TabsTrigger value="settings">{t('vendorDash.tabSettings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">{t('vendorDash.noOrders')}</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const next = nextStatus(order);
                  const deliveryLabel = order.isSeatDelivery
                    ? t('vendorDash.deliverySeat', { seat: order.seatLabel || '—' })
                    : t('vendorDash.deliveryPickup');
                  return (
                    <div key={order.OrderID} className="cosmic-panel rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {t('vendorDash.order')} #{order.OrderID}
                            {order.isPosOrder ? (
                              <span className="ms-2 text-xs font-normal text-primary">POS</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {order.Status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{deliveryLabel}</p>
                      <ul className="text-sm space-y-1">
                        {(order.items ?? []).map((line) => (
                          <li key={line.DetailID} className="flex justify-between gap-2">
                            <span>
                              {line.quantity}× {line.Name}
                            </span>
                            <span>EGP {line.lineTotal.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm font-medium">
                        {t('vendorDash.yourTotal')}: EGP{' '}
                        {(order.vendorSubtotal ?? order.subtotal).toLocaleString()}
                      </p>
                      {next ? (
                        <Button
                          size="sm"
                          disabled={actionId === order.OrderID}
                          onClick={() => void handleStatus(order)}
                        >
                          {actionId === order.OrderID
                            ? t('vendorDash.updating')
                            : t(next.labelKey)}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pos">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="cosmic-panel rounded-xl p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  {t('vendorDash.posMenu')}
                </h3>
                <div className="max-h-[360px] overflow-y-auto space-y-2">
                  {menuItems.filter((m) => m.availability !== false).map((item) => (
                    <button
                      key={item.FoodItemID}
                      type="button"
                      className="w-full flex justify-between items-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 text-start"
                      onClick={() => addToPos(item.FoodItemID)}
                    >
                      <span>{item.Name}</span>
                      <span className="font-medium">EGP {item.Price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="cosmic-panel rounded-xl p-4 space-y-4">
                <h3 className="font-semibold">{t('vendorDash.posCart')}</h3>
                {posLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('vendorDash.posEmpty')}</p>
                ) : (
                  <ul className="text-sm space-y-2">
                    {posLines.map((l) => (
                      <li key={l.item.FoodItemID} className="flex justify-between gap-2">
                        <span>
                          {l.qty}× {l.item.Name}
                        </span>
                        <span>EGP {l.total.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="font-semibold">
                  {t('vendorDash.posTotal')}: EGP {posTotal.toLocaleString()}
                </p>
                <Label className="text-xs">{t('vendorDash.posCustomer')}</Label>
                <Input
                  value={posCustomer}
                  onChange={(e) => setPosCustomer(e.target.value)}
                  placeholder={t('vendorDash.posCustomerPh')}
                />
                <Label className="text-xs">{t('vendorDash.posNotes')}</Label>
                <Input value={posNotes} onChange={(e) => setPosNotes(e.target.value)} />
                <Button
                  className="w-full"
                  disabled={posBusy || !posLines.length || selectedEventId == null}
                  onClick={() => void submitPos()}
                >
                  {posBusy ? t('vendorDash.posPlacing') : t('vendorDash.posSubmit')}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="menu">
            <div className="cosmic-panel rounded-xl p-6 space-y-4 mb-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <ChefHat className="h-5 w-5 text-primary" />
                {t('vendorDash.addItem')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <Input
                  placeholder={t('vendorDash.itemName')}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder={t('vendorDash.price')}
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                />
                <Input
                  placeholder={t('vendorDash.category')}
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                />
                <Button onClick={() => void handleAddItem()} disabled={!itemName.trim()}>
                  <Plus className="h-4 w-4 me-1" />
                  {t('vendorDash.add')}
                </Button>
              </div>
            </div>
            {menuItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t('vendorDash.noItems')}</p>
            ) : (
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li
                    key={item.FoodItemID}
                    className="cosmic-panel rounded-lg px-4 py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{item.Name}</p>
                      <p className="text-sm text-muted-foreground">
                        EGP {item.Price.toLocaleString()}
                        {!item.availability ? ` · ${t('vendorDash.unavailable')}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <div className="cosmic-panel rounded-xl p-6 max-w-md space-y-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <KeyRound className="h-5 w-5 text-primary" />
                {t('vendorDash.changePassword')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('vendorDash.changePasswordHint')}</p>
              <div className="space-y-2">
                <Label>{t('vendorDash.currentPassword')}</Label>
                <Input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vendorDash.newPassword')}</Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vendorDash.confirmPassword')}</Label>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button disabled={pwdBusy} onClick={() => void handleChangePassword()}>
                {pwdBusy ? t('vendorDash.savingPassword') : t('vendorDash.savePassword')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
