import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function MemberRoute() {
  const { isAuthenticated, hasActiveMembership } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  if (!hasActiveMembership) {
    return <Navigate to="/membership/plans" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
