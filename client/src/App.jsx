import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { useGetMeQuery, useRefreshTokenMutation } from './features/auth/authApi.js';
import { setUser } from './features/auth/authSlice.js';

import { GuestRoute } from './routes/GuestRoute.jsx';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { MemberRoute } from './routes/MemberRoute.jsx';
import { AdminRoute } from './routes/AdminRoute.jsx';

import { PublicLayout } from './components/layout/PublicLayout.jsx';
import { MemberLayout } from './components/layout/MemberLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';

import { LandingPage } from './pages/public/LandingPage.jsx';
import { Login } from './pages/auth/Login.jsx';
import { Register } from './pages/auth/Register.jsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.jsx';
import { ResetPassword } from './pages/auth/ResetPassword.jsx';
import { VerifyEmail } from './pages/auth/VerifyEmail.jsx';

import { MembershipPlans } from './pages/membership/MembershipPlans.jsx';
import { MembershipSuccess } from './pages/membership/MembershipSuccess.jsx';
import { MembershipManage } from './pages/member/MembershipManage.jsx';

import { Shop } from './pages/member/Shop.jsx';
import { ProductDetail } from './pages/member/ProductDetail.jsx';
import { Wishlist } from './pages/member/Wishlist.jsx';
import { Checkout } from './pages/member/Checkout.jsx';
import { OrdersList } from './pages/member/OrdersList.jsx';
import { OrderDetail } from './pages/member/OrderDetail.jsx';
import { RequestsList } from './pages/member/RequestsList.jsx';
import { RequestCreate } from './pages/member/RequestCreate.jsx';
import { RequestDetail } from './pages/member/RequestDetail.jsx';

import { AdminOverview } from './pages/admin/AdminOverview.jsx';
import { AdminProductsList } from './pages/admin/AdminProductsList.jsx';
import { AdminProductEdit } from './pages/admin/AdminProductEdit.jsx';
import { AdminBrands } from './pages/admin/AdminBrands.jsx';
import { AdminCategories } from './pages/admin/AdminCategories.jsx';
import { AdminOrdersList } from './pages/admin/AdminOrdersList.jsx';
import { AdminOrderDetail } from './pages/admin/AdminOrderDetail.jsx';
import { AdminRequestsList } from './pages/admin/AdminRequestsList.jsx';
import { AdminRequestDetail } from './pages/admin/AdminRequestDetail.jsx';
import { AdminMembersList } from './pages/admin/AdminMembersList.jsx';
import { AdminMemberDetail } from './pages/admin/AdminMemberDetail.jsx';
import { AdminMemberships } from './pages/admin/AdminMemberships.jsx';
import { AdminSubscribers } from './pages/admin/AdminSubscribers.jsx';
import { AdminArticles } from './pages/admin/AdminArticles.jsx';
import { AdminFAQ } from './pages/admin/AdminFAQ.jsx';
import { AdminSettings } from './pages/admin/AdminSettings.jsx';

function BootstrapAuth() {
  const dispatch = useDispatch();
  const [refresh] = useRefreshTokenMutation();
  const { data, isSuccess } = useGetMeQuery(undefined, { skip: !localStorage.getItem('hasSession') });

  useEffect(() => {
    (async () => {
      try {
        const res = await refresh().unwrap();
        if (res.accessToken) localStorage.setItem('hasSession', '1');
      } catch {
        localStorage.removeItem('hasSession');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSuccess && data?.user) dispatch(setUser(data.user));
  }, [isSuccess, data, dispatch]);

  return null;
}

function MemberHome() {
  return (
    <div className="container-luxe py-24">
      <p className="text-xs uppercase tracking-luxe text-gold mb-2">Welcome back</p>
      <h1 className="font-display text-5xl mb-8">The Collection</h1>
      <p className="text-text-secondary max-w-xl mb-8">
        Curated picks, flash drops, and your dashboard land in Phase 6. For now, browse the shop or manage your membership.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <BootstrapAuth />
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* Guest-only */}
        <Route element={<GuestRoute />}>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
        </Route>

        <Route path="/auth/verify-email/:token" element={<VerifyEmail />} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PublicLayout />}>
            <Route path="/membership/plans" element={<MembershipPlans />} />
            <Route path="/membership/success" element={<MembershipSuccess />} />
          </Route>
        </Route>

        {/* Member-only */}
        <Route element={<MemberRoute />}>
          <Route element={<MemberLayout />}>
            <Route path="/member" element={<MemberHome />} />
            <Route path="/member/shop" element={<Shop />} />
            <Route path="/member/shop/:slug" element={<ProductDetail />} />
            <Route path="/member/wishlist" element={<Wishlist />} />
            <Route path="/member/checkout" element={<Checkout />} />
            <Route path="/member/orders" element={<OrdersList />} />
            <Route path="/member/orders/:id" element={<OrderDetail />} />
            <Route path="/member/requests" element={<RequestsList />} />
            <Route path="/member/requests/new" element={<RequestCreate />} />
            <Route path="/member/requests/:id" element={<RequestDetail />} />
            <Route path="/member/membership" element={<MembershipManage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/products" element={<AdminProductsList />} />
            <Route path="/admin/products/new" element={<AdminProductEdit />} />
            <Route path="/admin/products/:id" element={<AdminProductEdit />} />
            <Route path="/admin/brands" element={<AdminBrands />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/orders" element={<AdminOrdersList />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
            <Route path="/admin/requests" element={<AdminRequestsList />} />
            <Route path="/admin/requests/:id" element={<AdminRequestDetail />} />
            <Route path="/admin/members" element={<AdminMembersList />} />
            <Route path="/admin/members/:id" element={<AdminMemberDetail />} />
            <Route path="/admin/memberships" element={<AdminMemberships />} />
            <Route path="/admin/subscribers" element={<AdminSubscribers />} />
            <Route path="/admin/articles" element={<AdminArticles />} />
            <Route path="/admin/faq" element={<AdminFAQ />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
