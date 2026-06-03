import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useListRequestsQuery } from '../../features/requests/requestsApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { RequestStatusBadge } from '../../components/request/RequestStatusBadge.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

export function RequestsList() {
  const { data, isLoading } = useListRequestsQuery({ limit: 50 });
  if (isLoading) return <Loader label="Loading requests" />;
  const requests = data?.requests || [];

  return (
    <>
      <Helmet><title>Special requests — State Side Global</title></Helmet>
      <div className="container-luxe py-16">
        <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">Bespoke sourcing</p>
            <h1 className="font-display text-4xl">Special requests</h1>
          </div>
          <Link to="/member/requests/new" className="btn-gold">New request</Link>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-gold text-3xl mb-3">◇</div>
            <p className="text-text-secondary mb-6">You haven't submitted any requests yet.</p>
            <Link to="/member/requests/new" className="btn-ghost">Submit a request</Link>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Number</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-right p-4">Budget</th>
                  <th className="text-right p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id} className="border-b border-border/50">
                    <td className="p-4">
                      <Link to={`/member/requests/${r._id}`} className="font-mono text-gold hover:text-gold-light">
                        {r.requestNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-text-primary line-clamp-1 max-w-sm">{r.title}</td>
                    <td className="p-4 text-text-secondary">{new Date(r.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="p-4 text-right font-mono">{formatNaira(r.budget)}</td>
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
