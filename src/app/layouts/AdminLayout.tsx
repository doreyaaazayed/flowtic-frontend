import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, ArrowLeft, LogOut, Mail, Crown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { LenisProvider } from '../cinematic/lenis/LenisProvider';
import {
  ADMIN_NAV_ITEMS,
  AdminSectionProvider,
  useAdminSection,
  type AdminSection,
} from '../context/AdminSectionContext';

function AdminSidebarNav({
  onNavigate,
  horizontal,
  onLogout,
}: {
  onNavigate?: () => void;
  horizontal?: boolean;
  onLogout?: () => void;
}) {
  const { t } = useTranslation();
  const { section, setSection } = useAdminSection();

  const labelFor = (id: AdminSection, fallback: string) => {
    if (id === 'venue-food') return t('adminFood.tab');
    if (id === 'create-event') return t('admin.nav.createEvent');
    return fallback;
  };

  const footerLinks = !horizontal && onLogout && (
    <>
      <div className="my-2 border-t border-sidebar-border" role="separator" />
      <Link to="/" className="admin-sidebar__link" onClick={() => onNavigate?.()}>
        <span className="admin-sidebar__dot opacity-0" aria-hidden />
        <ArrowLeft className="h-4 w-4 shrink-0 opacity-80" />
        <span className="truncate">Main site</span>
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
        <span className="truncate">Log out</span>
      </button>
    </>
  );

  return (
    <nav className={horizontal ? 'admin-mobile-nav__list flex gap-2' : 'admin-sidebar__nav flex flex-col gap-1 p-3'}>
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = section === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSection(item.id);
              onNavigate?.();
            }}
            className={horizontal ? `admin-mobile-nav__pill ${active ? 'admin-mobile-nav__pill--active' : ''}` : `admin-sidebar__link ${active ? 'admin-sidebar__link--active' : ''}`}
          >
            {!horizontal && <span className="admin-sidebar__dot" aria-hidden />}
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate">{labelFor(item.id, item.label)}</span>
          </button>
        );
      })}
      {footerLinks}
    </nav>
  );
}

function AdminShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { section } = useAdminSection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showVerifyBanner = user && user.emailVerified === false;

  const activeItem = ADMIN_NAV_ITEMS.find((item) => item.id === section);

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
            background: 'radial-gradient(circle, rgba(244,63,94,0.16), transparent 70%)',
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

      <aside className="admin-sidebar hidden lg:flex lg:flex-col lg:w-[248px] xl:w-[260px] shrink-0 relative z-10">
        <div className="admin-sidebar__brand p-5 pb-4">
          <Link to="/admin" className="flex items-center gap-3">
            <span className="admin-sidebar__logo inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <Shield className="h-5 w-5 text-white" strokeWidth={2.4} />
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
                Admin Portal
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Mission Control</p>
            </div>
          </Link>
        </div>
        <AdminSidebarNav onLogout={handleLogout} />
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
              <span>Verify your email to access full admin controls.</span>
              <Link to="/verify-email" className="font-semibold underline underline-offset-2 hover:no-underline">
                Verify now
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
                aria-label="Open admin menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
                <h1 className="truncate text-lg sm:text-xl font-semibold">
                  {section === 'overview'
                    ? t('admin.title')
                    : section === 'create-event'
                      ? t('admin.nav.createEvent')
                      : activeItem?.label ?? t('admin.title')}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <div className="admin-user-chip hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-semibold text-white">
                  {(user?.username ?? 'A').charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium max-w-[140px] truncate">{user?.username ?? 'Admin'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-mobile-nav lg:hidden px-4 sm:px-6 pb-2">
          <div className="admin-mobile-nav__scroll overflow-x-auto pb-1">
            <AdminSidebarNav horizontal />
          </div>
        </div>

        <main className="flex-1 px-4 pb-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground">
          <Crown className="inline h-3 w-3 align-text-bottom text-[#f0c674]" /> FlowTic Admin · Privileged access
        </footer>
      </div>

      {mobileOpen && (
        <div className="admin-drawer lg:hidden">
          <button type="button" className="admin-drawer__backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="admin-drawer__panel">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <p className="font-semibold text-foreground">Admin menu</p>
              <button type="button" className="admin-icon-btn" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <AdminSidebarNav onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminLayout() {
  return (
    <LenisProvider>
      <AdminSectionProvider>
        <AdminShell />
      </AdminSectionProvider>
    </LenisProvider>
  );
}
