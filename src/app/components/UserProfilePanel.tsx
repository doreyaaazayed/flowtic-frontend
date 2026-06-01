import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Camera,
  Mail,
  Shield,
  ScanFace,
  Crown,
  User as UserIcon,
  Building2,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { profile as profileApi, type UserProfileDetail } from '../lib/api';
import {
  formatPhoneInput,
  isValidEgyptPhone,
  phoneDigitsOnly,
} from '../lib/authFieldValidation';
import { profileInitials, resolveProfilePhotoSrc } from '../lib/profileImage';
import { useAuth } from '../context/AuthContext';

function ReadOnlyField({ label, value, hint }: { label: string; value?: string | null; hint?: string }) {
  return (
    <div>
      <p className="form-label-cosmic mb-1">{label}</p>
      <p className="text-sm text-foreground py-2 px-3 rounded-xl bg-muted/30 border border-border min-h-[2.5rem] flex items-center">
        {value?.trim() ? value : '—'}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function UserProfilePanel({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { user: authUser, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<UserProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [orgName, setOrgName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');

  const applyProfile = useCallback((p: UserProfileDetail) => {
    setData(p);
    setFirstName(p.FirstName ?? '');
    setLastName(p.LastName ?? '');
    setUsername(p.username ?? '');
    setEmail(p.email ?? '');
    setPhone(p.Phone ?? '');
    setAddress(p.Address ?? '');
    setCity(p.City ?? '');
    setOrgName(p.OrgName ?? '');
    setContactInfo(p.ContactInfo ?? '');
    setDescription(p.Description ?? '');
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await profileApi.get();
      applyProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const photoSrc = resolveProfilePhotoSrc(data?.profilePhotoUrl);
  const initials = profileInitials(firstName, lastName, data?.username ?? authUser?.username);
  const isOrganizer = data?.role === 'organizer' || authUser?.role === 'organizer';

  const handlePhotoPick = async (file: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setError(t('profile.invalidPhotoType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.photoTooLarge'));
      return;
    }
    setPhotoBusy(true);
    setError(null);
    try {
      const res = await profileApi.uploadPhoto(file);
      applyProfile(res.profile);
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoSrc) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const res = await profileApi.removePhoto();
      applyProfile(res.profile);
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);
    const phoneNorm = phoneDigitsOnly(phone);
    if (phoneNorm && !isValidEgyptPhone(phoneNorm)) {
      setError(t('auth.signup.errors.invalidPhone'));
      setSaving(false);
      return;
    }
    try {
      const updated = await profileApi.update({
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        FirstName: firstName.trim() || undefined,
        LastName: lastName.trim() || undefined,
        Phone: phoneNorm || undefined,
        Address: address.trim() || undefined,
        City: city.trim() || undefined,
        OrgName: orgName.trim() || undefined,
        ContactInfo: contactInfo.trim() || undefined,
        Description: description.trim() || undefined,
      });
      applyProfile(updated);
      await refreshUser();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={embedded ? '' : 'min-h-[50vh] flex items-center justify-center'}>
        <p className="text-muted-foreground">{t('profile.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-1">{t('dashboard.profile')}</p>
          <h1 className="cosmic-display text-2xl md:text-3xl">{t('profile.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="lg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative">
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-2 border-primary/30 shadow-lg">
                {photoSrc ? (
                  <AvatarImage src={photoSrc} alt={t('profile.photoAlt')} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary to-secondary text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                aria-label={t('profile.changePhoto')}
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = '';
                  void handlePhotoPick(f);
                }}
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={photoBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoBusy ? t('profile.uploading') : t('profile.uploadPhoto')}
              </Button>
              {photoSrc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={photoBusy}
                  onClick={() => void handleRemovePhoto()}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('profile.removePhoto')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full space-y-3 text-center sm:text-left">
            <h2 className="text-xl font-semibold truncate">
              {[firstName, lastName].filter(Boolean).join(' ') || data?.username || '—'}
            </h2>
            <p className="text-muted-foreground text-sm">@{username || data?.username || authUser?.username}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium capitalize">
                <UserIcon className="h-3.5 w-3.5" />
                {data?.role ?? authUser?.role}
              </span>
              {data?.loyaltyTier && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs font-medium capitalize">
                  <Crown className="h-3.5 w-3.5" />
                  {data.loyaltyTier} · {data.loyaltyPointsBalance ?? 0} pts
                </span>
              )}
              {data?.faceEnrolled && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-medium">
                  <ScanFace className="h-3.5 w-3.5" />
                  Face ID
                </span>
              )}
            </div>
            {email && (
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2 pt-1">
                <Mail className="h-4 w-4 shrink-0" />
                {email}
                {data?.emailVerified === false && (
                  <span className="text-amber-500 text-xs">({t('profile.emailUnverified')})</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg-card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            {t('profile.personalInfo')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-first-name" className="form-label-cosmic">{t('profile.firstName')}</label>
              <input id="profile-first-name" className="input-cosmic w-full mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="profile-last-name" className="form-label-cosmic">{t('profile.lastName')}</label>
              <input id="profile-last-name" className="input-cosmic w-full mt-1" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </div>
          </div>
          <div>
            <label htmlFor="profile-phone" className="form-label-cosmic">{t('profile.phone')}</label>
            <input id="profile-phone" className="input-cosmic w-full mt-1" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} autoComplete="tel" inputMode="numeric" maxLength={11} pattern="01[0-9]{9}" />
          </div>
          <div>
            <label htmlFor="profile-city" className="form-label-cosmic">{t('profile.city')}</label>
            <input id="profile-city" className="input-cosmic w-full mt-1" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </div>
          <div>
            <label htmlFor="profile-address" className="form-label-cosmic">{t('profile.address')}</label>
            <textarea id="profile-address" className="input-cosmic w-full mt-1 min-h-[80px] resize-y" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="lg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {t('profile.accountInfo')}
            </h3>
            <div>
              <label htmlFor="profile-username" className="form-label-cosmic">{t('profile.username')}</label>
              <input
                id="profile-username"
                className="input-cosmic w-full mt-1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="form-label-cosmic">{t('profile.email')}</label>
              <input
                id="profile-email"
                type="email"
                className="input-cosmic w-full mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {(data?.emailVerified === false ||
                email.trim().toLowerCase() !== (data?.email ?? '').trim().toLowerCase()) && (
                <p className="text-xs text-amber-500 mt-1.5">
                  {t('profile.emailChangeHint')}{' '}
                  <Link to="/verify-email" className="underline font-medium">{t('profile.verifyEmail')}</Link>
                </p>
              )}
            </div>
            <ReadOnlyField label={t('profile.nationalId')} value={data?.nationalId} hint={t('profile.lockedFieldHint')} />
            <ReadOnlyField
              label={t('profile.dateOfBirth')}
              value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : undefined}
              hint={t('profile.lockedFieldHint')}
            />
            <ReadOnlyField
              label={t('profile.memberSince')}
              value={data?.memberSince ? new Date(data.memberSince).toLocaleDateString() : undefined}
            />
          </div>

          {isOrganizer && (
            <div className="lg-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {t('profile.organizerInfo')}
              </h3>
              <div>
                <label htmlFor="profile-org-name" className="form-label-cosmic">{t('profile.orgName')}</label>
                <input id="profile-org-name" className="input-cosmic w-full mt-1" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="profile-contact" className="form-label-cosmic">{t('profile.contactInfo')}</label>
                <input id="profile-contact" className="input-cosmic w-full mt-1" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
              </div>
              <div>
                <label htmlFor="profile-desc" className="form-label-cosmic">{t('profile.description')}</label>
                <textarea id="profile-desc" className="input-cosmic w-full mt-1 min-h-[80px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {(data?.organizationName || data?.organizationLocation) && (
                <div className="rounded-xl bg-muted/20 border border-border p-3 text-sm space-y-1">
                  {data.organizationName && <p><span className="text-muted-foreground">{t('profile.registeredOrg')}:</span> {data.organizationName}</p>}
                  {data.organizationLocation && <p><span className="text-muted-foreground">{t('profile.orgLocation')}:</span> {data.organizationLocation}</p>}
                </div>
              )}
            </div>
          )}

          <div className="lg-card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <ScanFace className="h-4 w-4 text-primary" />
              {t('profile.faceId')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {data?.faceEnrolled ? t('profile.faceEnrolledHint') : t('profile.faceNotEnrolledHint')}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/face-id-registration">{data?.faceEnrolled ? t('profile.manageFaceId') : t('profile.setupFaceId')}</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="bg-gradient-to-r from-primary to-secondary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? t('profile.saving') : t('profile.saveChanges')}
        </Button>
        {success && <span className="text-sm text-primary">{t('profile.saved')}</span>}
      </div>
    </div>
  );
}
