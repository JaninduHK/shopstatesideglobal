import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import {
  useAdminListBrandsQuery,
  useAdminCreateBrandMutation,
  useAdminUpdateBrandMutation,
  useAdminDeleteBrandMutation,
} from '../../features/admin/adminApi.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Loader } from '../../components/common/Loader.jsx';

const TIERS = ['ultra-luxury', 'luxury', 'premium'];

export function AdminBrands() {
  const { data, isLoading } = useAdminListBrandsQuery();
  const [create, { isLoading: creating }] = useAdminCreateBrandMutation();
  const [update] = useAdminUpdateBrandMutation();
  const [deleteB] = useAdminDeleteBrandMutation();
  const [form, setForm] = useState({ name: '', tier: 'luxury' });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await create(form).unwrap();
      setForm({ name: '', tier: 'luxury' });
      toast.success('Brand created');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not create');
    }
  };

  const onTier = async (id, tier) => {
    try {
      await update({ id, tier }).unwrap();
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Save failed');
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this brand?')) return;
    try {
      await deleteB(id).unwrap();
      toast.success('Deleted');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <Helmet><title>Brands — Admin</title></Helmet>
      <div className="p-10 max-w-3xl">
        <h1 className="font-display text-3xl mb-8">Brands</h1>

        <form onSubmit={onCreate} className="bg-bg-secondary border border-border p-6 mb-8 grid sm:grid-cols-[1fr_180px_auto] gap-4 items-end">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="mb-5">
            <label className="label-luxe">Tier</label>
            <select className="input-luxe" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              {TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Button type="submit" loading={creating}>Add</Button>
        </form>

        <div className="bg-bg-secondary border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Slug</th>
                <th className="text-left p-4">Tier</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.brands?.map((b) => (
                <tr key={b._id} className="border-b border-border/50">
                  <td className="p-4 text-text-primary">{b.name}</td>
                  <td className="p-4 text-text-muted font-mono text-xs">{b.slug}</td>
                  <td className="p-4">
                    <select
                      value={b.tier}
                      onChange={(e) => onTier(b._id, e.target.value)}
                      className="bg-bg-tertiary border border-border text-text-primary px-2 py-1 text-xs"
                    >
                      {TIERS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => onDelete(b._id)} className="text-xs text-status-error hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
