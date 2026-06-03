import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useAdminGetMembershipGrowthQuery } from '../../features/admin/adminApi.js';

export function MembershipGrowthChart() {
  const { data, isLoading } = useAdminGetMembershipGrowthQuery('30d');

  return (
    <div className="bg-bg-secondary border border-border p-6">
      <h3 className="font-display text-xl mb-6">Membership activity (30 days)</h3>
      <div style={{ width: '100%', height: 280 }}>
        {isLoading || !data ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">Loading…</div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a96e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#c9a96e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="renewalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a82c9" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#4a82c9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#666666" fontSize={11} />
              <YAxis stroke="#666666" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111111', border: '1px solid #2a2a2a', color: '#f5f5f0' }} />
              <Area type="monotone" dataKey="new" stroke="#c9a96e" strokeWidth={2} fill="url(#newGrad)" name="New" />
              <Area type="monotone" dataKey="renewals" stroke="#4a82c9" strokeWidth={2} fill="url(#renewalGrad)" name="Renewals" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
