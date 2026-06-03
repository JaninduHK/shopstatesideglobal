import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useLogoutMutation } from '../../features/auth/authApi.js';

export function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const [logout] = useLogoutMutation();

  return (
    <header className="border-b border-border bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/70 sticky top-0 z-40">
      <div className="container-luxe flex h-16 items-center justify-between">
        <Link to="/" className="font-display tracking-luxe text-xl text-gold">
          STATE&nbsp;SIDE&nbsp;GLOBAL
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-luxe text-text-secondary">
          <Link to="/" className="hover:text-text-primary">Home</Link>
          <a className="hover:text-text-primary cursor-not-allowed opacity-60" title="Phase 8">About</a>
          <a className="hover:text-text-primary cursor-not-allowed opacity-60" title="Phase 8">Press</a>
          <a className="hover:text-text-primary cursor-not-allowed opacity-60" title="Phase 8">Contact</a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:inline text-xs text-text-secondary">
                {user?.firstName}
              </span>
              <button onClick={() => logout()} className="btn-ghost py-2 px-4 text-xs">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="btn-ghost py-2 px-4 text-xs">Sign in</Link>
              <Link to="/auth/register" className="btn-gold py-2 px-4 text-xs">Become a member</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
