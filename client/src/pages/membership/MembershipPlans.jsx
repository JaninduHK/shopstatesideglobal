import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth.js';
import { usePaystack } from '../../hooks/usePaystack.js';
import {
  useGetPlansQuery,
  useSubscribeMutation,
  useVerifyPaymentMutation,
} from '../../features/membership/membershipApi.js';
import { Button } from '../../components/common/Button.jsx';
import { Loader } from '../../components/common/Loader.jsx';
import { PricingCard } from '../../components/membership/PricingCard.jsx';
import { AddOnCard } from '../../components/membership/AddOnCard.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

export function MembershipPlans() {
  const { user, hasActiveMembership } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useGetPlansQuery();
  const [subscribe, { isLoading: subscribing }] = useSubscribeMutation();
  const [verify] = useVerifyPaymentMutation();
  const { pay } = usePaystack();

  const ownedAddons = user?.membership?.addOns || [];
  const [selectedAddons, setSelectedAddons] = useState(new Set());

  const total = useMemo(() => {
    if (!data) return 0;
    let t = data.plans.basic.monthly;
    if (selectedAddons.has('addon1')) t += data.addOns.addon1.monthly;
    if (selectedAddons.has('addon2')) t += data.addOns.addon2.monthly;
    return t;
  }, [data, selectedAddons]);

  if (isLoading || !data) return <Loader label="Loading plans" />;

  const toggle = (id) => {
    if (ownedAddons.includes(id)) return;
    setSelectedAddons((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user?.emailVerified) {
      toast.error('Verify your email first');
      return;
    }
    try {
      const init = await subscribe({ addOns: [...selectedAddons] }).unwrap();
      pay({
        accessCode: init.accessCode,
        authorizationUrl: init.authorizationUrl,
        onSuccess: async (tx) => {
          try {
            await verify({ reference: tx.reference || init.reference }).unwrap();
            toast.success('Welcome to the Inner Circle.');
            navigate('/membership/success', { replace: true });
          } catch (err) {
            toast.error(err?.data?.error?.message || 'Verification failed');
          }
        },
        onClose: () => toast('Payment cancelled', { icon: '◇' }),
      });
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not start checkout');
    }
  };

  return (
    <>
      <Helmet><title>Membership — State Side Global</title></Helmet>
      <div className="container-luxe py-20">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-luxe text-gold mb-3">
            {hasActiveMembership ? 'Manage Membership' : 'Become a Member'}
          </p>
          <h1 className="font-display text-5xl">The Inner Circle</h1>
          <p className="mt-6 max-w-xl mx-auto text-text-secondary">
            Reserved for those who know the difference. Cancel anytime.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <PricingCard plan={data.plans.basic} />
          <AddOnCard
            addon={data.addOns.addon1}
            selected={selectedAddons.has('addon1')}
            owned={ownedAddons.includes('addon1')}
            onToggle={() => toggle('addon1')}
          />
          <AddOnCard
            addon={data.addOns.addon2}
            selected={selectedAddons.has('addon2')}
            owned={ownedAddons.includes('addon2')}
            onToggle={() => toggle('addon2')}
          />
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-8 max-w-3xl mx-auto">
          <div>
            <p className="text-xs uppercase tracking-luxe text-text-muted">Total today</p>
            <div className="font-display text-3xl">
              {formatNaira(total)}
              <span className="text-text-muted text-sm ml-2">/ month</span>
            </div>
          </div>
          <Button onClick={handleSubmit} loading={subscribing}>
            {hasActiveMembership ? 'Renew' : 'Continue to payment'}
          </Button>
        </div>

        <p className="text-center text-xs text-text-muted mt-8">
          You will be charged {formatNaira(total)} today and again every 30 days. Cancel anytime.
        </p>
      </div>
    </>
  );
}
