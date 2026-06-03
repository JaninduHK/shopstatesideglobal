import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function GuestRoute() {
  const { isAuthenticated, hasActiveMembership } = useAuth();
  const location = useLocation();
  if (isAuthenticated) {
    const dest = hasActiveMembership ? '/member' : '/membership/plans';
    return <Navigate to={dest} replace state={{ from: location }} />;
  }
  return <Outlet />;
}
