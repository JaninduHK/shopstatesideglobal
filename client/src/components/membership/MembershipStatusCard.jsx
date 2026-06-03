import { formatNaira } from '../../utils/formatCurrency.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function MembershipStatusCard({ user, onCancel, cancelling }) {
  const m = user?.membership;
  if (!m || m.status === 'none') {
    return (
      <div className="bg-bg-secondary border border-border p-6">
        <p className="text-text-secondary">No active membership.</p>
      </div>
    );
  }

  const labels = {
    basic: 'Basic',
    basic_addon1: 'Basic + First Look',
    basic_addon2: 'Basic + Vault',
    full: 'Full Access',
  };

  return (
    <div className="bg-bg-secondary border border-gold/40 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-luxe text-gold mb-1">{m.status}</p>
          <h3 className="font-display text-2xl">{labels[m.plan] || 'Membership'}</h3>
        </div>
        <span className="text-xs uppercase tracking-luxe text-text-muted">
          {m.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
        </span>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-y-4 text-sm">
        <dt className="text-text-muted">Started</dt>
        <dd className="text-right">{fmtDate(m.startDate)}</dd>
        <dt className="text-text-muted">Next billing</dt>
        <dd className="text-right">{fmtDate(m.endDate)}</dd>
        {m.addOns?.length > 0 && (
          <>
            <dt className="text-text-muted">Add-ons</dt>
            <dd className="text-right">{m.addOns.join(', ')}</dd>
          </>
        )}
      </dl>

      {m.autoRenew && m.status === 'active' && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="btn-ghost w-full mt-8 text-xs"
        >
          {cancelling ? '…' : 'Cancel auto-renewal'}
        </button>
      )}
    </div>
  );
}

export function TransactionsTable({ items }) {
  if (!items?.length) return <p className="text-text-muted text-sm">No transactions yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
        <tr>
          <th className="text-left py-3">Date</th>
          <th className="text-left">Type</th>
          <th className="text-right">Amount</th>
          <th className="text-right">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t._id} className="border-b border-border/50">
            <td className="py-3 text-text-secondary">{new Date(t.createdAt).toLocaleDateString('en-NG')}</td>
            <td className="text-text-secondary">{t.type}</td>
            <td className="text-right font-mono">{formatNaira(t.amount)}</td>
            <td className="text-right">
              <span className={t.status === 'paid' ? 'text-status-success' : t.status === 'failed' ? 'text-status-error' : 'text-text-muted'}>
                {t.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
