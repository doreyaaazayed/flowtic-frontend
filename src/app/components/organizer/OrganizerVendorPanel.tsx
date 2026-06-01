import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Plus, RefreshCw, Store } from 'lucide-react';
import { events as eventsApi, organizerVendor } from '../../lib/api';
import { formatPhoneInput, isValidOptionalEgyptPhone, phoneDigitsOnly } from '../../lib/authFieldValidation';
import { formatEgp } from '../../data/eventSetupCatalogue';
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

type ProvisionResult = {
  credentials: { email: string; username: string; temporaryPassword: string } | null;
  createdNewAccount?: boolean;
  emailSent?: boolean;
  event: { EventID: number; Name: string };
  vendor: { Name: string; VendorID: number };
};

type VendorRow = {
  VendorID: number;
  Name: string;
  Email: string;
  EventID?: number;
  eventName?: string | null;
  eventStatus?: string | null;
  active: boolean;
  grossRevenue: number;
  orderCount: number;
  activeOrders: number;
};

const PROVISIONABLE_STATUSES = new Set(['Active', 'Completed']);

export function OrganizerVendorPanel() {
  const { t } = useTranslation();
  const [eventList, setEventList] = useState<
    Array<{ EventID?: number; Name: string; _id: string; VenueID?: number; Status?: string }>
  >([]);
  const [eventId, setEventId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [lastProvision, setLastProvision] = useState<ProvisionResult | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);

  const eligibleEvents = useMemo(
    () =>
      eventList.filter(
        (e) =>
          e.EventID != null &&
          e.VenueID != null &&
          PROVISIONABLE_STATUSES.has(String(e.Status || '')),
      ),
    [eventList],
  );

  const loadEvents = useCallback(() => {
    eventsApi
      .my()
      .then((rows) => setEventList(Array.isArray(rows) ? rows : []))
      .catch(() => setEventList([]));
  }, []);

  const loadVendors = useCallback(() => {
    setListLoading(true);
    organizerVendor
      .list()
      .then((r) => setVendors(r.vendors))
      .catch(() => setVendors([]))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
    loadVendors();
  }, [loadEvents, loadVendors]);

  const handleProvision = async () => {
    if (!name.trim() || !email.trim() || !eventId) {
      toast.error(t('vendorAdmin.fillRequired'));
      return;
    }
    const phoneNorm = phoneDigitsOnly(phone);
    if (!isValidOptionalEgyptPhone(phoneNorm)) {
      toast.error(t('auth.signup.errors.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const res = await organizerVendor.provision({
        Name: name.trim(),
        Email: email.trim(),
        Phone: phoneNorm || undefined,
        EventID: Number(eventId),
        restaurantName: restaurantName.trim() || undefined,
        sendCredentialsEmail: sendEmail,
      });
      setLastProvision(res);
      setShowForm(false);
      toast.success(t('creator.vendors.created'));
      setName('');
      setEmail('');
      setPhone('');
      setRestaurantName('');
      setEventId('');
      loadVendors();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.vendors.error'));
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!lastProvision?.credentials) return;
    const text = `${t('vendorAdmin.email')}: ${lastProvision.credentials.email}\n${t('vendorAdmin.password')}: ${lastProvision.credentials.temporaryPassword}`;
    void navigator.clipboard.writeText(text);
    toast.success(t('vendorAdmin.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="admin-panel lg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Store className="h-5 w-5 text-primary" />
              {t('creator.vendors.title')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('creator.vendors.subtitle')}</p>
          </div>
          <Button
            type="button"
            className="gap-2 bg-gradient-to-r from-primary to-secondary shrink-0"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            {showForm ? t('creator.vendors.cancelAdd') : t('creator.vendors.addVendor')}
          </Button>
        </div>

        {eligibleEvents.length === 0 && (
          <p className="text-sm text-muted-foreground rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            {t('creator.vendors.noEligibleEvents')}
          </p>
        )}

        {showForm && (
          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t('vendorAdmin.event')}</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('creator.vendors.selectEvent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEvents.map((ev) => (
                      <SelectItem key={ev._id} value={String(ev.EventID)}>
                        {ev.Name} (#{ev.EventID})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('vendorAdmin.vendorName')}</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>{t('vendorAdmin.email')}</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>{t('vendorAdmin.phone')}</Label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} inputMode="numeric" maxLength={11} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t('vendorAdmin.restaurantName')}</Label>
                <Input
                  className="mt-1"
                  placeholder={t('vendorAdmin.restaurantNameHint')}
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded border-border"
              />
              {t('vendorAdmin.sendCredentialsEmail')}
            </label>

            <Button onClick={handleProvision} disabled={loading || eligibleEvents.length === 0}>
              <Plus className="h-4 w-4 me-2" />
              {loading ? t('vendorAdmin.creating') : t('creator.vendors.createBtn')}
            </Button>
          </div>
        )}

        {lastProvision ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
            <p className="font-semibold">
              {lastProvision.createdNewAccount === false
                ? t('vendorAdmin.eventLinked')
                : t('vendorAdmin.credentialsTitle')}
            </p>
            <p>
              {t('vendorAdmin.event')}: {lastProvision.event.Name}
            </p>
            {lastProvision.credentials ? (
              <>
                <p>
                  {t('vendorAdmin.email')}: <code>{lastProvision.credentials.email}</code>
                </p>
                <p>
                  {t('vendorAdmin.password')}:{' '}
                  <code className="text-destructive">{lastProvision.credentials.temporaryPassword}</code>
                </p>
                {lastProvision.emailSent ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t('vendorAdmin.emailSent')}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t('creator.vendors.credentialsHint')}</p>
                <Button type="button" variant="outline" size="sm" onClick={copyCredentials}>
                  <Copy className="h-4 w-4 me-1" />
                  {t('vendorAdmin.copyCredentials')}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t('vendorAdmin.existingVendorHint')}</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="admin-panel lg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('creator.vendors.yourVendors')}</h3>
          <Button variant="outline" size="sm" onClick={loadVendors} disabled={listLoading}>
            <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {listLoading && vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('creator.vendors.loading')}</p>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('creator.vendors.none')}</p>
        ) : (
          <ul className="space-y-3">
            {vendors.map((v) => (
              <li
                key={v.VendorID}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-muted/30"
              >
                <div className="min-w-0">
                  <h4 className="font-semibold truncate">{v.Name}</h4>
                  <p className="text-sm text-muted-foreground truncate">{v.Email}</p>
                  <p className="text-xs text-primary mt-1">
                    {v.eventName ?? '—'}
                    {v.EventID != null ? ` (#${v.EventID})` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('creator.vendors.sales')}</p>
                    <p className="font-semibold tabular-nums">{formatEgp(v.grossRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('creator.vendors.orders')}</p>
                    <p className="font-semibold tabular-nums">{v.orderCount}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      v.active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-accent-orange/10 text-accent-orange'
                    }`}
                  >
                    {v.active ? t('creator.vendors.statusActive') : t('creator.vendors.statusInactive')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
