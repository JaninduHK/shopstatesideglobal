import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useAdminGetRevenueChartQuery } from '../../features/admin/adminApi.js';
import { formatNaira } from '../../utils/formatCurrency.js';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '12m', label: '12 months' },
];

export function RevenueChart() {
  const [range, setRange] = useState('30d');
  const { data, isLoading } = useAdminGetRevenueChartQuery(range);

  return (
    <div className="bg-bg-secondary border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl">Revenue</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs uppercase tracking-luxe px-3 py-1 border ${
                range === r.value ? 'border-gold text-gold' : 'border-border text-text-secondary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 280 }}>
        {isLoading || !data ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">Loading…</div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#666666" fontSize={11} />
              <YAxis stroke="#666666" fontSize={11} tickFormatter={(v) => formatNaira(v, { withSymbol: true }).replace('₦', '₦')} width={90} />
              <Tooltip
                contentStyle={{ background: '#111111', border: '1px solid #2a2a2a', color: '#f5f5f0' }}
                formatter={(value) => formatNaira(value)}
              />
              <Line type="monotone" dataKey="revenue" stroke="#c9a96e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
