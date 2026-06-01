import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowLeft, LogOut, Mail, Menu, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserNavAvatar } from '../components/UserNavAvatar';
import { useAuth } from '../context/AuthContext';
import { LenisProvider } from '../cinematic/lenis/LenisProvider';
import {
  USER_NAV_ITEMS,
  UserSectionProvider,
  useUserSection,
  parseUserSection,
} from '../context/UserSectionContext';

function UserSidebarNav({
  onNavigate,
  horizontal,
  onLogout,
}: {
  onNavigate?: () => void;
  horizontal?: boolean;
  onLogout?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { section, setSection } = useUserSection();

  const goSection = (id: (typeof USER_NAV_ITEMS)[number]['id']) => {
    setSection(id);
    const base = location.pathname === '/dashboard' ? '/dashboard' : '/profile';
    navigate(`${base}?section=${id}`, { replace: true });
    onNavigate?.();
  };

  const footerLinks = !horizontal && onLogout && (
    <>
      <div className="my-2 border-t border-sidebar-border" role="separator" />
      <Link to="/" className="admin-sidebar__link" onClick={() => onNavigate?.()}>
        <span className="admin-sidebar__dot opacity-0" aria-hidden />
        <ArrowLeft className="h-4 w-4 shrink-0 opacity-80" />
        <span className="truncate">{t('userPortal.mainSite')}</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          onLogout();
          onNavigate?.();
        }}
        className="admin-sidebar__link w-full text-left"
      >
        <span className="admin-sidebar__dot opacity-0" aria-hidden />
        <LogOut className="h-4 w-4 shrink-0 opacity-80" />
        <span className="truncate">{t('nav.logOut')}</span>
      </button>
    </>
  );

  return (
    <nav className={horizontal ? 'admin-mobile-nav__list flex gap-2' : 'admin-sidebar__nav flex flex-col gap-1 p-3'}>
      {USER_NAV_ITEMS.map((item) => {
        const active = section === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => goSection(item.id)}
            className={
              horizontal
                ? `admin-mobile-nav__pill ${active ? 'admin-mobile-nav__pill--active' : ''}`
                : `admin-sidebar__link ${active ? 'admin-sidebar__link--active' : ''}`
            }
          >
            {!horizontal && <span className="admin-sidebar__dot" aria-hidden />}
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate">{t(item.labelKey)}</span>
          </button>
        );
      })}
      {footerLinks}
    </nav>
  );
}

export function UserPortalLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { section } = useUserSection();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = USER_NAV_ITEMS.find((item) => item.id === section);
  const showVerifyBanner = user && user.emailVerified === false;

  const sectionTitle = (() => {
    if (section === 'profile') return t('profile.title');
    if (section === 'tickets') return t('dashboard.myTickets');
    return activeItem ? t(activeItem.labelKey) : t('dashboard.title');
  })();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative flex min-h-dvh text-foreground">
      <div aria-hidden className="admin-ambient pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-40 top-0 h-[480px] w-[480px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.16), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <aside className="admin-sidebar hidden lg:flex lg:flex-col lg:w-[248px] xl:w-[260px] shrink-0 relative z-10 lg:h-dvh lg:max-h-dvh lg:sticky lg:top-0 lg:overflow-y-auto">
        <div className="admin-sidebar__brand p-5 pb-4">
          <Link to="/profile" className="flex items-center gap-3">
            <span className="admin-sidebar__logo inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 leading-tight">
              <p
                className="text-sm font-bold tracking-tight"
                style={{
                  background: 'var(--grad-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                FlowTic
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('userPortal.subtitle')}
              </p>
            </div>
          </Link>
        </div>
        <UserSidebarNav onLogout={handleLogout} />
      </aside>

      <div className="admin-main relative z-10 flex min-w-0 flex-1 flex-col">
        {showVerifyBanner && (
          <div
            className="mx-4 mt-3 rounded-2xl border px-4 py-2.5 text-sm sm:mx-6"
            style={{
              borderColor: 'rgba(251,191,36,0.35)',
              background: 'rgba(251,191,36,0.08)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              color: '#fcd34d',
            }}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{t('banner.verifyEmail')}</span>
              <Link to="/verify-email" className="font-semibold underline underline-offset-2 hover:no-underline">
                {t('banner.verifyNow')}
              </Link>
            </div>
          </div>
        )}

        <header className="admin-topbar sticky top-0 z-20 px-4 py-4 sm:px-6 lg:px-8">
          <div className="admin-topbar__inner flex items-center justify-between gap-4 rounded-[1.35rem] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="admin-icon-btn lg:hidden"
                aria-label={t('userPortal.openMenu')}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t('userPortal.label')}</p>
                <h1 className="truncate text-lg sm:text-xl font-semibold">{sectionTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {user && (
                <Link to="/profile" className="admin-user-chip hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5">
                  <UserNavAvatar user={user} size="md" />
                  <span className="text-sm font-medium max-w-[140px] truncate">{user.username}</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="admin-mobile-nav lg:hidden px-4 sm:px-6 pb-2">
          <div className="admin-mobile-nav__scroll overflow-x-auto pb-1">
            <UserSidebarNav horizontal />
          </div>
        </div>

        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-8">
          {children ?? <Outlet />}
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 align-text-bottom text-primary" /> FlowTic · {t('userPortal.footer')}
        </footer>
      </div>

      {mobileOpen && (
        <div className="admin-drawer lg:hidden">
          <button
            type="button"
            className="admin-drawer__backdrop"
            aria-label={t('userPortal.closeMenu')}
            onClick={() => setMobileOpen(false)}
          />
          <div className="admin-drawer__panel">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <p className="font-semibold text-foreground">{t('userPortal.menu')}</p>
              <button type="button" className="admin-icon-btn" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <UserSidebarNav onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
          </div>
        </div>
      )}
    </div>
  );
}

export function UserPortalShell({
  children,
  initialSection,
}: {
  children: React.ReactNode;
  initialSection?: import('../context/UserSectionContext').UserSection;
}) {
  return (
    <UserSectionProvider initialSection={initialSection}>
      <UserPortalLayout>{children}</UserPortalLayout>
    </UserSectionProvider>
  );
}

function UserPortalSectionSync() {
  const location = useLocation();
  const { setSection } = useUserSection();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('section') ?? params.get('tab');
    if (fromQuery) {
      setSection(parseUserSection(fromQuery));
      return;
    }
    if (location.pathname === '/profile') {
      setSection('profile');
    }
  }, [location.pathname, location.search, setSection]);

  return null;
}

function UserPortalShellInner() {
  return (
    <>
      <UserPortalSectionSync />
      <UserPortalLayout />
    </>
  );
}

/** Standalone layout route — full-height sidebar (no main site navbar). */
export function UserPortalLayoutRoute() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('section') ?? params.get('tab');
  const initialSection = fromQuery
    ? parseUserSection(fromQuery)
    : location.pathname === '/profile'
      ? 'profile'
      : 'tickets';

  return (
    <LenisProvider>
      <UserSectionProvider initialSection={initialSection}>
        <UserPortalShellInner />
      </UserSectionProvider>
    </LenisProvider>
  );
}
