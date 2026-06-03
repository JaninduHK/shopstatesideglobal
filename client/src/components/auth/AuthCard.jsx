import { Link } from 'react-router-dom';

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-bg-primary">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center font-display tracking-luxe text-gold mb-10">
          STATE&nbsp;SIDE&nbsp;GLOBAL
        </Link>
        <div className="bg-bg-secondary border border-border p-8 md:p-10">
          <h1 className="font-display text-3xl mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary mb-8">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}
