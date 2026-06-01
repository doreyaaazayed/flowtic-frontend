import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Mail, RefreshCw, Send, Trash2 } from 'lucide-react';
import {
  events as eventsApi,
  categories as categoriesApi,
  organizerInvitations,
  type EventInvitationRow,
} from '../../lib/api';
import {
  formatPhoneInput,
  isValidOptionalEgyptPhone,
} from '../../lib/authFieldValidation';
import { isPrivateEventCategory, privateEventKind } from '../../lib/privateEventCategories';
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
import { Switch } from '../ui/switch';

type PrivateEventRow = {
  _id: string;
  Name: string;
  CategoryID?: number;
  categoryName?: string;
};

export function OrganizerInvitationsPanel() {
  const { t } = useTranslation();
  const [allEvents, setAllEvents] = useState<
    Array<{ _id: string; Name: string; CategoryID?: number }>
  >([]);
  const [categories, setCategories] = useState<Array<{ CategoryID: number; Name: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [invitations, setInvitations] = useState<EventInvitationRow[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);

  const privateEvents = useMemo((): PrivateEventRow[] => {
    return allEvents
      .map((ev) => {
        const cat = categories.find((c) => c.CategoryID === ev.CategoryID);
        const categoryName = cat?.Name;
        if (!isPrivateEventCategory(ev.CategoryID, categoryName)) return null;
        return { ...ev, categoryName };
      })
      .filter(Boolean) as PrivateEventRow[];
  }, [allEvents, categories]);

  const selectedEvent = privateEvents.find((e) => e._id === selectedEventId);

  const loadEvents = useCallback(() => {
    eventsApi
      .my()
      .then((rows) => setAllEvents(Array.isArray(rows) ? rows : []))
      .catch(() => setAllEvents([]));
  }, []);

  const loadInvitations = useCallback(() => {
    if (!selectedEventId) {
      setInvitations([]);
      return;
    }
    setListLoading(true);
    organizerInvitations
      .list(selectedEventId)
      .then((res) => {
        setInvitations(res.invitations ?? []);
        setEmailConfigured(res.emailConfigured !== false);
      })
      .catch(() => {
        setInvitations([]);
        setEmailConfigured(true);
      })
      .finally(() => setListLoading(false));
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
    categoriesApi.list().then(setCategories).catch(() => setCategories([]));
  }, [loadEvents]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    if (privateEvents.length === 1 && !selectedEventId) {
      setSelectedEventId(privateEvents[0]._id);
    }
  }, [privateEvents, selectedEventId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast.error(t('creator.invitations.selectEvent'));
      return;
    }
    if (!guestName.trim()) {
      toast.error(t('creator.invitations.nameRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      toast.error(t('creator.invitations.emailInvalid'));
      return;
    }
    if (guestPhone.trim() && !isValidOptionalEgyptPhone(guestPhone)) {
      toast.error(t('creator.invitations.phoneInvalid'));
      return;
    }

    setLoading(true);
    try {
      const result = await organizerInvitations.send({
        eventMongoId: selectedEventId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() ? guestPhone.replace(/\D/g, '') : undefined,
        sendEmail,
      });
      if (result.emailSent) {
        toast.success(t('creator.invitations.sent'));
      } else if (sendEmail) {
        toast.error(result.emailError || t('creator.invitations.emailFailed'));
      } else {
        toast.success(t('creator.invitations.saved'));
      }
      setGuestName('');
      setGuestEmail('');
      setGuestPhone('');
      loadInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('creator.invitations.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success(t('creator.invitations.linkCopied')),
      () => toast.error(t('creator.invitations.copyFailed')),
    );
  };

  const handleResend = async (id: string) => {
    try {
      const result = await organizerInvitations.resend(id);
      if (result.emailSent) toast.success(t('creator.invitations.resent'));
      else toast.error(result.emailError || t('creator.invitations.emailFailed'));
      loadInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('creator.invitations.sendFailed'));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await organizerInvitations.remove(id);
      toast.success(t('creator.invitations.removed'));
      loadInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('creator.invitations.removeFailed'));
    }
  };

  const kindLabel = selectedEvent
    ? privateEventKind(selectedEvent.CategoryID, selectedEvent.categoryName)
    : null;

  return (
    <div className="space-y-6">
      <div className="admin-panel lg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t('creator.invitations.title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('creator.invitations.subtitle')}</p>
            {!emailConfigured && (
              <p className="text-sm text-destructive mt-2 font-medium">
                {t('creator.invitations.emailNotConfigured')}
              </p>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadEvents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('creator.invitations.refresh')}
          </Button>
        </div>

        {privateEvents.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center">{t('creator.invitations.noPrivateEvents')}</p>
        ) : (
          <>
            <div className="mb-6 max-w-md">
              <Label htmlFor="invite-event-select">{t('creator.invitations.eventLabel')}</Label>
              <Select value={selectedEventId || undefined} onValueChange={setSelectedEventId}>
                <SelectTrigger id="invite-event-select" className="mt-2">
                  <SelectValue placeholder={t('creator.invitations.selectEvent')} />
                </SelectTrigger>
                <SelectContent>
                  {privateEvents.map((ev) => (
                    <SelectItem key={ev._id} value={ev._id}>
                      {ev.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kindLabel && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t(`creator.invitations.kind.${kindLabel}`)}
                </p>
              )}
            </div>

            <form onSubmit={handleSend} className="grid gap-4 sm:grid-cols-2 max-w-2xl border border-border rounded-xl p-4 mb-8">
              <div className="sm:col-span-2">
                <p className="text-sm font-medium">{t('creator.invitations.addGuest')}</p>
              </div>
              <div>
                <Label htmlFor="invite-guest-name">{t('creator.invitations.guestName')}</Label>
                <Input
                  id="invite-guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="mt-1.5"
                  placeholder={t('creator.invitations.guestNamePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="invite-guest-email">{t('creator.invitations.guestEmail')}</Label>
                <Input
                  id="invite-guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="mt-1.5"
                  placeholder="guest@example.com"
                />
              </div>
              <div>
                <Label htmlFor="invite-guest-phone">{t('creator.invitations.guestPhone')}</Label>
                <Input
                  id="invite-guest-phone"
                  inputMode="numeric"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(formatPhoneInput(e.target.value))}
                  className="mt-1.5"
                  placeholder="01012345678"
                  maxLength={11}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch id="invite-send-email" checked={sendEmail} onCheckedChange={setSendEmail} />
                <Label htmlFor="invite-send-email">{t('creator.invitations.sendByEmail')}</Label>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={loading} className="gap-2">
                  <Send className="h-4 w-4" />
                  {loading ? t('creator.invitations.sending') : t('creator.invitations.sendInvite')}
                </Button>
              </div>
            </form>

            <div>
              <h4 className="font-semibold mb-3">{t('creator.invitations.sentList')}</h4>
              {listLoading ? (
                <p className="text-muted-foreground text-sm py-4">{t('creator.invitations.loading')}</p>
              ) : invitations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">{t('creator.invitations.noneYet')}</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((row) => (
                    <div
                      key={row._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.guestName}</p>
                        <p className="text-sm text-muted-foreground truncate">{row.guestEmail}</p>
                        {row.guestPhone && (
                          <p className="text-xs text-muted-foreground">{row.guestPhone}</p>
                        )}
                        <p className="text-xs mt-1">
                          <span
                            className={
                              row.status === 'sent'
                                ? 'text-emerald-600'
                                : row.status === 'failed'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                            }
                          >
                            {t(`creator.invitations.status.${row.status}`, row.status)}
                          </span>
                          {row.status === 'failed' && row.emailError && (
                            <span className="block text-destructive mt-1">{row.emailError}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button type="button" variant="outline" size="sm" onClick={() => copyLink(row.inviteUrl)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {t('creator.invitations.copyLink')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleResend(row._id)}>
                          <Mail className="h-3.5 w-3.5 mr-1" />
                          {t('creator.invitations.resend')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemove(row._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
