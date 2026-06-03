import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAdminListOrdersQuery } from '../../features/orders/ordersApi.js';
import { OrderStatusBadge } from '../../components/order/OrderStatusBadge.jsx';
import { Loader } from '../../components/common/Loader.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const STATUSES = ['', 'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export function AdminOrdersList() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 50 });
  const { data, isFetching } = useAdminListOrdersQuery(filters);

  return (
    <>
      <Helmet><title>Orders — Admin</title></Helmet>
      <div className="p-10">
        <h1 className="font-display text-3xl mb-1">Orders</h1>
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
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>

        {isFetching ? <Loader /> : (
          <div className="bg-bg-secondary border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Order</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-center p-4">Payment</th>
                  <th className="text-right p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.orders?.map((o) => (
                  <tr key={o._id} className="border-b border-border/50">
                    <td className="p-4">
                      <Link to={`/admin/orders/${o._id}`} className="font-mono text-gold hover:text-gold-light">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {o.user?.firstName} {o.user?.lastName}
                      <p className="text-xs text-text-muted">{o.user?.email}</p>
                    </td>
                    <td className="p-4 text-text-secondary">{new Date(o.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="p-4 text-right font-mono">{formatNaira(o.total)}</td>
                    <td className="p-4 text-center">
                      <span className={
                        o.payment.status === 'paid' ? 'text-status-success text-xs' :
                        o.payment.status === 'refunded' ? 'text-text-muted text-xs' :
                        'text-status-warning text-xs'
                      }>{o.payment.status}</span>
                    </td>
                    <td className="p-4 text-right"><OrderStatusBadge status={o.status} /></td>
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
