import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  useAdminGetOrderQuery,
  useAdminUpdateOrderStatusMutation,
  useAdminAddOrderNoteMutation,
} from '../../features/orders/ordersApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { OrderStatusBadge, STATUS_LABEL } from '../../components/order/OrderStatusBadge.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const STATUSES = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

export function AdminOrderDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAdminGetOrderQuery(id);
  const [updateStatus, { isLoading: updating }] = useAdminUpdateOrderStatusMutation();
  const [addNote] = useAdminAddOrderNoteMutation();

  const [form, setForm] = useState({
    status: 'pending_payment',
    trackingNumber: '',
    courierService: '',
    note: '',
    notifyCustomer: true,
  });
  const [note, setNote] = useState('');

  useEffect(() => {
    if (data?.order) {
      setForm((f) => ({
        ...f,
        status: data.order.status,
        trackingNumber: data.order.trackingNumber || '',
        courierService: data.order.courierService || '',
      }));
    }
  }, [data]);

  if (isLoading) return <Loader />;
  const order = data?.order;
  if (!order) return <div className="p-10">Order not found.</div>;

  const onUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateStatus({ id: order._id, ...form }).unwrap();
      toast.success('Order updated');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Update failed');
    }
  };

  const onNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await addNote({ id: order._id, note }).unwrap();
      setNote('');
      toast.success('Note added');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Failed');
    }
  };

  return (
    <>
      <Helmet><title>{order.orderNumber} — Admin</title></Helmet>
      <div className="p-10">
        <Link to="/admin/orders" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-6 inline-block">
          ← Orders
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">{order.orderNumber}</p>
            <h1 className="font-display text-3xl">Order detail</h1>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <h2 className="font-display text-xl mb-3">Customer</h2>
            <div className="bg-bg-secondary border border-border p-4 mb-8 text-sm">
              <p>{order.user?.firstName} {order.user?.lastName}</p>
              <p className="text-text-secondary">{order.user?.email}</p>
              {order.user?.phone && <p className="text-text-secondary">{order.user.phone}</p>}
            </div>

            <h2 className="font-display text-xl mb-3">Items</h2>
            <div className="bg-bg-secondary border border-border divide-y divide-border/50 mb-8">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex gap-4 p-4">
                  {it.image && <img src={it.image} alt="" className="w-16 h-20 object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{it.title}</p>
                    <p className="text-xs text-text-muted mt-1">Qty {it.quantity}</p>
                  </div>
                  <p className="font-mono text-sm text-gold">{formatNaira(it.price * it.quantity)}</p>
                </div>
              ))}
            </div>

            <h2 className="font-display text-xl mb-3">Update status</h2>
            <form onSubmit={onUpdate} className="bg-bg-secondary border border-border p-6 mb-8 space-y-4">
              <div>
                <label className="label-luxe">New status</label>
                <select className="input-luxe" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Tracking number" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
                <Input label="Courier" value={form.courierService} onChange={(e) => setForm({ ...form, courierService: e.target.value })} />
              </div>
              <div>
                <label className="label-luxe">Internal note (not emailed)</label>
                <textarea rows={3} className="input-luxe" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-gold" checked={form.notifyCustomer} onChange={(e) => setForm({ ...form, notifyCustomer: e.target.checked })} />
                Email the customer
              </label>
              <Button type="submit" loading={updating}>Save status</Button>
            </form>

            <h2 className="font-display text-xl mb-3">Admin notes</h2>
            <div className="bg-bg-secondary border border-border p-6">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap mb-4 max-h-48 overflow-y-auto">
                {order.adminNote || '— no notes —'}
              </pre>
              <form onSubmit={onNote} className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add note…"
                  className="input-luxe flex-1 text-sm"
                />
                <Button type="submit">Add</Button>
              </form>
            </div>
          </div>

          <aside className="bg-bg-secondary border border-border p-6 h-fit">
            <h3 className="font-display text-xl mb-4">Summary</h3>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span className="font-mono">{formatNaira(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span className="font-mono">{formatNaira(order.shippingFee)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Tax</span><span className="font-mono">{formatNaira(order.tax)}</span></div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-xs uppercase tracking-luxe">Total</span>
                <span className="font-mono text-gold">{formatNaira(order.total)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-text-muted">Payment</span>
                <span>{order.payment.status}</span>
              </div>
            </div>

            <div className="text-xs uppercase tracking-luxe text-text-muted mb-2">Ship to</div>
            <p className="text-sm">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-text-secondary">{order.shippingAddress.line1}</p>
            <p className="text-sm text-text-secondary">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
            <p className="text-sm text-text-secondary">{order.shippingAddress.country}</p>
            {order.shippingAddress.phone && <p className="text-sm text-text-secondary">{order.shippingAddress.phone}</p>}

            {order.customerNote && (
              <>
                <div className="text-xs uppercase tracking-luxe text-text-muted mt-6 mb-2">Customer note</div>
                <p className="text-sm text-text-secondary">{order.customerNote}</p>
              </>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
