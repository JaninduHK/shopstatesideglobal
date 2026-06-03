import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import {
  useAdminListCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminUpdateCategoryMutation,
  useAdminDeleteCategoryMutation,
} from '../../features/admin/adminApi.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Loader } from '../../components/common/Loader.jsx';

export function AdminCategories() {
  const { data, isLoading } = useAdminListCategoriesQuery();
  const [create, { isLoading: creating }] = useAdminCreateCategoryMutation();
  const [update] = useAdminUpdateCategoryMutation();
  const [deleteC] = useAdminDeleteCategoryMutation();
  const [form, setForm] = useState({ name: '', parent: '' });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await create({ name: form.name, parent: form.parent || null }).unwrap();
      setForm({ name: '', parent: '' });
      toast.success('Category created');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not create');
    }
  };

  const onSortChange = async (id, sortOrder) => {
    try {
      await update({ id, sortOrder: Number(sortOrder) || 0 }).unwrap();
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Save failed');
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteC(id).unwrap();
      toast.success('Deleted');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete');
    }
  };

  if (isLoading) return <Loader />;

  const roots = data?.categories?.filter((c) => !c.parent) || [];
  const childrenOf = (id) => data?.categories?.filter((c) => String(c.parent) === String(id)) || [];

  return (
    <>
      <Helmet><title>Categories — Admin</title></Helmet>
      <div className="p-10 max-w-3xl">
        <h1 className="font-display text-3xl mb-8">Categories</h1>

        <form onSubmit={onCreate} className="bg-bg-secondary border border-border p-6 mb-8 grid sm:grid-cols-[1fr_220px_auto] gap-4 items-end">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="mb-5">
            <label className="label-luxe">Parent (optional)</label>
            <select className="input-luxe" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
              <option value="">— top level —</option>
              {roots.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" loading={creating}>Add</Button>
        </form>

        <div className="bg-bg-secondary border border-border p-6 space-y-2">
          {roots.map((c) => (
            <div key={c._id}>
              <div className="flex items-center justify-between border-b border-border py-3">
                <div>
                  <span className="text-text-primary">{c.name}</span>
                  <span className="text-text-muted text-xs font-mono ml-3">{c.slug}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    defaultValue={c.sortOrder}
                    onBlur={(e) => onSortChange(c._id, e.target.value)}
                    className="w-16 bg-bg-tertiary border border-border text-xs px-2 py-1"
                  />
                  <button onClick={() => onDelete(c._id)} className="text-xs text-status-error hover:underline">Delete</button>
                </div>
              </div>
              {childrenOf(c._id).map((child) => (
                <div key={child._id} className="flex items-center justify-between border-b border-border/50 pl-6 py-2">
                  <div>
                    <span className="text-text-secondary">↳ {child.name}</span>
                    <span className="text-text-muted text-xs font-mono ml-3">{child.slug}</span>
                  </div>
                  <button onClick={() => onDelete(child._id)} className="text-xs text-status-error hover:underline">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ))}
          {roots.length === 0 && (
            <p className="text-text-muted text-sm">No categories yet — add one above.</p>
          )}
        </div>
      </div>
    </>
  );
}
