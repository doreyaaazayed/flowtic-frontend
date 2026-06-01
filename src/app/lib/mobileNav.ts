/** Routes where the fixed bottom tab bar should be hidden (immersive flows). */
export function shouldShowMobileBottomNav(pathname: string): boolean {
  if (pathname.startsWith('/purchase/')) return false;
  if (pathname.startsWith('/face-id-registration')) return false;
  if (pathname.includes('/food/checkout')) return false;
  if (pathname.startsWith('/auth/callback')) return false;
  if (
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/verify-email'
  ) {
    return false;
  }
  return true;
}

export function isNavActive(pathname: string, match: 'home' | 'discover' | 'resale' | 'tickets'): boolean {
  switch (match) {
    case 'home':
      return pathname === '/';
    case 'discover':
      return (
        pathname === '/events' ||
        pathname.startsWith('/event/') ||
        pathname === '/venues' ||
        pathname.startsWith('/venues')
      );
    case 'resale':
      return pathname === '/white-market' || pathname.startsWith('/resale/');
    case 'tickets':
      return pathname === '/dashboard' || pathname === '/profile' || pathname.startsWith('/food/orders');
    default:
      return false;
  }
}
