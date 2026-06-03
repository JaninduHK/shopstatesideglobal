import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogoutMutation } from '../../features/auth/authApi.js';
import { Footer } from './Footer.jsx';
import { CartDrawer } from '../cart/CartDrawer.jsx';
import { CartIconBadge } from '../cart/CartIconBadge.jsx';

const navClass = ({ isActive }) =>
  `text-xs uppercase tracking-luxe ${isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary'}`;

export function MemberLayout() {
  const { user } = useAuth();
  const [logout] = useLogoutMutation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-bg-primary/95 backdrop-blur sticky top-0 z-40">
        <div className="container-luxe flex h-16 items-center justify-between">
          <Link to="/member" className="font-display tracking-luxe text-xl text-gold">
            STATE&nbsp;SIDE&nbsp;GLOBAL
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/member" end className={navClass}>Home</NavLink>
            <NavLink to="/member/shop" className={navClass}>Shop</NavLink>
            <NavLink to="/member/wishlist" className={navClass}>Wishlist</NavLink>
            <NavLink to="/member/orders" className={navClass}>Orders</NavLink>
            <NavLink to="/member/requests" className={navClass}>Requests</NavLink>
            <NavLink to="/member/membership" className={navClass}>Membership</NavLink>
          </nav>
          <div className="flex items-center gap-4">
            <CartIconBadge />
            <span className="hidden sm:inline text-xs text-text-secondary">{user?.firstName}</span>
            <button onClick={() => logout()} className="btn-ghost py-2 px-4 text-xs">Log out</button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
