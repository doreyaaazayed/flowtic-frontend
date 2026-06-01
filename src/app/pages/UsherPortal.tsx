import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, KeyRound, Loader2, LogOut, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { auth, usherPortal } from '../lib/api';
import { isValidPassword } from '../lib/authFieldValidation';
import { useAuth } from '../context/AuthContext';
import { UsherGateCheckIn } from '../components/UsherGateCheckIn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

type Assignment = {
  EventID: number;
  eventMongoId: string | null;
  eventName: string;
  gateIndex: number;
  gateLabel: string;
  manualFallbackEnabled?: boolean;
  shiftStart?: string | null;
  shiftEnd?: string | null;
};

function formatShift(start?: string | null, end?: string | null) {
  if (!start && !end) return null;
  const fmt = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';
  return `${fmt(start)} – ${fmt(end)}`;
}

export function UsherPortal() {
  const { t } = useTranslation();
  const { logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usherName, setUsherName] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tab, setTab] = useState('gate');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usherPortal.assignments();
      setUsherName(data.usher?.Name ?? '');
      setMustChangePassword(Boolean(data.mustChangePassword));
      const rows = (data.assignments || []).filter((a) => a.eventMongoId);
      setAssignments(rows);
      if (rows.length === 1) {
        const a = rows[0];
        setSelectedKey(`${a.eventMongoId}:${a.gateIndex}`);
      }
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (mustChangePassword) setTab('settings');
  }, [mustChangePassword]);

  const selected = assignments.find((a) => `${a.eventMongoId}:${a.gateIndex}` === selectedKey);

  const handleLogout = async () => {
    await logout();
    navigate('/signin', { replace: true });
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) {
      toast.error(t('usher.passwordRequired'));
      return;
    }
    if (newPwd.length < 8) {
      toast.error(t('usher.passwordTooShort'));
      return;
    }
    if (!isValidPassword(newPwd)) {
      toast.error(t('usher.passwordMix'));
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(t('usher.passwordMismatch'));
      return;
    }
    setPwdBusy(true);
    try {
      await auth.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success(t('usher.passwordUpdated'));
      setMustChangePassword(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      await refreshUser?.();
      setTab('gate');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('usher.passwordUpdateFailed'));
    } finally {
      setPwdBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background safe-area-pb">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignments.length && !mustChangePassword) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background text-center space-y-4 safe-area-pb">
        <DoorOpen className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t('usher.noAssignmentsTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-md">{t('usher.noAssignmentsBody')}</p>
        <Button type="button" variant="outline" onClick={() => void handleLogout()}>
          <LogOut className="h-4 w-4 mr-2" />
          {t('nav.logOut')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background safe-area-pb">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t('usher.portalLabel')}</p>
          <h1 className="font-semibold truncate">{usherName || t('usher.portalTitle')}</h1>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleLogout()} aria-label={t('nav.logOut')}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {mustChangePassword && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            {t('usher.mustChangePasswordHint')}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="gate" disabled={mustChangePassword}>
              {t('usher.tabGate')}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 className="h-4 w-4 mr-1.5" />
              {t('usher.tabSettings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gate" className="space-y-4 mt-0">
            {assignments.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{t('usher.selectPost')}</label>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={t('usher.pickPost')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={`${a.eventMongoId}:${a.gateIndex}`} value={`${a.eventMongoId}:${a.gateIndex}`}>
                        {a.eventName} — {a.gateLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selected?.shiftStart || selected?.shiftEnd ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
                {t('usher.shiftWindow')}: {formatShift(selected.shiftStart, selected.shiftEnd)}
              </p>
            ) : null}

            {selected?.eventMongoId && (
              <UsherGateCheckIn
                eventMongoId={selected.eventMongoId}
                gateIndex={selected.gateIndex}
                gateLabel={selected.gateLabel}
                eventName={selected.eventName}
                manualFallbackEnabled={Boolean(selected.manualFallbackEnabled)}
              />
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <KeyRound className="h-5 w-5 text-primary" />
                {t('usher.changePassword')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('usher.changePasswordHint')}</p>
              <div className="space-y-2">
                <Label>{t('vendorDash.currentPassword')}</Label>
                <Input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vendorDash.newPassword')}</Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vendorDash.confirmPassword')}</Label>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                  className="h-12"
                />
              </div>
              <Button type="button" className="w-full h-12" disabled={pwdBusy} onClick={() => void handleChangePassword()}>
                {pwdBusy ? t('vendorDash.savingPassword') : t('vendorDash.savePassword')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
