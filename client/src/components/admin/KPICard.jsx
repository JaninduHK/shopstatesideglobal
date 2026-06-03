import { Link } from 'react-router-dom';

export function KPICard({ label, value, to, suffix, accent }) {
  const Content = (
    <div className={`bg-bg-secondary border ${accent ? 'border-gold/40' : 'border-border'} p-6 hover:border-border-highlight transition-colors`}>
      <p className="text-xs uppercase tracking-luxe text-text-muted mb-3">{label}</p>
      <p className={`font-display text-4xl ${accent ? 'text-gold' : 'text-text-primary'}`}>
        {value ?? '—'}
        {suffix && <span className="text-text-muted text-sm ml-2">{suffix}</span>}
      </p>
    </div>
  );
  return to ? <Link to={to}>{Content}</Link> : Content;
}
