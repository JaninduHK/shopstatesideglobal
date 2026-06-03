import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  useAdminListSubscriptionsQuery,
  useAdminListAllTransactionsQuery,
  useAdminGetMembershipSettingsQuery,
  useAdminUpdateMembershipSettingsMutation,
} from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { formatNaira, koboToNaira, nairaToKobo } from '../../utils/formatCurrency.js';

export function AdminMemberships() {
  const { data: subs, isLoading: subsLoading } = useAdminListSubscriptionsQuery({ status: 'active' });
  const { data: txs, isLoading: txsLoading } = useAdminListAllTransactionsQuery({});
  const { data: settings } = useAdminGetMembershipSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useAdminUpdateMembershipSettingsMutation();

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings) {
      setForm({
        pricingBasicNaira: koboToNaira(settings.pricing.basic),
        pricingAddon1Naira: koboToNaira(settings.pricing.addon1),
        pricingAddon2Naira: koboToNaira(settings.pricing.addon2),
        pricingRequestFeeNaira: koboToNaira(settings.pricing.requestFee),
        addon1Name: settings.addon1.name,
        addon2Name: settings.addon2.name,
      });
    }
  }, [settings]);

  const onSave = async (e) => {
    e.preventDefault();
    try {
      await updateSettings({
        pricingBasic: nairaToKobo(Number(form.pricingBasicNaira)),
        pricingAddon1: nairaToKobo(Number(form.pricingAddon1Naira)),
        pricingAddon2: nairaToKobo(Number(form.pricingAddon2Naira)),
        pricingRequestFee: nairaToKobo(Number(form.pricingRequestFeeNaira)),
        addon1Name: form.addon1Name,
        addon2Name: form.addon2Name,
      }).unwrap();
      toast.success('Saved');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Save failed');
    }
  };

  return (
    <>
      <Helmet><title>Memberships — Admin</title></Helmet>
      <div className="p-10">
        <h1 className="font-display text-3xl mb-8">Memberships</h1>

        <h2 className="font-display text-2xl mb-4">Pricing & add-ons</h2>
        {form && (
          <form onSubmit={onSave} className="bg-bg-secondary border border-border p-6 mb-12 grid sm:grid-cols-2 gap-x-6 max-w-3xl">
            <Input label="Basic monthly (₦)" type="number" value={form.pricingBasicNaira} onChange={(e) => setForm({ ...form, pricingBasicNaira: e.target.value })} />
            <Input label="Special request fee (₦)" type="number" value={form.pricingRequestFeeNaira} onChange={(e) => setForm({ ...form, pricingRequestFeeNaira: e.target.value })} />
            <Input label="Add-on 1 name" value={form.addon1Name} onChange={(e) => setForm({ ...form, addon1Name: e.target.value })} />
            <Input label="Add-on 1 monthly (₦)" type="number" value={form.pricingAddon1Naira} onChange={(e) => setForm({ ...form, pricingAddon1Naira: e.target.value })} />
            <Input label="Add-on 2 name" value={form.addon2Name} onChange={(e) => setForm({ ...form, addon2Name: e.target.value })} />
            <Input label="Add-on 2 monthly (₦)" type="number" value={form.pricingAddon2Naira} onChange={(e) => setForm({ ...form, pricingAddon2Naira: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save settings</Button></div>
          </form>
        )}

        <h2 className="font-display text-2xl mb-4">Active subscriptions</h2>
        {subsLoading ? <Loader /> : (
          <div className="bg-bg-secondary border border-border mb-12">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Plan</th>
                  <th className="text-left p-4">Next billing</th>
                  <th className="text-center p-4">Auto-renew</th>
                </tr>
              </thead>
              <tbody>
                {subs?.subscriptions?.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-text-muted text-sm">None.</td></tr>
                ) : subs?.subscriptions?.map((s) => (
                  <tr key={s._id} className="border-b border-border/50">
                    <td className="p-4">
                      <Link to={`/admin/members/${s._id}`} className="text-text-primary hover:text-gold">
                        {s.firstName} {s.lastName}
                      </Link>
                      <p className="text-xs text-text-muted">{s.email}</p>
                    </td>
                    <td className="p-4 text-text-secondary">{s.membership?.plan}</td>
                    <td className="p-4 text-text-secondary">{s.membership?.endDate ? new Date(s.membership.endDate).toLocaleDateString('en-NG') : '—'}</td>
                    <td className="p-4 text-center text-xs">{s.membership?.autoRenew ? 'on' : 'off'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="font-display text-2xl mb-4">Transactions</h2>
        {txsLoading ? <Loader /> : (
          <div className="bg-bg-secondary border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Member</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-right p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {txs?.transactions?.map((t) => (
                  <tr key={t._id} className="border-b border-border/50">
                    <td className="p-4 text-text-secondary">{new Date(t.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="p-4 text-text-secondary">
                      {t.user?.firstName} {t.user?.lastName}
                      <p className="text-xs text-text-muted">{t.user?.email}</p>
                    </td>
                    <td className="p-4 text-text-secondary">{t.type}</td>
                    <td className="p-4 text-right font-mono">{formatNaira(t.amount)}</td>
                    <td className="p-4 text-right">
                      <span className={t.status === 'paid' ? 'text-status-success text-xs' : 'text-text-muted text-xs'}>{t.status}</span>
                    </td>
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
