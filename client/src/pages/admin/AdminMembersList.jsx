import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAdminListMembersQuery } from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const STATUSES = ['', 'active', 'expired', 'cancelled', 'none'];

export function AdminMembersList() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 50 });
  const [q, setQ] = useState('');
  const { data, isFetching } = useAdminListMembersQuery({ ...filters, q: filters.q });

  const onSearch = (e) => { e.preventDefault(); setFilters({ ...filters, q, page: 1 }); };

  return (
    <>
      <Helmet><title>Members — Admin</title></Helmet>
      <div className="p-10">
        <h1 className="font-display text-3xl mb-1">Members</h1>
        <p className="text-text-muted text-sm mb-8">{data?.meta?.total ?? '…'} total</p>

        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setFilters({ ...filters, status: s, page: 1 })}
                className={`text-xs uppercase tracking-luxe px-3 py-2 border ${filters.status === s ? 'border-gold text-gold' : 'border-border text-text-secondary hover:border-border-highlight'}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <form onSubmit={onSearch} className="flex gap-2 flex-1 max-w-sm">
            <input type="search" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} className="input-luxe text-sm flex-1" />
            <button type="submit" className="btn-ghost text-xs py-2 px-4">Search</button>
          </form>
        </div>

        {isFetching ? <Loader /> : (
          <div className="bg-bg-secondary border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Plan</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Total spent</th>
                  <th className="text-left p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data?.members?.map((m) => (
                  <tr key={m._id} className="border-b border-border/50">
                    <td className="p-4">
                      <Link to={`/admin/members/${m._id}`} className="text-text-primary hover:text-gold">
                        {m.firstName} {m.lastName}
                      </Link>
                      {!m.isActive && <span className="ml-2 text-xs text-status-error">suspended</span>}
                    </td>
                    <td className="p-4 text-text-secondary">{m.email}</td>
                    <td className="p-4 text-text-secondary">{m.membership?.plan || '—'}</td>
                    <td className="p-4">
                      <span className={
                        m.membership?.status === 'active' ? 'text-status-success text-xs uppercase tracking-luxe' :
                        m.membership?.status === 'expired' ? 'text-status-warning text-xs uppercase tracking-luxe' :
                        'text-text-muted text-xs uppercase tracking-luxe'
                      }>
                        {m.membership?.status || 'none'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">{formatNaira(m.totalSpent || 0)}</td>
                    <td className="p-4 text-text-secondary">{new Date(m.createdAt).toLocaleDateString('en-NG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
