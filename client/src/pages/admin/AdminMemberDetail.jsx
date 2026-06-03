import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  useAdminGetMemberQuery,
  useAdminSuspendMemberMutation,
  useAdminOverrideMembershipMutation,
  useAdminEmailMemberMutation,
} from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const STATUSES = ['none', 'active', 'expired', 'cancelled'];

export function AdminMemberDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAdminGetMemberQuery(id);
  const [suspend, { isLoading: suspending }] = useAdminSuspendMemberMutation();
  const [override, { isLoading: overriding }] = useAdminOverrideMembershipMutation();
  const [sendEmail, { isLoading: sending }] = useAdminEmailMemberMutation();

  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
  const [membershipForm, setMembershipForm] = useState({ status: '', addOns: [], endDate: '' });

  if (isLoading) return <Loader />;
  const member = data?.member;
  if (!member) return <div className="p-10">Not found.</div>;

  const onSuspend = async (suspended) => {
    if (suspended && !confirm(`Suspend ${member.firstName}?`)) return;
    try {
      await suspend({ id: member._id, suspended, reason: suspended ? 'Admin action' : undefined }).unwrap();
      toast.success(suspended ? 'Suspended' : 'Unsuspended');
    } catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const onOverride = async (e) => {
    e.preventDefault();
    const payload = {};
    if (membershipForm.status) payload.status = membershipForm.status;
    if (membershipForm.addOns.length > 0 || membershipForm.useAddons) payload.addOns = membershipForm.addOns;
    if (membershipForm.endDate) payload.endDate = membershipForm.endDate;
    if (Object.keys(payload).length === 0) return;
    try {
      await override({ id: member._id, ...payload }).unwrap();
      toast.success('Membership updated');
    } catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const toggleAddon = (a) => {
    setMembershipForm((f) => ({
      ...f,
      useAddons: true,
      addOns: f.addOns.includes(a) ? f.addOns.filter((x) => x !== a) : [...f.addOns, a],
    }));
  };

  const onSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.subject || !emailForm.body) return;
    try {
      await sendEmail({ id: member._id, ...emailForm }).unwrap();
      toast.success('Email sent');
      setEmailForm({ subject: '', body: '' });
    } catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  return (
    <>
      <Helmet><title>{member.firstName} {member.lastName} — Admin</title></Helmet>
      <div className="p-10">
        <Link to="/admin/members" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-6 inline-block">
          ← Members
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">Member</p>
            <h1 className="font-display text-3xl">{member.firstName} {member.lastName}</h1>
            <p className="text-text-secondary text-sm">{member.email}</p>
            {!member.isActive && <p className="text-status-error text-xs mt-2">Suspended {member.suspendReason ? `· ${member.suspendReason}` : ''}</p>}
          </div>
          <button onClick={() => onSuspend(member.isActive)} disabled={suspending} className="btn-ghost text-xs">
            {member.isActive ? 'Suspend' : 'Unsuspend'}
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <h2 className="font-display text-xl mb-3">Override membership</h2>
            <form onSubmit={onOverride} className="bg-bg-secondary border border-border p-6 mb-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="mb-3">
                  <label className="label-luxe">Status</label>
                  <select className="input-luxe" value={membershipForm.status} onChange={(e) => setMembershipForm({ ...membershipForm, status: e.target.value })}>
                    <option value="">— keep current —</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Input type="date" label="End date" value={membershipForm.endDate} onChange={(e) => setMembershipForm({ ...membershipForm, endDate: e.target.value })} />
              </div>
              <div>
                <label className="label-luxe">Add-ons (set explicitly)</label>
                <div className="flex gap-4">
                  {['addon1', 'addon2'].map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="accent-gold" checked={membershipForm.addOns.includes(a)} onChange={() => toggleAddon(a)} />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" loading={overriding}>Save changes</Button>
            </form>

            <h2 className="font-display text-xl mb-3">Orders ({data.orders.length})</h2>
            <div className="bg-bg-secondary border border-border mb-8">
              {data.orders.length === 0 ? (
                <p className="p-4 text-text-muted text-sm">No orders.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o._id} className="border-b border-border/50 last:border-b-0">
                        <td className="p-3">
                          <Link to={`/admin/orders/${o._id}`} className="font-mono text-gold">{o.orderNumber}</Link>
                        </td>
                        <td className="p-3 text-text-secondary">{o.status}</td>
                        <td className="p-3 text-right font-mono">{formatNaira(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h2 className="font-display text-xl mb-3">Special requests ({data.requests.length})</h2>
            <div className="bg-bg-secondary border border-border mb-8">
              {data.requests.length === 0 ? (
                <p className="p-4 text-text-muted text-sm">No requests.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.requests.map((r) => (
                      <tr key={r._id} className="border-b border-border/50 last:border-b-0">
                        <td className="p-3">
                          <Link to={`/admin/requests/${r._id}`} className="font-mono text-gold">{r.requestNumber}</Link>
                        </td>
                        <td className="p-3 text-text-secondary line-clamp-1 max-w-sm">{r.title}</td>
                        <td className="p-3 text-text-secondary text-xs uppercase">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h2 className="font-display text-xl mb-3">Send direct email</h2>
            <form onSubmit={onSendEmail} className="bg-bg-secondary border border-border p-6 space-y-4">
              <Input label="Subject" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} />
              <div className="mb-3">
                <label className="label-luxe">Body</label>
                <textarea rows={6} className="input-luxe" value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} />
              </div>
              <Button type="submit" loading={sending}>Send email</Button>
            </form>
          </div>

          <aside className="bg-bg-secondary border border-border p-6 h-fit">
            <h3 className="font-display text-xl mb-4">Snapshot</h3>
            <dl className="text-sm space-y-3">
              <div className="flex justify-between"><dt className="text-text-muted">Plan</dt><dd>{member.membership?.plan || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Status</dt><dd>{member.membership?.status || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Add-ons</dt><dd>{member.membership?.addOns?.join(', ') || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">End date</dt><dd className="text-xs">{member.membership?.endDate ? new Date(member.membership.endDate).toLocaleDateString('en-NG') : '—'}</dd></div>
              <div className="flex justify-between pt-3 border-t border-border"><dt className="text-text-muted">Total spent</dt><dd className="font-mono text-gold">{formatNaira(member.totalSpent || 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Last login</dt><dd className="text-xs">{member.lastLogin ? new Date(member.lastLogin).toLocaleDateString('en-NG') : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Joined</dt><dd className="text-xs">{new Date(member.createdAt).toLocaleDateString('en-NG')}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}
