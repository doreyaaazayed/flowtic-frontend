import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Ticket,
  Store,
  Menu,
  MapPin,
  UtensilsCrossed,
  ScanFace,
  LogOut,
  User,
  UserPlus,
  LayoutDashboard,
  Shield,
  ScanLine,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { isNativeApp } from '../lib/nativeApp';
import { isNavActive, shouldShowMobileBottomNav } from '../lib/mobileNav';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';

const tabs = [
  { id: 'home' as const, to: '/', icon: Home, i18nKey: 'mobileNav.home' },
  { id: 'discover' as const, to: '/events', icon: Compass, i18nKey: 'mobileNav.discover' },
  { id: 'resale' as const, to: '/white-market', icon: Store, i18nKey: 'mobileNav.resale' },
  { id: 'tickets' as const, to: '/profile?section=tickets', icon: Ticket, i18nKey: 'mobileNav.tickets' },
];

type MoreLink = {
  to: string;
  icon: typeof Home;
  labelKey: string;
  roles?: Array<'organizer' | 'admin' | 'vendor' | 'usher'>;
};

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!shouldShowMobileBottomNav(pathname)) return null;

  const moreLinks: MoreLink[] = [{ to: '/venues', icon: MapPin, labelKey: 'nav.venues' }];
  if (user) {
    moreLinks.push(
      { to: '/profile', icon: User, labelKey: 'mobileNav.profile' },
      { to: '/food/orders', icon: UtensilsCrossed, labelKey: 'mobileNav.foodOrders' },
      { to: '/face-id-registration', icon: ScanFace, labelKey: 'mobileNav.faceId' },
    );
  }

  if (user?.role === 'organizer' || user?.role === 'admin') {
    moreLinks.push({
      to: '/creator',
      icon: LayoutDashboard,
      labelKey: 'nav.organizerPortal',
      roles: ['organizer', 'admin'],
    });
  }
  if (user?.role === 'admin') {
    moreLinks.push({ to: '/admin', icon: Shield, labelKey: 'nav.adminPortal', roles: ['admin'] });
  }
  if (user?.role === 'vendor') {
    moreLinks.push({ to: '/vendor', icon: Store, labelKey: 'nav.vendor', roles: ['vendor'] });
  }
  if (user?.role === 'usher') {
    moreLinks.push({ to: '/usher', icon: ScanLine, labelKey: 'usher.portalTitle', roles: ['usher'] });
  }

  const nativeShell = isNativeApp();

  const handleLogout = () => {
    setMoreOpen(false);
    logout();
    navigate('/');
  };

  return (
    <>
      <nav
        className={`mobile-bottom-nav fixed inset-x-0 bottom-0 z-[55] ${nativeShell ? '' : 'md:hidden'}`}
        aria-label={t('mobileNav.aria')}
      >
        <div className="mobile-bottom-nav__inner mx-auto flex max-w-lg items-stretch justify-around gap-0.5 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isNavActive(pathname, tab.id);
            return (
              <Link
                key={tab.id}
                to={tab.to}
                className="mobile-bottom-nav__tab flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors"
                data-active={active ? 'true' : 'false'}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className="truncate leading-tight">{t(tab.i18nKey)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="mobile-bottom-nav__tab flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors"
            data-active={moreOpen ? 'true' : 'false'}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="truncate leading-tight">{t('mobileNav.more')}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="mobile-more-sheet z-[60] max-h-[min(85dvh,520px)] rounded-t-[1.75rem] border-t pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>{t('mobileNav.moreTitle')}</SheetTitle>
            <SheetDescription>{t('mobileNav.moreDesc')}</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-2 px-4 pb-2">
            {moreLinks.map((item) => {
              if (
                item.roles &&
                user &&
                !item.roles.includes(user.role as 'organizer' | 'admin' | 'vendor' | 'usher')
              ) {
                return null;
              }
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium text-foreground transition-colors active:bg-white/10"
                  style={{ borderColor: 'var(--lg-border)' }}
                >
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(59,130,246,0.25))',
                    }}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="mt-2 flex flex-col gap-2 border-t px-4 pt-4" style={{ borderColor: 'var(--lg-border)' }}>
            {user ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t('mobileNav.signedInAs', { name: user.username || user.email || '—' })}
                </p>
                <button type="button" onClick={handleLogout} className="lg-btn lg-btn--ghost w-full">
                  <LogOut className="h-4 w-4" />
                  {t('nav.logOut')}
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" onClick={() => setMoreOpen(false)} className="lg-btn w-full">
                  <User className="h-4 w-4" />
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMoreOpen(false)}
                  className="lg-btn lg-btn--ghost w-full"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('nav.signUp')}
                </Link>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
