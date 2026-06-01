import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/Navbar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { Footer } from '../components/Footer';
import { shouldShowMobileBottomNav } from '../lib/mobileNav';
import { isNativeApp } from '../lib/nativeApp';
import { usePerformanceClass, isLitePerformance } from '../lib/performanceProfile';
import { PageTransition } from '../liquid/PageTransition';
import { LenisProvider } from '../cinematic/lenis/LenisProvider';
import { useAuth } from '../context/AuthContext';

const CinematicBackdrop = lazy(() =>
  import('../liquid/CinematicBackdrop').then((m) => ({ default: m.CinematicBackdrop })),
);
const Spotlight = lazy(() =>
  import('../liquid/Spotlight').then((m) => ({ default: m.Spotlight })),
);
function useFinePointerEffects() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    setEnabled(!reduced && fine);
  }, []);
  return enabled;
}

export function MainLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const showVerifyBanner = user && user.emailVerified === false;
  const fxEnabled = useFinePointerEffects();
  const showMobileNav = shouldShowMobileBottomNav(pathname);
  const nativeShell = isNativeApp();
  usePerformanceClass();

  if (user?.role === 'usher' && !pathname.startsWith('/usher')) {
    return <Navigate to="/usher" replace />;
  }

  return (
    <LenisProvider>
      <div className="relative flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <CinematicBackdrop intensity={isLitePerformance() ? 0.5 : 0.85} />
        </Suspense>
        {fxEnabled && (
          <Suspense fallback={null}>
            <Spotlight />
          </Suspense>
        )}

        <Navbar />

        {showVerifyBanner && (
          <div className="relative z-[1] mx-auto mt-3 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg-banner-gold flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm sm:gap-4">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{t('banner.verifyEmail')}</span>
              <Link
                to="/verify-email"
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t('banner.verifyNow')}
              </Link>
            </div>
          </div>
        )}

        <main
          className={`relative z-[1] flex-1 ${showMobileNav ? `pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] ${nativeShell ? '' : 'md:pb-0'}` : ''}`}
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        <Footer className={showMobileNav && !nativeShell ? 'hidden md:block' : undefined} />
        <MobileBottomNav />
      </div>
    </LenisProvider>
  );
}
