import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import OrderConfirmed from './pages/OrderConfirmed';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import { PublicLayout } from './components/layout/PublicLayout';
import { AuthProvider } from './components/admin/AuthProvider';
import { RequireAuth } from './components/admin/RequireAuth';
import { initPixel } from './lib/pixel';

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
  return (
    <AuthProvider>
      <PixelInit />
      <Routes>
        <Route
          path="/"
          element={
            <PublicLayout>
              <Home />
            </PublicLayout>
          }
        />
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
