import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Reseller from './pages/Reseller';
import PartnerLogin from './pages/reseller/PartnerLogin';
import PartnerSetPassword from './pages/reseller/PartnerSetPassword';
import PartnerDashboard from './pages/reseller/PartnerDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminPromotions from './pages/admin/AdminPromotions';
import AdminPromotionForm from './pages/admin/AdminPromotionForm';
import AdminPartnerPricing from './pages/admin/AdminPartnerPricing';
import AdminPartners from './pages/admin/AdminPartners';
import AdminPartnerDetail from './pages/admin/AdminPartnerDetail';
// AdminMedia is hidden for now - see the /admin/media route below.
import AdminAuditLog from './pages/admin/AdminAuditLog';
import { PublicLayout } from './components/layout/PublicLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider } from './components/auth/AuthProvider';
import { RequireAuth } from './components/admin/RequireAuth';
import { PartnerAuthProvider } from './components/reseller/PartnerAuthProvider';
import { RequirePartnerAuth } from './components/reseller/RequirePartnerAuth';
import { ToastProvider } from './components/ui/Toast';
import { initPixel } from './lib/pixel';
import { isAdminHost } from './lib/hostRouting';

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

  return null;
}

export default function App() {
  // Same build/deployment serves the admin app on its own subdomain
  // (adminleanfit.altasme.com today, admin.<client-domain> at launch) -
  // see src/lib/hostRouting.ts. "/" on that host goes straight to the
  // order list instead of the marketing homepage; every /admin/* path
  // keeps working normally either way, so nothing breaks if DNS for the
  // subdomain isn't live yet.
  const onAdminHost = isAdminHost();

  return (
    <ToastProvider>
      <AuthProvider>
        <ScrollToTop />
        <PixelInit />
        <Routes>
          {onAdminHost ? (
            <Route path="/" element={<Navigate to="/admin" replace />} />
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
                <AdminProducts />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <RequireAuth>
                <AdminProductForm />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/products/:id"
            element={
              <RequireAuth>
                <AdminProductForm />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions"
            element={
              <RequireAuth>
                <AdminPromotions />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions/new"
            element={
              <RequireAuth>
                <AdminPromotionForm />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/promotions/:id"
            element={
              <RequireAuth>
                <AdminPromotionForm />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/partner-pricing"
            element={
              <RequireAuth>
                <AdminPartnerPricing />
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
            path="/admin/partners/:id"
            element={
              <RequireAuth>
                <AdminPartnerDetail />
              </RequireAuth>
            }
          />
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
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
