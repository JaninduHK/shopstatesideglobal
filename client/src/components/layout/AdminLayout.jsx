import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogoutMutation } from '../../features/auth/authApi.js';

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/brands', label: 'Brands' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/memberships', label: 'Memberships' },
  { to: '/admin/subscribers', label: 'Subscribers' },
  { to: '/admin/articles', label: 'Articles' },
  { to: '/admin/faq', label: 'FAQ' },
  { to: '/admin/settings', label: 'Settings' },
];

const itemClass = ({ isActive }) =>
  `block px-4 py-3 text-xs uppercase tracking-luxe border-l-2 ${
    isActive
      ? 'text-gold border-gold bg-bg-tertiary/60'
      : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-tertiary/40'
  }`;

export function AdminLayout() {
  const { user } = useAuth();
  const [logout] = useLogoutMutation();

  return (
    <div className="min-h-screen flex bg-bg-primary">
      <aside className="w-64 border-r border-border bg-bg-secondary flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/admin" className="font-display tracking-luxe text-gold text-sm">
            STATE&nbsp;SIDE&nbsp;GLOBAL
          </Link>
          <p className="text-xs text-text-muted mt-1">Admin</p>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={itemClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-6 border-t border-border text-xs">
          <p className="text-text-secondary mb-2">{user?.email}</p>
          <button onClick={() => logout()} className="text-gold hover:text-gold-light">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
