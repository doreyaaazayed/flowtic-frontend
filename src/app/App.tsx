import { lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanDevBanner } from './components/LanDevBanner';
import { RequireRole } from './components/RequireRole';
import { RequireSignedIn } from './components/RequireSignedIn';
import { Toaster } from './components/ui/sonner';
import { GlobalLoadingIndicator } from './components/GlobalLoadingIndicator';
import { PageLoader } from './components/PageLoader';
import { LanguageProvider } from './i18n/LanguageProvider';

const MainLayout = lazy(() =>
  import('./layouts/MainLayout').then((m) => ({ default: m.MainLayout })),
);
const OrganizerLayout = lazy(() =>
  import('./layouts/OrganizerLayout').then((m) => ({ default: m.OrganizerLayout })),
);
const UserPortalLayout = lazy(() =>
  import('./layouts/UserPortalLayout').then((m) => ({ default: m.UserPortalLayoutRoute })),
);
const AdminLayout = lazy(() =>
  import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const EventsDiscovery = lazy(() =>
  import('./pages/EventsDiscovery').then((m) => ({ default: m.EventsDiscovery })),
);
const VenuesDiscovery = lazy(() =>
  import('./pages/VenuesDiscovery').then((m) => ({ default: m.VenuesDiscovery })),
);
const EventDetails = lazy(() =>
  import('./pages/EventDetails').then((m) => ({ default: m.EventDetails })),
);
const TicketPurchase = lazy(() =>
  import('./pages/TicketPurchase').then((m) => ({ default: m.TicketPurchase })),
);
const WhiteMarket = lazy(() =>
  import('./pages/WhiteMarket').then((m) => ({ default: m.WhiteMarket })),
);
const ResalePayment = lazy(() =>
  import('./pages/ResalePayment').then((m) => ({ default: m.ResalePayment })),
);
const FoodMenuPage = lazy(() =>
  import('./pages/FoodMenuPage').then((m) => ({ default: m.FoodMenuPage })),
);
const FoodCheckoutPage = lazy(() =>
  import('./pages/FoodCheckoutPage').then((m) => ({ default: m.FoodCheckoutPage })),
);
const FoodOrdersPage = lazy(() =>
  import('./pages/FoodOrdersPage').then((m) => ({ default: m.FoodOrdersPage })),
);
const FoodOrderDetailPage = lazy(() =>
  import('./pages/FoodOrderDetailPage').then((m) => ({ default: m.FoodOrderDetailPage })),
);
const FoodOrderEditPage = lazy(() =>
  import('./pages/FoodOrderEditPage').then((m) => ({ default: m.FoodOrderEditPage })),
);
const UserDashboard = lazy(() =>
  import('./pages/UserDashboard').then((m) => ({ default: m.UserDashboard })),
);
const UserProfilePage = lazy(() =>
  import('./pages/UserProfilePage').then((m) => ({ default: m.UserProfilePage })),
);
const EventCreatorDashboard = lazy(() =>
  import('./pages/EventCreatorDashboard').then((m) => ({
    default: m.EventCreatorDashboard,
  })),
);
const EventSetupCatalogue = lazy(() =>
  import('./pages/EventSetupCatalogue').then((m) => ({
    default: m.EventSetupCatalogue,
  })),
);
const EventSetupDepositCheckout = lazy(() =>
  import('./pages/EventSetupDepositCheckout').then((m) => ({
    default: m.EventSetupDepositCheckout,
  })),
);
const EventEditPage = lazy(() =>
  import('./pages/EventEditPage').then((m) => ({ default: m.EventEditPage })),
);
const OrganizerEntryStaffHome = lazy(() =>
  import('./pages/OrganizerEntryStaffHome').then((m) => ({ default: m.OrganizerEntryStaffHome })),
);
const OrganizerEntryStaffTools = lazy(() =>
  import('./pages/OrganizerEntryStaffTools').then((m) => ({ default: m.OrganizerEntryStaffTools })),
);
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const VendorDashboard = lazy(() =>
  import('./pages/VendorDashboard').then((m) => ({ default: m.VendorDashboard })),
);
const UsherPortal = lazy(() =>
  import('./pages/UsherPortal').then((m) => ({ default: m.UsherPortal })),
);
const SignIn = lazy(() => import('./pages/SignIn').then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => import('./pages/SignUp').then((m) => ({ default: m.SignUp })));
const OAuthCallback = lazy(() =>
  import('./pages/OAuthCallback').then((m) => ({ default: m.OAuthCallback })),
);
const VerifyEmail = lazy(() =>
  import('./pages/VerifyEmail').then((m) => ({ default: m.VerifyEmail })),
);
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
);
const FaceIDRegistration = lazy(() =>
  import('./pages/FaceIDRegistration').then((m) => ({ default: m.FaceIDRegistration })),
);
/** /events/:id was used in some links; canonical route is /event/:id */
function RedirectEventsIdToEvent() {
  const { id } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/event/${id}${search}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="flowtic-theme">
      <LanguageProvider>
      <Router>
        <div className="relative min-h-dvh text-foreground bg-background">
          <AuthProvider>
            <LanDevBanner />
            <Toaster richColors />
            <GlobalLoadingIndicator />
          <Suspense fallback={<PageLoader fullScreen />}>
            <Routes>
              <Route path="/creator-dashboard" element={<Navigate to="/creator" replace />} />
              <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />

              <Route path="/creator" element={<OrganizerLayout />}>
                <Route
                  index
                  element={
                    <RequireRole allowedRoles={['organizer', 'admin']} requireOrganizerApproval>
                      <EventCreatorDashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="catalogue"
                  element={
                    <RequireRole allowedRoles={['organizer', 'admin']} requireOrganizerApproval>
                      <EventSetupCatalogue />
                    </RequireRole>
                  }
                />
                <Route
                  path="events/:eventId/deposit"
                  element={
                    <RequireRole allowedRoles={['organizer', 'admin']} requireOrganizerApproval>
                      <EventSetupDepositCheckout />
                    </RequireRole>
                  }
                />
                <Route
                  path="events/:eventId/edit"
                  element={
                    <RequireRole allowedRoles={['organizer', 'admin']} requireOrganizerApproval>
                      <EventEditPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="entry"
                  element={
                    <RequireRole allowedRoles={['organizer', 'admin']} requireOrganizerApproval>
                      <Outlet />
                    </RequireRole>
                  }
                >
                  <Route index element={<OrganizerEntryStaffHome />} />
                  <Route path=":eventMongoId" element={<OrganizerEntryStaffTools />} />
                </Route>
              </Route>

              <Route path="/admin" element={<AdminLayout />}>
                <Route
                  index
                  element={
                    <RequireRole allowedRoles={['admin']}>
                      <AdminDashboard />
                    </RequireRole>
                  }
                />
              </Route>

              <Route element={<UserPortalLayout />}>
                <Route
                  path="/dashboard"
                  element={
                    <RequireSignedIn>
                      <UserDashboard />
                    </RequireSignedIn>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireSignedIn>
                      <UserProfilePage />
                    </RequireSignedIn>
                  }
                />
              </Route>

              <Route
                path="/usher"
                element={
                  <RequireRole allowedRoles={['usher']}>
                    <UsherPortal />
                  </RequireRole>
                }
              />

              <Route element={<MainLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/events" element={<EventsDiscovery />} />
                <Route path="/venues" element={<VenuesDiscovery />} />
                <Route path="/food" element={<Navigate to="/events" replace />} />
                <Route path="/seating-map" element={<Navigate to="/events" replace />} />
                <Route path="/events/:id" element={<RedirectEventsIdToEvent />} />
                <Route path="/event/:id" element={<EventDetails />} />
                <Route path="/purchase/:id" element={<TicketPurchase />} />
                <Route path="/white-market" element={<WhiteMarket />} />
                <Route path="/resale/payment/:requestId" element={<ResalePayment />} />
                <Route path="/event/:eventId/food" element={<FoodMenuPage />} />
                <Route path="/event/:eventId/food/checkout" element={<FoodCheckoutPage />} />
                <Route path="/food/orders" element={<FoodOrdersPage />} />
                <Route path="/food/orders/:orderId" element={<FoodOrderDetailPage />} />
                <Route path="/food/orders/:orderId/edit" element={<FoodOrderEditPage />} />
                <Route
                  path="/vendor"
                  element={
                    <RequireRole allowedRoles={['vendor']}>
                      <VendorDashboard />
                    </RequireRole>
                  }
                />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/auth/callback" element={<OAuthCallback />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                  path="/face-id-registration"
                  element={
                    <RequireSignedIn>
                      <FaceIDRegistration />
                    </RequireSignedIn>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
          </AuthProvider>
        </div>
      </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}
