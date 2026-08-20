import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import ReferralRedirect from './pages/ReferralRedirect';
import Reseller from './pages/Reseller';
import PartnerLogin from './pages/reseller/PartnerLogin';
import PartnerSetPassword from './pages/reseller/PartnerSetPassword';
import PartnerDashboard from './pages/reseller/PartnerDashboard';
// AddPartner (partner-assisted onboarding, Part 2 Route B) is hidden -
// partners can no longer onboard other partners (client decision,
// migration 0017 also rejects the RPC server-side) - see the
// /reseller/add-partner route below.
import AdminLogin from './pages/admin/AdminLogin';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminPromotions from './pages/admin/AdminPromotions';
import AdminPromotionForm from './pages/admin/AdminPromotionForm';
import AdminPartnerPricing from './pages/admin/AdminPartnerPricing';
import AdminPartners from './pages/admin/AdminPartners';
import AdminPartnerCreate from './pages/admin/AdminPartnerCreate';
import AdminPartnerDetail from './pages/admin/AdminPartnerDetail';
import AdminStaff from './pages/admin/AdminStaff';
import AdminTopSellers from './pages/admin/AdminTopSellers';
// AdminTerritories/AdminTerritoryMap and AdminMedia are hidden for now -
// see the /admin/territories, /admin/territory-map, and /admin/media
// routes below.
import AdminAuditLog from './pages/admin/AdminAuditLog';
import { PublicLayout } from './components/layout/PublicLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider } from './components/auth/AuthProvider';
import { RequireAuth } from './components/admin/RequireAuth';
import { RequireFullAdmin } from './components/admin/RequireFullAdmin';
import { RequirePermission } from './components/admin/RequirePermission';
import { PartnerAuthProvider } from './components/reseller/PartnerAuthProvider';
import { RequirePartnerAuth } from './components/reseller/RequirePartnerAuth';
import { ToastProvider } from './components/ui/Toast';
import { initPixel } from './lib/pixel';
import { isAdminHost, isResellerHost } from './lib/hostRouting';
import { captureReferralFromUrl } from './lib/referral';

function PixelInit() {
  const location = useLocation();

  useEffect(() => {
    initPixel();
  }, []);

  useEffect(() => {
    // fbq('init', ...) already tracks the first PageView; route changes
    // beyond the first load re-fire it so SPA navigation is captured.
    window.fbq?.('track', 'PageView');
  }, [location.pathname]);

  useEffect(() => {
    // A partner's referral link can land anywhere, not just "/" - capture
    // `?ref=` on every route change (spec Part 1 §26).
    captureReferralFromUrl();
  }, [location.search]);

  return null;
}

export default function App() {
  // Same build/deployment serves the admin app AND the reseller/partner
  // portal on their own subdomains (admin.leanandfit.ph / partner.
  // leanandfit.ph) - see src/lib/hostRouting.ts. "/" on either host goes
  // straight to that app instead of the marketing homepage; every
  // /admin/* and /reseller/* path keeps working normally regardless of
  // host, so nothing breaks if DNS for a subdomain isn't live yet.
  const onAdminHost = isAdminHost();
  const onResellerHost = isResellerHost();

  return (
    <ToastProvider>
      <AuthProvider>
        <ScrollToTop />
        <PixelInit />
        <Routes>
          {onAdminHost ? (
            <Route path="/" element={<Navigate to="/admin" replace />} />
          ) : onResellerHost ? (
            <Route path="/" element={<Navigate to="/reseller/dashboard" replace />} />
          ) : (
            <Route
              path="/"
              element={
                <PublicLayout>
                  <Home />
                </PublicLayout>
              }
            />
          )}
          <Route
            path="/checkout"
            element={
              <PublicLayout>
                <Checkout />
              </PublicLayout>
            }
          />
          <Route
            path="/order-confirmed"
            element={
              <PublicLayout>
                <OrderConfirmed />
              </PublicLayout>
            }
          />
          <Route
            path="/reseller"
            element={
              <PublicLayout>
                <Reseller />
              </PublicLayout>
            }
          />
          <Route path="/reseller/login" element={<PartnerLogin />} />
          <Route path="/reseller/set-password" element={<PartnerSetPassword />} />
          <Route
            path="/reseller/dashboard"
            element={
              <PartnerAuthProvider>
                <RequirePartnerAuth>
                  <PartnerDashboard />
                </RequirePartnerAuth>
              </PartnerAuthProvider>
            }
          />
          {/* Add Partner is built but hidden for now (nav link removed in
              OverviewTab.tsx) - redirect rather than leaving a dead
              direct-URL route. Swap back to <AddPartner /> to re-enable
              (also revert migration 0017's unconditional rejection in
              onboard_partner()). */}
          <Route path="/reseller/add-partner" element={<Navigate to="/reseller/dashboard" replace />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminOrders />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/orders/:id"
            element={
              <RequireAuth>
                <AdminOrderDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/products"
            element={
              <RequireAuth>
                <RequirePermission permission="products">
                  <AdminProducts />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <RequireAuth>
                <RequirePermission permission="products">
                  <AdminProductForm />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/products/:id"
            element={
              <RequireAuth>
                <RequirePermission permission="products">
                  <AdminProductForm />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions"
            element={
              <RequireAuth>
                <RequirePermission permission="promotions">
                  <AdminPromotions />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions/new"
            element={
              <RequireAuth>
                <RequirePermission permission="promotions">
                  <AdminPromotionForm />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions/:id"
            element={
              <RequireAuth>
                <RequirePermission permission="promotions">
                  <AdminPromotionForm />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/partner-pricing"
            element={
              <RequireAuth>
                <RequirePermission permission="partner_pricing">
                  <AdminPartnerPricing />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/partners"
            element={
              <RequireAuth>
                <AdminPartners />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/partners/new"
            element={
              <RequireAuth>
                <AdminPartnerCreate />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/partners/:id"
            element={
              <RequireAuth>
                <AdminPartnerDetail />
              </RequireAuth>
            }
          />
          {/* Territories/Territory Map are built but hidden for now (item #1,
              nav entries removed in AdminLayout) - redirect rather than
              leaving a dead direct-URL route. Swap back to <AdminTerritories />
              / <AdminTerritoryMap /> to re-enable. */}
          <Route path="/admin/territories" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/territory-map" element={<Navigate to="/admin" replace />} />
          {/* Media is built but hidden for now (nav entry removed in
              AdminLayout) - redirect rather than leaving a dead direct-URL
              route. Swap this back to <AdminMedia /> to re-enable. */}
          <Route path="/admin/media" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin/audit-log"
            element={
              <RequireAuth>
                <AdminAuditLog />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <RequireAuth>
                <RequireFullAdmin>
                  <AdminStaff />
                </RequireFullAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/top-sellers"
            element={
              <RequireAuth>
                <AdminTopSellers />
              </RequireAuth>
            }
          />

          {/* Path-based referral link catch-all (leanandfit.ph/{code}) -
              public host only. Ranks below every route above it
              regardless of declaration order (React Router always prefers
              a static path segment over a dynamic one), so it only ever
              catches a genuinely unmatched single segment. Omitted on the
              admin/reseller subdomains - those hosts have no referral
              links to resolve and shouldn't force-redirect a mistyped
              path to "/". */}
          {!onAdminHost && !onResellerHost && (
            <Route path="/:slug" element={<ReferralRedirect />} />
          )}
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
