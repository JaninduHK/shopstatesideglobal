import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth.js';
import { usePaystack } from '../../hooks/usePaystack.js';
import {
  useGetPlansQuery,
  useGetTransactionsQuery,
  useCancelMembershipMutation,
  usePurchaseAddonMutation,
  useVerifyPaymentMutation,
} from '../../features/membership/membershipApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import {
  MembershipStatusCard,
  TransactionsTable,
} from '../../components/membership/MembershipStatusCard.jsx';
import { AddOnCard } from '../../components/membership/AddOnCard.jsx';

export function MembershipManage() {
  const { user } = useAuth();
  const { data: plansData, isLoading: plansLoading } = useGetPlansQuery();
  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery();
  const [cancel, { isLoading: cancelling }] = useCancelMembershipMutation();
  const [purchaseAddon, { isLoading: purchasing }] = usePurchaseAddonMutation();
  const [verify] = useVerifyPaymentMutation();
  const { pay } = usePaystack();

  if (plansLoading || txLoading || !plansData) return <Loader label="Loading" />;

  const ownedAddons = user?.membership?.addOns || [];

  const handleCancel = async () => {
    if (!confirm('Cancel auto-renewal? Your access continues until the current period ends.')) return;
    try {
      await cancel().unwrap();
      toast.success('Auto-renewal cancelled');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not cancel');
    }
  };

  const handlePurchaseAddon = async (addonId) => {
    try {
      const init = await purchaseAddon({ addOn: addonId }).unwrap();
      pay({
        accessCode: init.accessCode,
        authorizationUrl: init.authorizationUrl,
        onSuccess: async (tx) => {
          try {
            await verify({ reference: tx.reference || init.reference }).unwrap();
            toast.success('Add-on unlocked');
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
      <div className="container-luxe py-16">
        <p className="text-xs uppercase tracking-luxe text-gold mb-2">Your account</p>
        <h1 className="font-display text-4xl mb-12">Membership</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          <MembershipStatusCard user={user} onCancel={handleCancel} cancelling={cancelling} />

          <div>
            <h2 className="font-display text-2xl mb-6">Add-ons available</h2>
            <div className="space-y-4">
              {!ownedAddons.includes('addon1') && (
                <AddOnCard
                  addon={plansData.addOns.addon1}
                  selected={false}
                  owned={false}
                  onToggle={() => !purchasing && handlePurchaseAddon('addon1')}
                />
              )}
              {!ownedAddons.includes('addon2') && (
                <AddOnCard
                  addon={plansData.addOns.addon2}
                  selected={false}
                  owned={false}
                  onToggle={() => !purchasing && handlePurchaseAddon('addon2')}
                />
              )}
              {ownedAddons.length === 2 && (
                <p className="text-text-muted text-sm">You have all available add-ons.</p>
              )}
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl mb-6">Billing history</h2>
          <TransactionsTable items={txData?.transactions} />
        </section>
      </div>
    </>
  );
}
