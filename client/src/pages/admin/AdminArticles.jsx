import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import {
  useAdminListArticlesQuery,
  useAdminCreateArticleMutation,
  useAdminUpdateArticleMutation,
  useAdminDeleteArticleMutation,
} from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';

export function AdminArticles() {
  const { data, isLoading } = useAdminListArticlesQuery();
  const [create, { isLoading: creating }] = useAdminCreateArticleMutation();
  const [update] = useAdminUpdateArticleMutation();
  const [deleteA] = useAdminDeleteArticleMutation();
  const [form, setForm] = useState({ title: '', excerpt: '', body: '', isPublished: false });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await create(form).unwrap();
      setForm({ title: '', excerpt: '', body: '', isPublished: false });
      toast.success('Article created');
    } catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const onTogglePublish = async (a) => {
    try { await update({ id: a._id, isPublished: !a.isPublished }).unwrap(); }
    catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this article?')) return;
    try { await deleteA(id).unwrap(); toast.success('Deleted'); }
    catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <Helmet><title>Articles — Admin</title></Helmet>
      <div className="p-10 max-w-4xl">
        <h1 className="font-display text-3xl mb-8">Articles & press</h1>

        <form onSubmit={onCreate} className="bg-bg-secondary border border-border p-6 mb-12 space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <div className="mb-3">
            <label className="label-luxe">Body (plain text or HTML)</label>
            <textarea rows={6} className="input-luxe" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-gold" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Publish immediately
          </label>
          <Button type="submit" loading={creating}>Add article</Button>
        </form>

        <h2 className="font-display text-2xl mb-4">All articles</h2>
        <div className="bg-bg-secondary border border-border">
          {data?.articles?.length === 0 ? (
            <p className="p-6 text-text-muted text-sm">No articles yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data?.articles?.map((a) => (
                  <tr key={a._id} className="border-b border-border/50 last:border-b-0">
                    <td className="p-4">
                      <p className="text-text-primary">{a.title}</p>
                      <p className="text-xs text-text-muted font-mono">{a.slug}</p>
                    </td>
                    <td className="p-4 text-xs">
                      <span className={a.isPublished ? 'text-status-success' : 'text-status-warning'}>
                        {a.isPublished ? 'published' : 'draft'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => onTogglePublish(a)} className="text-xs text-gold hover:text-gold-light mr-4">
                        {a.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => onDelete(a._id)} className="text-xs text-status-error hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
