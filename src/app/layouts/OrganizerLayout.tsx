import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ArrowLeft, LogOut, Mail, Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { LenisProvider } from '../cinematic/lenis/LenisProvider';
import {
  ORGANIZER_NAV_ITEMS,
  OrganizerSectionProvider,
  useOrganizerSection,
  type OrganizerDashboardSection,
  type OrganizerNavItem,
} from '../context/OrganizerSectionContext';

function isRouteNavActive(item: Extract<OrganizerNavItem, { kind: 'route' }>, pathname: string) {
  return item.matchPrefix ? pathname.startsWith(item.path) : pathname === item.path;
}

function OrganizerSidebarNav({
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
  const { section, setSection } = useOrganizerSection();

  const goSection = (id: OrganizerDashboardSection) => {
    if (location.pathname !== '/creator') {
      navigate('/creator');
    }
    setSection(id);
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
      {ORGANIZER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const label = t(item.labelKey);

        if (item.kind === 'route') {
          const active = isRouteNavActive(item, location.pathname);
          if (horizontal) {
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onNavigate?.()}
                className={`admin-mobile-nav__pill ${active ? 'admin-mobile-nav__pill--active' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="truncate">{label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onNavigate?.()}
              className={`admin-sidebar__link ${active ? 'admin-sidebar__link--active' : ''}`}
            >
              <span className="admin-sidebar__dot" aria-hidden />
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="truncate">{label}</span>
            </Link>
          );
        }

        const active = location.pathname === '/creator' && section === item.id;
        if (horizontal) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goSection(item.id)}
              className={`admin-mobile-nav__pill ${active ? 'admin-mobile-nav__pill--active' : ''}`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="truncate">{label}</span>
            </button>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => goSection(item.id)}
            className={`admin-sidebar__link ${active ? 'admin-sidebar__link--active' : ''}`}
          >
            <span className="admin-sidebar__dot" aria-hidden />
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
      {footerLinks}
    </nav>
  );
}

function pageTitle(pathname: string, sectionLabel: string, t: (key: string) => string): string {
  if (pathname.startsWith('/creator/entry')) return t('creator.nav.gateTools');
  if (pathname.includes('/catalogue')) return t('creator.catalogue.title');
  if (pathname.includes('/deposit')) return t('creator.deposit.title');
  if (pathname.includes('/edit')) return t('creator.edit.title');
  if (pathname === '/creator') return sectionLabel;
  return t('creator.title');
}

function OrganizerShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { section } = useOrganizerSection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showVerifyBanner = user && user.emailVerified === false;

  const activeSectionItem = ORGANIZER_NAV_ITEMS.find(
    (item) => item.kind === 'section' && item.id === section,
  );
  const sectionLabel =
    activeSectionItem && activeSectionItem.kind === 'section'
      ? t(activeSectionItem.labelKey)
      : t('creator.title');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative flex min-h-screen text-foreground">
      <div aria-hidden className="admin-ambient pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -left-40 top-0 h-[480px] w-[480px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.16), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <aside className="admin-sidebar hidden lg:flex lg:flex-col lg:w-[248px] xl:w-[260px] shrink-0 relative z-10">
        <div className="admin-sidebar__brand p-5 pb-4">
          <Link to="/creator" className="flex items-center gap-3">
            <span className="admin-sidebar__logo inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <Calendar className="h-5 w-5 text-white" strokeWidth={2.4} />
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
                {t('nav.organizerPortal')}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                FlowTic Studio
              </p>
            </div>
          </Link>
        </div>
        <OrganizerSidebarNav onLogout={handleLogout} />
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
              <span>{t('creator.verifyEmailBanner')}</span>
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
                aria-label={t('creator.openMenu')}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t('creator.portalLabel')}
                </p>
                <h1 className="truncate text-lg sm:text-xl font-semibold">
                  {pageTitle(location.pathname, sectionLabel, t)}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <div className="admin-user-chip hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-semibold text-white">
                  {(user?.username ?? 'O').charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium max-w-[140px] truncate">{user?.username ?? 'Organizer'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-mobile-nav lg:hidden px-4 sm:px-6 pb-2">
          <div className="admin-mobile-nav__scroll overflow-x-auto pb-1">
            <OrganizerSidebarNav horizontal />
          </div>
        </div>

        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 align-text-bottom text-[#c084fc]" /> FlowTic Studio ·{' '}
          {t('creator.footer')}
        </footer>
      </div>

      {mobileOpen && (
        <div className="admin-drawer lg:hidden">
          <button
            type="button"
            className="admin-drawer__backdrop"
            aria-label={t('creator.closeMenu')}
            onClick={() => setMobileOpen(false)}
          />
          <div className="admin-drawer__panel">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <p className="font-semibold text-foreground">{t('creator.menu')}</p>
              <button type="button" className="admin-icon-btn" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <OrganizerSidebarNav onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizerLayout() {
  return (
    <LenisProvider>
      <OrganizerSectionProvider>
        <OrganizerShell />
      </OrganizerSectionProvider>
    </LenisProvider>
  );
}
