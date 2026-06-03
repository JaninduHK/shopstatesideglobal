import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAdminListRequestsQuery } from '../../features/requests/requestsApi.js';
import { RequestStatusBadge } from '../../components/request/RequestStatusBadge.jsx';
import { Loader } from '../../components/common/Loader.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const STATUSES = ['', 'submitted', 'under_review', 'accepted', 'awaiting_additional_payment', 'sourcing', 'ready', 'completed', 'rejected'];

export function AdminRequestsList() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 50 });
  const { data, isFetching } = useAdminListRequestsQuery(filters);

  return (
    <>
      <Helmet><title>Requests — Admin</title></Helmet>
      <div className="p-10">
        <h1 className="font-display text-3xl mb-1">Special requests</h1>
        <p className="text-text-muted text-sm mb-8">{data?.meta?.total ?? '…'} total</p>

        <div className="mb-6 flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilters({ ...filters, status: s, page: 1 })}
              className={`text-xs uppercase tracking-luxe px-3 py-2 border ${
                filters.status === s ? 'border-gold text-gold' : 'border-border text-text-secondary hover:border-border-highlight'
              }`}
            >
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>

        {isFetching ? <Loader /> : (
          <div className="bg-bg-secondary border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Request</th>
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-right p-4">Budget</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-right p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.requests?.map((r) => (
                  <tr key={r._id} className="border-b border-border/50">
                    <td className="p-4">
                      <Link to={`/admin/requests/${r._id}`} className="font-mono text-gold hover:text-gold-light">
                        {r.requestNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {r.user?.firstName} {r.user?.lastName}
                      <p className="text-xs text-text-muted">{r.user?.email}</p>
                    </td>
                    <td className="p-4 line-clamp-1 max-w-xs">{r.title}</td>
                    <td className="p-4 text-right font-mono">{formatNaira(r.budget)}</td>
                    <td className="p-4 text-text-secondary">{new Date(r.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="p-4 text-right"><RequestStatusBadge status={r.status} /></td>
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
