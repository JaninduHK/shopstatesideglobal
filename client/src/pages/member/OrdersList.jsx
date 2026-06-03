import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useListOrdersQuery } from '../../features/orders/ordersApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { OrderStatusBadge } from '../../components/order/OrderStatusBadge.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

export function OrdersList() {
  const { data, isLoading } = useListOrdersQuery({ limit: 50 });
  if (isLoading) return <Loader label="Loading orders" />;
  const orders = data?.orders || [];

  return (
    <>
      <Helmet><title>Orders — State Side Global</title></Helmet>
      <div className="container-luxe py-16">
        <p className="text-xs uppercase tracking-luxe text-gold mb-2">Your account</p>
        <h1 className="font-display text-4xl mb-12">Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-gold text-3xl mb-3">◇</div>
            <p className="text-text-secondary mb-6">No orders yet.</p>
            <Link to="/member/shop" className="btn-ghost">Browse the collection</Link>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Order</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Items</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-right p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-border/50">
                    <td className="p-4">
                      <Link to={`/member/orders/${o._id}`} className="font-mono text-gold hover:text-gold-light">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-text-secondary">{new Date(o.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="p-4 text-text-secondary">{o.items.length}</td>
                    <td className="p-4 text-right font-mono">{formatNaira(o.total)}</td>
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
