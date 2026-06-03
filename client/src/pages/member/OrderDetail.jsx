import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useGetOrderQuery, useCancelOrderMutation } from '../../features/orders/ordersApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { OrderStatusBadge, STATUS_LABEL } from '../../components/order/OrderStatusBadge.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const CANCELLABLE = ['pending_payment', 'confirmed', 'processing'];

export function OrderDetail() {
  const { id } = useParams();
  const { data, isLoading } = useGetOrderQuery(id);
  const [cancel, { isLoading: cancelling }] = useCancelOrderMutation();

  if (isLoading) return <Loader />;
  const order = data?.order;
  if (!order) return <div className="container-luxe py-32 text-center">Order not found.</div>;

  const onCancel = async () => {
    if (!confirm('Cancel this order? Paid orders will be refunded.')) return;
    try {
      await cancel(order._id).unwrap();
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not cancel');
    }
  };

  return (
    <>
      <Helmet><title>Order {order.orderNumber} — State Side Global</title></Helmet>
      <div className="container-luxe py-12">
        <Link to="/member/orders" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-6 inline-block">
          ← All orders
        </Link>
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">{order.orderNumber}</p>
            <h1 className="font-display text-4xl">Order detail</h1>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={order.status} />
            <p className="text-xs text-text-muted mt-1">
              Placed {new Date(order.createdAt).toLocaleDateString('en-NG')}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <h2 className="font-display text-2xl mb-4">Items</h2>
            <div className="bg-bg-secondary border border-border divide-y divide-border/50">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex gap-4 p-4">
                  {it.image && <img src={it.image} alt="" className="w-20 h-24 object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary">{it.title}</p>
                    <p className="text-xs text-text-muted mt-1">Qty {it.quantity}</p>
                  </div>
                  <p className="font-mono text-gold">{formatNaira(it.price * it.quantity)}</p>
                </div>
              ))}
            </div>

            <h2 className="font-display text-2xl mt-12 mb-4">Status timeline</h2>
            <div className="bg-bg-secondary border border-border p-6 space-y-3">
              {order.statusHistory?.map((h, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{STATUS_LABEL[h.status] || h.status}</span>
                  <span className="text-xs text-text-muted">{new Date(h.changedAt).toLocaleString('en-NG')}</span>
                </div>
              ))}
            </div>

            {order.trackingNumber && (
              <div className="mt-8 bg-bg-secondary border-l-2 border-gold p-4">
                <p className="text-xs uppercase tracking-luxe text-gold mb-1">Tracking</p>
                <p className="font-mono text-sm">{order.trackingNumber}</p>
                {order.courierService && <p className="text-text-secondary text-xs">{order.courierService}</p>}
              </div>
            )}
          </div>

          <aside className="bg-bg-secondary border border-border p-6 h-fit">
            <h3 className="font-display text-xl mb-4">Summary</h3>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span className="font-mono">{formatNaira(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span className="font-mono">{formatNaira(order.shippingFee)}</span></div>
              {order.tax > 0 && <div className="flex justify-between"><span className="text-text-muted">Tax</span><span className="font-mono">{formatNaira(order.tax)}</span></div>}
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-xs uppercase tracking-luxe">Total</span>
                <span className="font-mono text-gold">{formatNaira(order.total)}</span>
              </div>
            </div>

            <div className="text-xs uppercase tracking-luxe text-text-muted mb-2">Shipping to</div>
            <p className="text-sm">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-text-secondary">{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 && <p className="text-sm text-text-secondary">{order.shippingAddress.line2}</p>}
            <p className="text-sm text-text-secondary">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
            <p className="text-sm text-text-secondary">{order.shippingAddress.country}</p>

            {CANCELLABLE.includes(order.status) && (
              <button
                onClick={onCancel}
                disabled={cancelling}
                className="btn-ghost w-full mt-6 text-xs"
              >
                {cancelling ? '…' : 'Cancel order'}
              </button>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
