import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { UserNavAvatar } from './UserNavAvatar';
import { Magnetic } from '../liquid/Magnetic';

const navLinks = [
  { to: '/events', i18nKey: 'nav.discover' },
  { to: '/venues', i18nKey: 'nav.venues' },
  { to: '/white-market', i18nKey: 'nav.resale' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    let raf = 0;
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(() => {
        setScrolled((prev) => {
          const y = window.scrollY;
          if (!prev && y > 24) return true;
          if (prev && y < 6) return false;
          return prev;
        });
        pending = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header
      className="sticky top-0 z-[50] pt-2 pb-1 sm:pt-4 sm:pb-3"
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      <div className="mx-auto px-3 sm:px-6 lg:px-8">
        <nav
          className="lg-nav-pill relative mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-full border px-3 py-1.5 sm:px-4 sm:py-2"
          data-scrolled={scrolled ? 'true' : 'false'}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            data-scrolled={scrolled ? 'true' : 'false'}
            style={{
              padding: '1px',
              background:
                'linear-gradient(135deg, rgba(168,85,247,0.7), rgba(59,130,246,0.5) 50%, rgba(240,198,116,0.55))',
              WebkitMask:
                'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              opacity: scrolled ? 0.9 : 0.5,
              transition: 'opacity 420ms cubic-bezier(0.22,1,0.36,1)',
            }}
          />

          <Magnetic strength={10}>
            <Link to="/" className="group relative z-[1] flex min-w-0 items-center">
              <span className="navbar-brand-logo-wrap inline-flex overflow-hidden rounded-[10px]">
                <img
                  src="/flowtic-logo.png?v=2"
                  alt={t('brand.name')}
                  className="navbar-brand-logo h-10 w-auto max-w-[140px] object-contain object-left sm:h-11 sm:max-w-[168px]"
                  decoding="async"
                />
              </span>
            </Link>
          </Magnetic>

          {/* Desktop nav */}
          <ul className="relative z-[1] hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      color: active ? '#ffffff' : 'var(--muted-foreground)',
                    }}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(168,85,247,0.6), rgba(59,130,246,0.5))',
                          boxShadow:
                            '0 1px 0 0 rgba(255,255,255,0.4) inset, 0 8px 22px -8px rgba(168,85,247,0.5)',
                        }}
                      />
                    )}
                    <span className="relative">{t(link.i18nKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop actions */}
          <div className="relative z-[1] hidden items-center gap-1.5 md:flex">
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell enabled={Boolean(user)} />
            {user ? (
              <>
                <Link
                  to="/profile"
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-white/5 ${
                    isActive('/profile') ? 'bg-white/10' : ''
                  }`}
                  style={{ borderColor: 'var(--lg-border-strong)' }}
                >
                  <UserNavAvatar user={user} />
                  <span className="hidden lg:inline">{user.username || t('nav.dashboard')}</span>
                </Link>
                {user.role === 'vendor' && (
                  <Link
                    to="/vendor"
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t('nav.vendor')}
                  </Link>
                )}
                {(user.role === 'organizer' || user.role === 'admin') && (
                  <Link
                    to="/creator"
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t('nav.organizer')}
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="lg-btn lg-btn--ghost"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t('nav.dashboard')}
                </Link>
                <Magnetic strength={6}>
                  <Link to="/signin" className="lg-btn" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
                    <User className="h-4 w-4" />
                    {t('nav.signIn')}
                  </Link>
                </Magnetic>
              </>
            )}
          </div>

          {/* Mobile: search + account + settings (bottom nav handles main sections) */}
          <div className="relative z-[1] flex items-center gap-0.5 md:hidden">
            <Link
              to="/events"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors active:bg-white/10"
              aria-label={t('nav.search')}
            >
              <Search className="h-5 w-5" />
            </Link>
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell enabled={Boolean(user)} />
            <Link
              to={user ? '/profile' : '/signin'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-foreground"
              style={{ borderColor: 'var(--lg-border)' }}
              aria-label={user ? t('mobileNav.profile') : t('nav.signIn')}
            >
              {user ? (
                <UserNavAvatar user={user} />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
