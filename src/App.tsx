import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import Reseller from './pages/Reseller';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import { PublicLayout } from './components/layout/PublicLayout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider } from './components/admin/AuthProvider';
import { RequireAuth } from './components/admin/RequireAuth';
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
      </Routes>
    </AuthProvider>
  );
}
