import { Link } from 'react-router-dom';
import { useAdminGetRecentActivityQuery } from '../../features/admin/adminApi.js';
import { formatNaira } from '../../utils/formatCurrency.js';

const ICON = {
  order: '○',
  member: '◇',
  request: '◆',
  membership: '◈',
};

export function ActivityFeed() {
  const { data, isLoading } = useAdminGetRecentActivityQuery();
  const events = data?.events || [];

  return (
    <div className="bg-bg-secondary border border-border p-6">
      <h3 className="font-display text-xl mb-6">Recent activity</h3>
      {isLoading ? (
        <p className="text-text-muted text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-text-muted text-sm">Nothing yet.</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {events.map((e, idx) => (
            <li key={idx} className="border-b border-border/40 pb-3 last:border-b-0">
              <Link to={e.link || '#'} className="flex items-start gap-3 hover:bg-bg-tertiary/40 -mx-2 px-2 py-1">
                <span className="text-gold text-sm mt-0.5">{ICON[e.type] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{e.title}</p>
                  {e.subtitle && <p className="text-xs text-text-muted truncate">{e.subtitle}</p>}
                </div>
                <div className="text-right shrink-0">
                  {e.amount > 0 && <p className="font-mono text-xs text-gold">{formatNaira(e.amount)}</p>}
                  <p className="text-xs text-text-muted">{new Date(e.at).toLocaleDateString('en-NG')}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
