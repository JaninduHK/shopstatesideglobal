import { useSelector } from 'react-redux';
import { selectUser, selectAccessToken, selectIsAdmin } from '../features/auth/authSlice.js';

export function useAuth() {
  const user = useSelector(selectUser);
  const accessToken = useSelector(selectAccessToken);
  const isAdmin = useSelector(selectIsAdmin);
  const isAuthenticated = !!user && !!accessToken;

  const hasActiveMembership =
    user?.membership?.status === 'active' &&
    user?.membership?.endDate &&
    new Date(user.membership.endDate) > new Date();

  const hasAddon = (addon) => hasActiveMembership && user.membership.addOns?.includes(addon);

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    hasActiveMembership,
    hasAddon,
  };
}
