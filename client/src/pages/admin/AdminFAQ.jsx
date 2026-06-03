import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import {
  useAdminListFAQQuery,
  useAdminCreateFAQMutation,
  useAdminDeleteFAQMutation,
} from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';

export function AdminFAQ() {
  const { data, isLoading } = useAdminListFAQQuery();
  const [create, { isLoading: creating }] = useAdminCreateFAQMutation();
  const [deleteF] = useAdminDeleteFAQMutation();
  const [form, setForm] = useState({ question: '', answer: '', section: 'general', sortOrder: 0 });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await create(form).unwrap();
      setForm({ question: '', answer: '', section: 'general', sortOrder: 0 });
      toast.success('FAQ added');
    } catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this FAQ item?')) return;
    try { await deleteF(id).unwrap(); toast.success('Deleted'); }
    catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  if (isLoading) return <Loader />;

  const bySection = (data?.items || []).reduce((acc, item) => {
    acc[item.section] = acc[item.section] || [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <>
      <Helmet><title>FAQ — Admin</title></Helmet>
      <div className="p-10 max-w-3xl">
        <h1 className="font-display text-3xl mb-8">FAQ</h1>

        <form onSubmit={onCreate} className="bg-bg-secondary border border-border p-6 mb-12 space-y-4">
          <Input label="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          <div className="mb-3">
            <label className="label-luxe">Answer</label>
            <textarea rows={4} className="input-luxe" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </div>
          <Button type="submit" loading={creating}>Add FAQ</Button>
        </form>

        {Object.keys(bySection).length === 0 ? (
          <p className="text-text-muted text-sm">No FAQ items yet.</p>
        ) : (
          Object.entries(bySection).map(([section, items]) => (
            <section key={section} className="mb-10">
              <h2 className="font-display text-xl mb-4">{section}</h2>
              <div className="bg-bg-secondary border border-border divide-y divide-border/50">
                {items.map((it) => (
                  <div key={it._id} className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-text-primary mb-1">{it.question}</p>
                        <p className="text-sm text-text-secondary">{it.answer}</p>
                      </div>
                      <button onClick={() => onDelete(it._id)} className="text-status-error text-xs hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
