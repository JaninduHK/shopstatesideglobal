import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth.js';
import { useVerifyPaymentMutation } from '../../features/membership/membershipApi.js';
import { Loader } from '../../components/common/Loader.jsx';

export function MembershipSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { hasActiveMembership } = useAuth();
  const [verify] = useVerifyPaymentMutation();
  const [state, setState] = useState('verifying');
  const ran = useRef(false);
  const reference = params.get('reference') || params.get('trxref');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!reference) {
      setState(hasActiveMembership ? 'active' : 'missing');
      return;
    }
    verify({ reference })
      .unwrap()
      .then(() => setState('active'))
      .catch((err) => {
        toast.error(err?.data?.error?.message || 'Verification failed');
        setState('error');
      });
  }, [reference, verify, hasActiveMembership]);

  if (state === 'verifying') {
    return (
      <div className="container-luxe py-32 text-center">
        <Loader label="Confirming your payment" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Membership confirmed — State Side Global</title></Helmet>
      <div className="container-luxe py-32 text-center max-w-xl mx-auto">
        {state === 'active' ? (
          <>
            <div className="text-gold text-5xl mb-6">◆</div>
            <h1 className="font-display text-4xl mb-4">Welcome to the Inner Circle.</h1>
            <p className="text-text-secondary mb-10">
              Your membership is active. Receipt is on its way to your inbox.
            </p>
            <button onClick={() => navigate('/member', { replace: true })} className="btn-gold">
              Enter the collection
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl mb-4">Something went wrong</h1>
            <p className="text-text-secondary mb-6">
              We couldn&apos;t confirm your payment. Please try again or contact support.
            </p>
            <Link to="/membership/plans" className="btn-ghost">Back to plans</Link>
          </>
        )}
      </div>
    </>
  );
}
