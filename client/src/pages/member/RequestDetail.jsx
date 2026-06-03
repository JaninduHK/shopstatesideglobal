import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  useGetRequestQuery,
  usePayAdditionalMutation,
  useVerifyAdditionalMutation,
} from '../../features/requests/requestsApi.js';
import { usePaystack } from '../../hooks/usePaystack.js';
import { Loader } from '../../components/common/Loader.jsx';
import {
  RequestStatusBadge,
  REQUEST_STATUS_LABEL,
} from '../../components/request/RequestStatusBadge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

export function RequestDetail() {
  const { id } = useParams();
  const { data, isLoading } = useGetRequestQuery(id);
  const [payAdditional, { isLoading: paying }] = usePayAdditionalMutation();
  const [verifyAdditional] = useVerifyAdditionalMutation();
  const { pay } = usePaystack();

  if (isLoading) return <Loader />;
  const request = data?.request;
  if (!request) return <div className="container-luxe py-32 text-center">Request not found.</div>;

  const onPay = async () => {
    try {
      const init = await payAdditional(request._id).unwrap();
      pay({
        accessCode: init.accessCode,
        authorizationUrl: init.authorizationUrl,
        onSuccess: async (tx) => {
          try {
            await verifyAdditional({ id: request._id, reference: tx.reference || init.reference }).unwrap();
            toast.success('Payment received');
          } catch (err) {
            toast.error(err?.data?.error?.message || 'Verification failed');
          }
        },
        onClose: () => toast('Payment cancelled', { icon: '◇' }),
      });
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not start payment');
    }
  };

  const isRejected = request.status === 'rejected';
  const awaitingPayment = request.status === 'awaiting_additional_payment';

  return (
    <>
      <Helmet><title>{request.requestNumber} — State Side Global</title></Helmet>
      <div className="container-luxe py-12">
        <Link to="/member/requests" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-6 inline-block">
          ← All requests
        </Link>

        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">{request.requestNumber}</p>
            <h1 className="font-display text-4xl">{request.title}</h1>
          </div>
          <RequestStatusBadge status={request.status} />
        </div>

        {awaitingPayment && (
          <div className="bg-bg-secondary border-l-2 border-gold p-6 mb-8">
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">Action required</p>
            <h3 className="font-display text-2xl mb-2">Pay {formatNaira(request.additionalCostAssessed)} to begin sourcing</h3>
            <p className="text-sm text-text-secondary mb-4">{request.additionalCostNote}</p>
            <Button onClick={onPay} loading={paying}>Pay additional cost</Button>
          </div>
        )}

        {isRejected && (
          <div className="bg-bg-secondary border-l-2 border-status-error p-6 mb-8">
            <p className="text-xs uppercase tracking-luxe text-status-error mb-2">Not accepted</p>
            <p className="text-sm text-text-secondary">
              Your submission fee of {formatNaira(request.submissionFee)} is being refunded.
              {request.submissionPayment?.refundedAt
                ? ` Refund initiated ${new Date(request.submissionPayment.refundedAt).toLocaleDateString('en-NG')}.`
                : ''}
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-10">
          <div>
            <h2 className="font-display text-xl mb-3">Details</h2>
            <div className="bg-bg-secondary border border-border p-6 mb-8">
              <p className="text-sm text-text-secondary whitespace-pre-line">{request.description}</p>
              <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
                {request.brand && <><dt className="text-text-muted">Brand</dt><dd>{request.brand}</dd></>}
                {request.category && <><dt className="text-text-muted">Category</dt><dd>{request.category}</dd></>}
                <dt className="text-text-muted">Budget</dt><dd className="font-mono">{formatNaira(request.budget)}</dd>
              </dl>
              {request.additionalNotes && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-luxe text-text-muted mb-2">Notes</p>
                  <p className="text-sm text-text-secondary whitespace-pre-line">{request.additionalNotes}</p>
                </div>
              )}
            </div>

            {request.referenceImages?.length > 0 && (
              <>
                <h2 className="font-display text-xl mb-3">Reference images</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
                  {request.referenceImages.map((img) => (
                    <a key={img._id} href={img.url} target="_blank" rel="noreferrer">
                      <img src={img.url} alt="" className="w-full aspect-square object-cover border border-border" />
                    </a>
                  ))}
                </div>
              </>
            )}

            <h2 className="font-display text-xl mb-3">Timeline</h2>
            <div className="bg-bg-secondary border border-border p-6 space-y-3">
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
