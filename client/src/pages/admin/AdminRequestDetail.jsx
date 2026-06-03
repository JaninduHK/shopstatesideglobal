import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  useAdminGetRequestQuery,
  useAdminAssessRequestMutation,
  useAdminUpdateRequestStatusMutation,
  useAdminAddRequestNoteMutation,
} from '../../features/requests/requestsApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import {
  RequestStatusBadge,
  REQUEST_STATUS_LABEL,
} from '../../components/request/RequestStatusBadge.jsx';
import { formatNaira, nairaToKobo } from '../../utils/formatCurrency.js';

const REJECTABLE = ['submitted', 'under_review', 'accepted', 'awaiting_additional_payment'];
const ADVANCEABLE_FROM = {
  sourcing: ['ready', 'cancelled'],
  ready: ['completed'],
  additional_paid: ['sourcing'],
};

export function AdminRequestDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAdminGetRequestQuery(id);
  const [assess, { isLoading: assessing }] = useAdminAssessRequestMutation();
  const [updateStatus, { isLoading: updating }] = useAdminUpdateRequestStatusMutation();
  const [addNote] = useAdminAddRequestNoteMutation();

  const [assessForm, setAssessForm] = useState({ additionalCostNaira: '', additionalCostNote: '' });
  const [rejectNote, setRejectNote] = useState('');
  const [adminNote, setAdminNote] = useState('');

  if (isLoading) return <Loader />;
  const request = data?.request;
  if (!request) return <div className="p-10">Request not found.</div>;

  const onAssess = async (e) => {
    e.preventDefault();
    try {
      await assess({
        id: request._id,
        additionalCostAssessed: nairaToKobo(Number(assessForm.additionalCostNaira)),
        additionalCostNote: assessForm.additionalCostNote,
      }).unwrap();
      toast.success('Accepted — member notified');
      setAssessForm({ additionalCostNaira: '', additionalCostNote: '' });
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Failed');
    }
  };

  const onReject = async () => {
    if (!confirm(`Reject this request? Submission fee of ${formatNaira(request.submissionFee)} will be refunded.`)) return;
    try {
      await updateStatus({ id: request._id, status: 'rejected', note: rejectNote }).unwrap();
      toast.success('Rejected — refund initiated');
      setRejectNote('');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Failed');
    }
  };

  const onAdvance = async (to) => {
    try {
      await updateStatus({ id: request._id, status: to }).unwrap();
      toast.success(`Status → ${REQUEST_STATUS_LABEL[to]}`);
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Failed');
    }
  };

  const onNote = async (e) => {
    e.preventDefault();
    if (!adminNote.trim()) return;
    try {
      await addNote({ id: request._id, note: adminNote }).unwrap();
      setAdminNote('');
      toast.success('Note added');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Failed');
    }
  };

  const canAssess = ['submitted', 'under_review'].includes(request.status);
  const canReject = REJECTABLE.includes(request.status);
  const advanceOptions = ADVANCEABLE_FROM[request.status] || [];

  return (
    <>
      <Helmet><title>{request.requestNumber} — Admin</title></Helmet>
      <div className="p-10">
        <Link to="/admin/requests" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-6 inline-block">
          ← Requests
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">{request.requestNumber}</p>
            <h1 className="font-display text-3xl">{request.title}</h1>
          </div>
          <RequestStatusBadge status={request.status} />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <h2 className="font-display text-xl mb-3">Member</h2>
            <div className="bg-bg-secondary border border-border p-4 mb-8 text-sm">
              <p>{request.user?.firstName} {request.user?.lastName}</p>
              <p className="text-text-secondary">{request.user?.email}</p>
              {request.user?.phone && <p className="text-text-secondary">{request.user.phone}</p>}
            </div>

            <h2 className="font-display text-xl mb-3">Request</h2>
            <div className="bg-bg-secondary border border-border p-6 mb-8">
              <p className="text-sm text-text-secondary whitespace-pre-line">{request.description}</p>
              <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
                {request.brand && <><dt className="text-text-muted">Brand</dt><dd>{request.brand}</dd></>}
                {request.category && <><dt className="text-text-muted">Category</dt><dd>{request.category}</dd></>}
                <dt className="text-text-muted">Budget</dt><dd className="font-mono">{formatNaira(request.budget)}</dd>
              </dl>
              {request.additionalNotes && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-luxe text-text-muted mb-2">Member notes</p>
                  <p className="text-sm text-text-secondary whitespace-pre-line">{request.additionalNotes}</p>
                </div>
              )}
            </div>

            {request.referenceImages?.length > 0 && (
              <>
                <h2 className="font-display text-xl mb-3">References</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
                  {request.referenceImages.map((img) => (
                    <a key={img._id} href={img.url} target="_blank" rel="noreferrer">
                      <img src={img.url} alt="" className="w-full aspect-square object-cover border border-border" />
                    </a>
                  ))}
                </div>
              </>
            )}

            {canAssess && (
              <>
                <h2 className="font-display text-xl mb-3">Assess & accept</h2>
                <form onSubmit={onAssess} className="bg-bg-secondary border border-border p-6 mb-8 space-y-4">
                  <Input
                    label="Additional cost (₦)"
                    type="number"
                    value={assessForm.additionalCostNaira}
                    onChange={(e) => setAssessForm({ ...assessForm, additionalCostNaira: e.target.value })}
                  />
                  <div className="mb-5">
                    <label className="label-luxe">Explanation (shown to member)</label>
                    <textarea
                      rows={4}
                      className="input-luxe"
                      placeholder="Breakdown of sourcing cost, import, authentication, etc."
                      value={assessForm.additionalCostNote}
                      onChange={(e) => setAssessForm({ ...assessForm, additionalCostNote: e.target.value })}
                    />
                  </div>
                  <Button type="submit" loading={assessing}>Accept request</Button>
                </form>
              </>
            )}

            {canReject && (
              <>
                <h2 className="font-display text-xl mb-3">Reject (refund fee)</h2>
                <div className="bg-bg-secondary border border-border p-6 mb-8 space-y-4">
                  <div className="mb-3">
                    <label className="label-luxe">Reason (shown to member)</label>
                    <textarea
                      rows={3}
                      className="input-luxe"
                      placeholder="Why this request can't be fulfilled"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                  </div>
                  <button onClick={onReject} disabled={updating} className="btn-ghost text-status-error border-status-error/40">
                    Reject and refund {formatNaira(request.submissionFee)}
                  </button>
                </div>
              </>
            )}

            {advanceOptions.length > 0 && (
              <>
                <h2 className="font-display text-xl mb-3">Advance status</h2>
                <div className="bg-bg-secondary border border-border p-6 mb-8 flex gap-3 flex-wrap">
                  {advanceOptions.map((s) => (
                    <button key={s} onClick={() => onAdvance(s)} disabled={updating} className="btn-ghost text-xs">
                      → {REQUEST_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </>
            )}

            <h2 className="font-display text-xl mb-3">Timeline</h2>
            <div className="bg-bg-secondary border border-border p-6 mb-8 space-y-3">
              {request.statusHistory?.map((h, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{REQUEST_STATUS_LABEL[h.status] || h.status}</span>
                    <span className="text-xs text-text-muted">{new Date(h.changedAt).toLocaleString('en-NG')}</span>
                  </div>
                  {h.note && <p className="text-xs text-text-muted mt-1">{h.note}</p>}
                </div>
              ))}
            </div>

            <h2 className="font-display text-xl mb-3">Admin notes</h2>
            <div className="bg-bg-secondary border border-border p-6">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap mb-4 max-h-48 overflow-y-auto">
                {request.adminNote || '— no notes —'}
              </pre>
              <form onSubmit={onNote} className="flex gap-2">
                <input type="text" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add note…" className="input-luxe flex-1 text-sm" />
                <Button type="submit">Add</Button>
              </form>
            </div>
          </div>

          <aside className="bg-bg-secondary border border-border p-6 h-fit">
            <h3 className="font-display text-xl mb-4">Payments</h3>
            <div className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-text-muted">Submission fee</span>
                <span className="font-mono">{formatNaira(request.submissionFee)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Status</span>
                <span>{request.submissionPayment?.status || '—'}</span>
              </div>
              {request.additionalCostAssessed > 0 && (
                <>
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="text-text-muted">Additional cost</span>
                    <span className="font-mono text-gold">{formatNaira(request.additionalCostAssessed)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Status</span>
                    <span>{request.additionalPayment?.status || 'pending'}</span>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
