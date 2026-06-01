import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Plus, RefreshCw, Store } from 'lucide-react';
import { adminFood, events as eventsApi } from '../../lib/api';
import { formatPhoneInput, isValidOptionalEgyptPhone, phoneDigitsOnly } from '../../lib/authFieldValidation';
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

export function AdminVendorProvisionPanel() {
  const { t } = useTranslation();
  const [eventList, setEventList] = useState<Array<{ EventID?: number; Name: string; _id: string }>>([]);
  const [eventId, setEventId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastProvision, setLastProvision] = useState<ProvisionResult | null>(null);
  const [vendors, setVendors] = useState<
    Array<{ VendorID: number; Name: string; Email: string; EventID?: number; eventName?: string }>
  >([]);

  const loadEvents = useCallback(() => {
    eventsApi
      .list({ limit: 100 })
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setEventList(list.filter((e) => e.EventID != null && e.VenueID != null));
      })
      .catch(() => {});
  }, []);

  const loadVendors = useCallback(() => {
    adminFood
      .listVendors()
      .then((r) => setVendors(r.vendors))
      .catch(() => setVendors([]));
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
      const res = await adminFood.provisionVendor({
        Name: name.trim(),
        Email: email.trim(),
        Phone: phoneNorm || undefined,
        EventID: Number(eventId),
        restaurantName: restaurantName.trim() || undefined,
        sendCredentialsEmail: sendEmail,
      });
      setLastProvision(res);
      toast.success(t('vendorAdmin.created'));
      setName('');
      setEmail('');
      setPhone('');
      setRestaurantName('');
      loadVendors();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('vendorAdmin.error'));
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
    <div className="space-y-8">
      <div className="cosmic-panel rounded-2xl p-6 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Store className="h-5 w-5 text-primary" />
          {t('vendorAdmin.title')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('vendorAdmin.subtitle')}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t('vendorAdmin.event')}</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('vendorAdmin.selectEvent')} />
              </SelectTrigger>
              <SelectContent>
                {eventList.map((ev) => (
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

        <Button onClick={handleProvision} disabled={loading}>
          <Plus className="h-4 w-4 me-2" />
          {loading ? t('vendorAdmin.creating') : t('vendorAdmin.createBtn')}
        </Button>

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
                ) : sendEmail ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('vendorAdmin.emailNotSent')}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t('vendorAdmin.credentialsHint')}</p>
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

      <div className="cosmic-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('vendorAdmin.existing')}</h3>
          <Button variant="outline" size="sm" onClick={loadVendors}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('vendorAdmin.none')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {vendors.map((v) => (
              <li
                key={v.VendorID}
                className="flex flex-wrap justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span className="font-medium">{v.Name}</span>
                <span className="text-muted-foreground">{v.Email}</span>
                <span className="text-xs text-primary">
                  {v.eventName ?? '—'} {v.EventID != null ? `(#${v.EventID})` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
