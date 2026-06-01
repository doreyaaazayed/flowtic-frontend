import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Plus, RefreshCw, Trash2, Upload, UserCheck } from 'lucide-react';
import {
  events as eventsApi,
  organizerUsher,
  type OrganizerUsherRow,
  type UsherActivityItem,
} from '../../lib/api';
import { formatPhoneInput, isValidOptionalEgyptPhone, phoneDigitsOnly } from '../../lib/authFieldValidation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type ProvisionResult = {
  credentials: { email: string; username: string; temporaryPassword: string } | null;
  usher: { Name: string; UsherID: number };
  linkedExisting?: boolean;
  emailSent?: boolean;
};

export function OrganizerUshersPanel() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [eventList, setEventList] = useState<
    Array<{ EventID?: number; Name: string; _id: string; entryGatingEnabled?: boolean }>
  >([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [lastProvision, setLastProvision] = useState<ProvisionResult | null>(null);
  const [ushers, setUshers] = useState<OrganizerUsherRow[]>([]);
  const [activity, setActivity] = useState<UsherActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityEventId, setActivityEventId] = useState<string>('all');
  const [bulkBusy, setBulkBusy] = useState(false);

  const [assignUsherId, setAssignUsherId] = useState<string | null>(null);
  const [assignEventMongo, setAssignEventMongo] = useState('');
  const [gateOptions, setGateOptions] = useState<Array<{ gateIndex: number; label: string }>>([]);
  const [selectedGates, setSelectedGates] = useState<number[]>([]);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);

  const [settingsEventMongo, setSettingsEventMongo] = useState('');
  const [manualFallback, setManualFallback] = useState(false);
  const [overridePin, setOverridePin] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);

  const gatingEvents = useMemo(
    () => eventList.filter((e) => e.EventID != null && e.entryGatingEnabled),
    [eventList],
  );

  const loadEvents = useCallback(() => {
    eventsApi
      .my()
      .then((rows) => setEventList(Array.isArray(rows) ? rows : []))
      .catch(() => setEventList([]));
  }, []);

  const loadUshers = useCallback(() => {
    setListLoading(true);
    organizerUsher
      .list()
      .then((r) => setUshers(r.ushers))
      .catch(() => setUshers([]))
      .finally(() => setListLoading(false));
  }, []);

  const loadActivity = useCallback(() => {
    setActivityLoading(true);
    const eventId = activityEventId !== 'all' ? Number(activityEventId) : undefined;
    organizerUsher
      .activity({ eventId, limit: 40 })
      .then((r) => setActivity(r.items || []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [activityEventId]);

  useEffect(() => {
    loadEvents();
    loadUshers();
  }, [loadEvents, loadUshers]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!assignEventMongo) {
      setGateOptions([]);
      setSelectedGates([]);
      return;
    }
    organizerUsher
      .eventGates(assignEventMongo)
      .then((r) => {
        setGateOptions(r.gates || []);
        const usher = ushers.find((u) => u.userId === assignUsherId);
        const ev = usher?.assignments.find((a) => a.eventMongoId === assignEventMongo);
        setSelectedGates(ev?.gateIndexes ?? []);
        const firstShift = ev?.shifts?.[0];
        setShiftStart(firstShift?.shiftStart ? firstShift.shiftStart.slice(0, 16) : '');
        setShiftEnd(firstShift?.shiftEnd ? firstShift.shiftEnd.slice(0, 16) : '');
      })
      .catch((e) => {
        setGateOptions([]);
        setSelectedGates([]);
        toast.error(e instanceof Error ? e.message : t('creator.ushers.gatesLoadError'));
      });
  }, [assignEventMongo, assignUsherId, ushers, t]);

  useEffect(() => {
    if (!settingsEventMongo) {
      setManualFallback(false);
      setOverridePin('');
      return;
    }
    organizerUsher
      .eventGates(settingsEventMongo)
      .then((r) => {
        setManualFallback(Boolean(r.usherManualFallbackEnabled));
        setOverridePin('');
      })
      .catch(() => {
        setManualFallback(false);
      });
  }, [settingsEventMongo]);

  const handleProvision = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error(t('creator.ushers.fillRequired'));
      return;
    }
    const ageNum = age.trim() ? Number(age) : undefined;
    if (ageNum != null && (!Number.isFinite(ageNum) || ageNum < 16)) {
      toast.error(t('creator.ushers.ageInvalid'));
      return;
    }
    const phoneNorm = phoneDigitsOnly(phone);
    if (!isValidOptionalEgyptPhone(phoneNorm)) {
      toast.error(t('auth.signup.errors.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const res = await organizerUsher.provision({
        Name: name.trim(),
        Email: email.trim(),
        Phone: phoneNorm || undefined,
        Age: ageNum,
        sendCredentialsEmail: sendEmail,
      });
      setLastProvision(res);
      setShowForm(false);
      toast.success(res.linkedExisting ? t('creator.ushers.linkedExisting') : t('creator.ushers.created'));
      setName('');
      setEmail('');
      setPhone('');
      setAge('');
      loadUshers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.ushers.error'));
    } finally {
      setLoading(false);
    }
  };

  const saveGateAssignment = async () => {
    if (!assignUsherId || !assignEventMongo || !selectedGates.length) {
      toast.error(t('creator.ushers.selectGates'));
      return;
    }
    const ev = eventList.find((e) => e._id === assignEventMongo);
    if (!ev?.EventID) return;
    setAssignBusy(true);
    try {
      await organizerUsher.assignGates(assignUsherId, {
        EventID: ev.EventID,
        gateIndexes: selectedGates,
        shiftStart: shiftStart ? new Date(shiftStart).toISOString() : undefined,
        shiftEnd: shiftEnd ? new Date(shiftEnd).toISOString() : undefined,
      });
      toast.success(t('creator.ushers.gatesSaved'));
      setAssignUsherId(null);
      setAssignEventMongo('');
      loadUshers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.ushers.gatesSaveError'));
    } finally {
      setAssignBusy(false);
    }
  };

  const saveEventSettings = async () => {
    if (!settingsEventMongo) return;
    setSettingsBusy(true);
    try {
      await organizerUsher.updateEventUsherSettings(settingsEventMongo, {
        usherManualFallbackEnabled: manualFallback,
        usherGateOverridePin: overridePin,
      });
      toast.success(t('creator.ushers.settingsSaved'));
      setOverridePin('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.ushers.settingsSaveError'));
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleBulkCsv = async (file: File) => {
    setBulkBusy(true);
    try {
      const csv = await file.text();
      const res = await organizerUsher.bulkProvision({ csv, sendCredentialsEmail: sendEmail });
      toast.success(t('creator.ushers.bulkDone', { created: res.created, failed: res.failed }));
      loadUshers();
      loadActivity();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.ushers.bulkError'));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeactivate = async (usherUserId: string) => {
    if (!window.confirm(t('creator.ushers.deactivateConfirm'))) return;
    try {
      await organizerUsher.deactivate(usherUserId);
      toast.success(t('creator.ushers.deactivated'));
      loadUshers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.ushers.deactivateError'));
    }
  };

  const handleResendCredentials = async (usherUserId: string) => {
    try {
      const res = await organizerUsher.sendCredentials(usherUserId);
      if (res.credentials) {
        setLastProvision({
          usher: { Name: '', UsherID: 0 },
          credentials: res.credentials,
          emailSent: res.emailSent,
        });
      }
      toast.success(res.emailSent ? t('creator.ushers.credentialsEmailed') : t('creator.ushers.credentialsReset'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('creator.ushers.credentialsError'));
    }
  };

  const copyCredentials = () => {
    if (!lastProvision?.credentials) return;
    const text = `${t('vendorAdmin.email')}: ${lastProvision.credentials.email}\n${t('vendorAdmin.password')}: ${lastProvision.credentials.temporaryPassword}`;
    void navigator.clipboard.writeText(text);
    toast.success(t('vendorAdmin.copied'));
  };

  const toggleGate = (gi: number) => {
    setSelectedGates((prev) =>
      prev.includes(gi) ? prev.filter((g) => g !== gi) : [...prev, gi].sort((a, b) => a - b),
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">{t('creator.ushers.tabTeam')}</TabsTrigger>
          <TabsTrigger value="activity">{t('creator.ushers.tabActivity')}</TabsTrigger>
          <TabsTrigger value="settings">{t('creator.ushers.tabSettings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6 mt-4">
          <div className="admin-panel lg-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <UserCheck className="h-5 w-5 text-primary" />
                  {t('creator.ushers.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('creator.ushers.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleBulkCsv(f);
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" className="gap-2" disabled={bulkBusy} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {bulkBusy ? t('creator.ushers.bulkImporting') : t('creator.ushers.bulkImport')}
                </Button>
                <Button
                  type="button"
                  className="gap-2 bg-gradient-to-r from-primary to-secondary"
                  onClick={() => setShowForm((v) => !v)}
                >
                  <Plus className="h-4 w-4" />
                  {showForm ? t('creator.ushers.cancelAdd') : t('creator.ushers.addUsher')}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t('creator.ushers.bulkHint')}</p>

            {gatingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                {t('creator.ushers.noGatingEvents')}
              </p>
            )}

            {showForm && (
              <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('creator.ushers.name')}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('creator.ushers.email')}</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('creator.ushers.phone')}</Label>
                    <Input value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} inputMode="numeric" maxLength={11} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('creator.ushers.age')}</Label>
                    <Input type="number" min={16} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                  {t('creator.ushers.sendCredentialsEmail')}
                </label>
                <Button type="button" disabled={loading} onClick={() => void handleProvision()}>
                  {loading ? t('creator.ushers.creating') : t('creator.ushers.createBtn')}
                </Button>
              </div>
            )}

            {lastProvision?.credentials && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                <p className="font-medium">{t('creator.ushers.credentialsHint')}</p>
                {lastProvision.emailSent && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs">{t('creator.ushers.credentialsEmailed')}</p>
                )}
                {lastProvision.linkedExisting && (
                  <p className="text-xs text-muted-foreground">{t('creator.ushers.linkedExisting')}</p>
                )}
                <p>
                  <span className="text-muted-foreground">{t('vendorAdmin.email')}:</span>{' '}
                  {lastProvision.credentials.email}
                </p>
                <p>
                  <span className="text-muted-foreground">{t('vendorAdmin.password')}:</span>{' '}
                  <code className="font-mono">{lastProvision.credentials.temporaryPassword}</code>
                </p>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyCredentials}>
                  <Copy className="h-4 w-4" />
                  {t('vendorAdmin.copyCredentials')}
                </Button>
              </div>
            )}
          </div>

          <div className="admin-panel lg-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-semibold">{t('creator.ushers.yourUshers')}</h4>
              <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={loadUshers}>
                <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
                {t('creator.ushers.refresh')}
              </Button>
            </div>

            {listLoading ? (
              <p className="text-sm text-muted-foreground">{t('creator.ushers.loading')}</p>
            ) : ushers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('creator.ushers.none')}</p>
            ) : (
              <ul className="space-y-3">
                {ushers.map((u) => (
                  <li key={u.userId} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold">{u.Name}</p>
                        <p className="text-sm text-muted-foreground">
                          {u.Email}
                          {u.Phone ? ` · ${u.Phone}` : ''}
                          {u.Age != null ? ` · ${t('creator.ushers.ageLabel', { age: u.Age })}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleResendCredentials(u.userId)}>
                          {t('creator.ushers.resetPassword')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignUsherId(u.userId);
                            setAssignEventMongo('');
                            setSelectedGates([]);
                          }}
                        >
                          {t('creator.ushers.assignGates')}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void handleDeactivate(u.userId)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {u.assignments.length > 0 ? (
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {u.assignments.map((a) => (
                          <li key={`${a.EventID}-${a.gateIndexes.join(',')}`}>
                            {a.eventName ?? `Event ${a.EventID}`}:{' '}
                            {a.gateIndexes.map((g) => `Gate ${g}`).join(', ')}
                            {a.shifts?.[0]?.shiftStart ? ` · ${t('creator.ushers.shiftSet')}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-700 dark:text-amber-300">{t('creator.ushers.noAssignments')}</p>
                    )}

                    {assignUsherId === u.userId && (
                      <div className="rounded-lg border border-primary/20 bg-muted/20 p-3 space-y-3">
                        <Label>{t('creator.ushers.selectEventForGates')}</Label>
                        <Select value={assignEventMongo} onValueChange={setAssignEventMongo}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('creator.ushers.pickEvent')} />
                          </SelectTrigger>
                          <SelectContent>
                            {gatingEvents.map((ev) => (
                              <SelectItem key={ev._id} value={ev._id}>
                                {ev.Name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {gateOptions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {gateOptions.map((g) => (
                              <label
                                key={g.gateIndex}
                                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedGates.includes(g.gateIndex)}
                                  onChange={() => toggleGate(g.gateIndex)}
                                />
                                {g.label}
                              </label>
                            ))}
                          </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t('creator.ushers.shiftStart')}</Label>
                            <Input type="datetime-local" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('creator.ushers.shiftEnd')}</Label>
                            <Input type="datetime-local" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" disabled={assignBusy} onClick={() => void saveGateAssignment()}>
                            {t('creator.ushers.saveGates')}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setAssignUsherId(null)}>
                            {t('creator.ushers.cancelAdd')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="admin-panel lg-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label>{t('creator.ushers.activityFilter')}</Label>
                <Select value={activityEventId} onValueChange={setActivityEventId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('creator.ushers.allEvents')}</SelectItem>
                    {gatingEvents.map((ev) => (
                      <SelectItem key={ev._id} value={String(ev.EventID)}>
                        {ev.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={loadActivity}>
                <RefreshCw className={`h-4 w-4 ${activityLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {activityLoading ? (
              <p className="text-sm text-muted-foreground">{t('creator.ushers.loading')}</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('creator.ushers.noActivity')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((row) => (
                  <li key={row.id} className="rounded-lg border border-border px-3 py-2 flex flex-wrap justify-between gap-2">
                    <span>
                      <span className={row.success ? 'text-emerald-600' : 'text-destructive'}>
                        {row.success ? '✓' : '✗'}
                      </span>{' '}
                      {row.usherName ?? row.usherEmail} · #{row.ticketId ?? '—'} · Gate {row.gateIndex ?? '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="admin-panel lg-card p-5 sm:p-6 space-y-4 max-w-lg">
            <h4 className="font-semibold">{t('creator.ushers.eventSettingsTitle')}</h4>
            <p className="text-sm text-muted-foreground">{t('creator.ushers.eventSettingsHint')}</p>
            <div className="space-y-2">
              <Label>{t('creator.ushers.selectEventForGates')}</Label>
              <Select value={settingsEventMongo} onValueChange={setSettingsEventMongo}>
                <SelectTrigger>
                  <SelectValue placeholder={t('creator.ushers.pickEvent')} />
                </SelectTrigger>
                <SelectContent>
                  {gatingEvents.map((ev) => (
                    <SelectItem key={ev._id} value={ev._id}>
                      {ev.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {settingsEventMongo && (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{t('creator.ushers.manualFallback')}</p>
                    <p className="text-xs text-muted-foreground">{t('creator.ushers.manualFallbackHint')}</p>
                  </div>
                  <Switch checked={manualFallback} onCheckedChange={setManualFallback} />
                </div>
                {manualFallback && (
                  <div className="space-y-2">
                    <Label>{t('creator.ushers.overridePin')}</Label>
                    <Input
                      type="password"
                      value={overridePin}
                      onChange={(e) => setOverridePin(e.target.value)}
                      placeholder={t('creator.ushers.overridePinPlaceholder')}
                    />
                  </div>
                )}
                <Button type="button" disabled={settingsBusy} onClick={() => void saveEventSettings()}>
                  {t('creator.ushers.saveSettings')}
                </Button>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
