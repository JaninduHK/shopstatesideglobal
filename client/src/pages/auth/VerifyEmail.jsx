import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AuthCard } from '../../components/auth/AuthCard.jsx';
import { useVerifyEmailMutation } from '../../features/auth/authApi.js';

export function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verify] = useVerifyEmailMutation();
  const [state, setState] = useState('verifying');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await verify(token).unwrap();
        setState('success');
        setTimeout(() => navigate('/auth/login?verified=1', { replace: true }), 1800);
      } catch {
        setState('error');
      }
    })();
  }, [token, verify, navigate]);

  return (
    <>
      <Helmet><title>Verify email — State Side Global</title></Helmet>
      <AuthCard
        title={
          state === 'verifying'
            ? 'Verifying…'
            : state === 'success'
              ? 'Email verified.'
              : 'Verification failed'
        }
        footer={<Link to="/auth/login" className="text-gold hover:text-gold-light">Back to sign in</Link>}
      >
        {state === 'verifying' && (
          <p className="text-text-secondary text-sm">Checking your verification link…</p>
        )}
        {state === 'success' && (
          <p className="text-text-secondary text-sm">
            Welcome to State Side Global. Redirecting you to sign in…
          </p>
        )}
        {state === 'error' && (
          <p className="text-status-error text-sm">
            This link is invalid or has expired. Please register again or request a new link.
          </p>
        )}
      </AuthCard>
    </>
  );
}
