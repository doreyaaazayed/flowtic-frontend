import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User as UserIcon,
  Users,
  Phone,
  CreditCard,
  Calendar as CalendarIcon,
  Building2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import type { RegisterPayload } from '../lib/api';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import {
  formatPhoneInput,
  isValidEmail,
  isValidEgyptPhone,
  isValidPassword,
  phoneDigitsOnly,
} from '../lib/authFieldValidation';

const NATIONAL_ID_LENGTH = 14;
const MIN_AGE = 16;
const MAX_ORG_DOC_MB = 2;

function getAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'attendee' | 'creator'>('attendee');
  const [organizerKind, setOrganizerKind] = useState<'individual' | 'organization'>('individual');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationLocation, setOrganizationLocation] = useState('');
  const [commercialRegDataUrl, setCommercialRegDataUrl] = useState<string | null>(null);
  const [taxCardDataUrl, setTaxCardDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const today = new Date();
  const defaultMonth = new Date(today.getFullYear() - 25, today.getMonth(), 1);
  const birthYearFrom = today.getFullYear() - 120;
  const birthYearTo = today.getFullYear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError(t('auth.signup.errors.invalidEmail'));
      return;
    }
    const phoneNormalized = phoneDigitsOnly(phone);
    if (!isValidEgyptPhone(phoneNormalized)) {
      setError(t('auth.signup.errors.invalidPhone'));
      return;
    }
    if (!isValidPassword(password)) {
      setError(t('auth.signup.errors.invalidPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.signup.errors.passwordsMismatch'));
      return;
    }
    const nationalIdDigits = nationalId.replace(/\D/g, '');
    if (nationalIdDigits.length !== NATIONAL_ID_LENGTH) {
      setError(t('auth.signup.errors.nationalIdLength', { n: NATIONAL_ID_LENGTH }));
      return;
    }
    if (!dateOfBirth) {
      setError(t('auth.signup.errors.dobRequired'));
      return;
    }
    const age = getAge(dateOfBirth);
    if (age < MIN_AGE) {
      setError(t('auth.signup.errors.minAge', { min: MIN_AGE }));
      return;
    }
    if (role === 'creator' && organizerKind === 'organization') {
      if (!organizationName.trim() || organizationName.trim().length < 2) {
        setError(t('auth.signup.errors.orgName'));
        return;
      }
      if (!organizationLocation.trim() || organizationLocation.trim().length < 2) {
        setError(t('auth.signup.errors.orgLocation'));
        return;
      }
      if (!commercialRegDataUrl || !commercialRegDataUrl.startsWith('data:image/')) {
        setError(t('auth.signup.errors.commercialRegRequired'));
        return;
      }
      if (!taxCardDataUrl || !taxCardDataUrl.startsWith('data:image/')) {
        setError(t('auth.signup.errors.taxCardRequired'));
        return;
      }
    }
    const payload: RegisterPayload = {
      firstName,
      lastName,
      email: email.trim(),
      password,
      phone: phoneNormalized,
      nationalId: nationalIdDigits,
      dateOfBirth,
      role: role === 'creator' ? 'organizer' : 'attendee',
    };
    if (role === 'creator') {
      payload.organizerType = organizerKind;
      if (organizerKind === 'organization') {
        payload.organizationName = organizationName.trim();
        payload.organizationLocation = organizationLocation.trim();
        payload.commercialRegistrationDoc = commercialRegDataUrl!;
        payload.taxCardDoc = taxCardDataUrl!;
      }
    }
    setLoading(true);
    try {
      await register(payload);
      navigate('/face-id-registration', {
        replace: true,
        state: { signupFlow: true, signupEmail: email },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signup.errors.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div
            className="relative overflow-hidden rounded-[2rem] border p-8 md:p-10"
            style={{
              background: 'rgba(8,9,18,0.6)',
              backdropFilter: 'blur(18px) saturate(1.7)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.7)',
              borderColor: 'var(--lg-border-strong)',
              boxShadow: 'var(--lg-shadow)',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(500px 240px at 0% 0%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(500px 240px at 100% 100%, rgba(59,130,246,0.14), transparent 60%)',
              }}
            />
            <div className="relative">
          <div className="mb-8">
            <span className="lg-chip lg-chip--neon mb-4 inline-flex">
              <Sparkles className="h-3.5 w-3.5" /> {t('auth.signup.chip')}
            </span>
            <h1 className="display-2 text-balance">
              <Trans
                i18nKey="auth.signup.headline"
                components={{ accent: <span className="text-luxe" /> }}
              />
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {t('auth.signup.subtitle')}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="signup-given-name" className="form-label-cosmic">
                  {t('auth.signup.firstName')}
                </label>
                <div className="relative">
                  <UserIcon className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="signup-given-name"
                    name="given_name"
                    autoComplete="given-name"
                    type="text"
                    placeholder={t('auth.signup.firstNamePlaceholder')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="input-cosmic input-has-leading-icon w-full"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="signup-family-name" className="form-label-cosmic">
                  {t('auth.signup.lastName')}
                </label>
                <div className="relative">
                  <UserIcon className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="signup-family-name"
                    name="family_name"
                    autoComplete="family-name"
                    type="text"
                    placeholder={t('auth.signup.lastNamePlaceholder')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="input-cosmic input-has-leading-icon w-full"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="form-label-cosmic">
                {t('auth.signup.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="signup-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  className="input-cosmic input-has-leading-icon w-full"
                />
              </div>
            </div>

            {/* Phone & Date of Birth */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="signup-phone" className="form-label-cosmic">
                  {t('auth.signup.phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    id="signup-phone"
                    name="tel"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={t('auth.signup.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    required
                    minLength={11}
                    maxLength={11}
                    pattern="01[0-9]{9}"
                    title={t('auth.signup.errors.invalidPhone')}
                    className="input-cosmic input-has-leading-icon w-full"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="signup-dob-trigger" className="form-label-cosmic">
                  {t('auth.signup.dob')}
                </label>
                <input type="hidden" name="bday" value={dateOfBirth} readOnly />
                <Popover open={dobPickerOpen} onOpenChange={setDobPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      id="signup-dob-trigger"
                      type="button"
                      className="cosmic-dob-trigger"
                      aria-expanded={dobPickerOpen}
                    >
                      <CalendarIcon className="w-5 h-5 shrink-0 text-muted-foreground" />
                      <span className={dateOfBirth ? 'text-foreground' : 'text-muted-foreground truncate'}>
                        {dateOfBirth ? format(new Date(dateOfBirth), 'PPP') : t('auth.signup.selectDate')}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto max-w-[min(100vw-2rem,20rem)] overflow-hidden p-0 rounded-xl border shadow-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={dateOfBirth ? new Date(dateOfBirth) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setDateOfBirth(format(date, 'yyyy-MM-dd'));
                          setDobPickerOpen(false);
                        }
                      }}
                      disabled={{ after: today }}
                      defaultMonth={dateOfBirth ? new Date(dateOfBirth) : defaultMonth}
                      captionLayout="dropdown-buttons"
                      fromYear={birthYearFrom}
                      toYear={birthYearTo}
                      initialFocus
                      className="rounded-xl border-0 p-4"
                    />
                  </PopoverContent>
                </Popover>
                {dateOfBirth && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {getAge(dateOfBirth) < MIN_AGE
                      ? t('auth.signup.mustBe', { min: MIN_AGE })
                      : t('auth.signup.yearsOld', { age: getAge(dateOfBirth) })}
                  </p>
                )}
              </div>
            </div>

            {/* National ID */}
            <div>
              <label htmlFor="signup-national-id" className="form-label-cosmic">
                {t('auth.signup.nationalId')}
              </label>
              <div className="relative">
                <CreditCard className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="signup-national-id"
                  name="national_id"
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={NATIONAL_ID_LENGTH}
                  placeholder={t('auth.signup.nationalIdPlaceholder')}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, NATIONAL_ID_LENGTH))}
                  required
                  className="input-cosmic input-has-leading-icon w-full"
                />
              </div>
              {nationalId.length > 0 && nationalId.replace(/\D/g, '').length !== NATIONAL_ID_LENGTH && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('auth.signup.nationalIdProgress', {
                    count: nationalId.replace(/\D/g, '').length,
                    total: NATIONAL_ID_LENGTH,
                  })}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-new-password" className="form-label-cosmic">
                {t('auth.signup.password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="signup-new-password"
                  name="new-password"
                  autoComplete="new-password"
                  type="password"
                  placeholder={t('auth.signup.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="input-cosmic input-has-leading-icon w-full"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm-password" className="form-label-cosmic">
                {t('auth.signup.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 z-[1] w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  id="signup-confirm-password"
                  name="confirm_password"
                  autoComplete="new-password"
                  type="password"
                  placeholder={t('auth.signup.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-cosmic input-has-leading-icon w-full"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="form-label-cosmic mb-3">{t('auth.signup.iWantTo')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole('attendee');
                    setCommercialRegDataUrl(null);
                    setTaxCardDataUrl(null);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-start ${
                    role === 'attendee'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <UserIcon className={`w-6 h-6 mb-2 ${role === 'attendee' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm">{t('auth.signup.attendEvents')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('auth.signup.attendEventsDesc')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('creator')}
                  className={`p-4 rounded-xl border-2 transition-all text-start ${
                    role === 'creator'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Users className={`w-6 h-6 mb-2 ${role === 'creator' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm">{t('auth.signup.createEvents')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('auth.signup.createEventsDesc')}</p>
                </button>
              </div>
            </div>

            {role === 'creator' && (
              <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
                <p className="text-sm font-medium">{t('auth.signup.organizerType')}</p>
                <RadioGroup
                  value={organizerKind}
                  onValueChange={(v) => setOrganizerKind(v as 'individual' | 'organization')}
                  className="grid gap-3"
                >
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="individual" id="org-individual" className="mt-1" />
                    <div className="grid gap-1">
                      <Label htmlFor="org-individual" className="font-medium cursor-pointer">
                        {t('auth.signup.individual')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.signup.individualDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="organization" id="org-organization" className="mt-1" />
                    <div className="grid gap-1">
                      <Label htmlFor="org-organization" className="font-medium cursor-pointer">
                        {t('auth.signup.organization')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.signup.organizationDesc')}
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {organizerKind === 'organization' && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div>
                      <Label htmlFor="signup-org-name" className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t('auth.signup.organizationName')}
                      </Label>
                      <input
                        id="signup-org-name"
                        name="organization"
                        autoComplete="organization"
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder={t('auth.signup.organizationNamePlaceholder')}
                        className="input-cosmic mt-2 w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-org-location" className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t('auth.signup.location')}
                      </Label>
                      <input
                        id="signup-org-location"
                        name="organization_location"
                        autoComplete="address-line1"
                        type="text"
                        value={organizationLocation}
                        onChange={(e) => setOrganizationLocation(e.target.value)}
                        placeholder={t('auth.signup.locationPlaceholder')}
                        className="input-cosmic mt-2 w-full"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-commercial-reg" className="text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {t('auth.signup.commercialReg')}
                        </Label>
                        <input
                          id="signup-commercial-reg"
                          name="commercial_registration"
                          type="file"
                          accept="image/*"
                          className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-primary-foreground"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file || !file.type.startsWith('image/')) {
                              setError(t('auth.signup.errors.commercialRegImage'));
                              return;
                            }
                            if (file.size > MAX_ORG_DOC_MB * 1024 * 1024) {
                              setError(t('auth.signup.errors.docTooBig', { mb: MAX_ORG_DOC_MB }));
                              return;
                            }
                            setError('');
                            const reader = new FileReader();
                            reader.onload = () => setCommercialRegDataUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        {commercialRegDataUrl && (
                          <p className="text-xs text-primary mt-1">{t('auth.signup.documentAttached')}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="signup-tax-card" className="text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {t('auth.signup.taxCard')}
                        </Label>
                        <input
                          id="signup-tax-card"
                          name="tax_card"
                          type="file"
                          accept="image/*"
                          className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-primary-foreground"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file || !file.type.startsWith('image/')) {
                              setError(t('auth.signup.errors.taxCardImage'));
                              return;
                            }
                            if (file.size > MAX_ORG_DOC_MB * 1024 * 1024) {
                              setError(t('auth.signup.errors.docTooBig', { mb: MAX_ORG_DOC_MB }));
                              return;
                            }
                            setError('');
                            const reader = new FileReader();
                            reader.onload = () => setTaxCardDataUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        {taxCardDataUrl && <p className="text-xs text-primary mt-1">{t('auth.signup.documentAttached')}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="flex items-start gap-2 text-sm">
              <input
                id="signup-accept-terms"
                name="accept_terms"
                type="checkbox"
                className="rounded border-border mt-1 shrink-0"
              />
              <label htmlFor="signup-accept-terms" className="text-muted-foreground cursor-pointer">
                {t('auth.signup.agreeTo')}{' '}
                <a href="#" className="text-primary hover:underline">{t('auth.signup.terms')}</a>
                {' '}{t('auth.signup.and')}{' '}
                <a href="#" className="text-primary hover:underline">{t('auth.signup.privacy')}</a>
              </label>
            </div>

            {/* Sign Up Button */}
            <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-gradient-to-r from-primary to-secondary">
              {loading ? t('auth.signup.creatingAccount') : t('auth.signup.createAccount')}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 cosmic-mono text-[var(--star-mute)] text-[10px] tracking-widest uppercase bg-[rgba(8,11,26,0.85)] backdrop-blur-sm rounded-full py-1">{t('auth.signup.orSignUpWith')}</span>
            </div>
          </div>

          <SocialAuthButtons returnTo="/dashboard" />

          {/* Sign In Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t('auth.signup.hasAccount')}{' '}
            <Link to="/signin" className="text-primary font-medium hover:underline">
              {t('auth.signup.signInLink')}
            </Link>
          </p>
          </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Cinematic aside */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden p-12 lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-20 top-10 h-96 w-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.45), transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
          <div
            className="absolute -right-10 bottom-10 h-96 w-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
          <div
            className="absolute right-20 top-1/3 h-72 w-72 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(240,198,116,0.18), transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>
        <div className="relative max-w-lg">
          <div className="mb-9">
            <span className="lg-chip lg-chip--gold mb-5 inline-flex">
              <Sparkles className="h-3.5 w-3.5" /> {t('auth.signup.side.chip')}
            </span>
            <h2 className="display-2 text-balance">
              <Trans
                i18nKey="auth.signup.side.headline"
                components={{ accent: <span className="text-luxe" /> }}
              />
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('auth.signup.side.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { number: '50K+', label: t('auth.signup.side.stats.events') },
              { number: '2M+', label: t('auth.signup.side.stats.attendees') },
              { number: '98%', label: t('auth.signup.side.stats.satisfaction') },
              { number: '24/7', label: t('auth.signup.side.stats.concierge') },
            ].map((stat) => (
              <div key={stat.label} className="lg-card p-4 text-center">
                <p
                  className="text-3xl font-extrabold tracking-[-0.02em]"
                  style={{
                    background: 'var(--grad-text)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.number}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
