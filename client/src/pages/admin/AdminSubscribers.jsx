import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import {
  useAdminListSubscribersQuery,
  useAdminUpdateSubscriberTagsMutation,
  useAdminDeleteSubscriberMutation,
} from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';

export function AdminSubscribers() {
  const [filters, setFilters] = useState({ page: 1, limit: 100, isActive: '' });
  const [q, setQ] = useState('');
  const { data, isFetching } = useAdminListSubscribersQuery({ ...filters, q });
  const [updateTags] = useAdminUpdateSubscriberTagsMutation();
  const [deleteSub] = useAdminDeleteSubscriberMutation();

  const onTagsBlur = async (sub, value) => {
    const tags = value.split(',').map((t) => t.trim()).filter(Boolean);
    try { await updateTags({ id: sub._id, tags }).unwrap(); toast.success('Tags saved'); }
    catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this subscriber?')) return;
    try { await deleteSub(id).unwrap(); toast.success('Deleted'); }
    catch (err) { toast.error(err?.data?.error?.message || 'Failed'); }
  };

  const downloadCSV = () => {
    const url = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1') + '/admin/subscribers/export';
    window.open(url, '_blank');
  };

  return (
    <>
      <Helmet><title>Subscribers — Admin</title></Helmet>
      <div className="p-10">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl">Subscribers</h1>
            <p className="text-text-muted text-sm">{data?.meta?.total ?? '…'} total · public sign-up flow ships in Phase 7</p>
          </div>
          <button onClick={downloadCSV} className="btn-ghost text-xs">Export CSV</button>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <input type="search" placeholder="Email or name" value={q} onChange={(e) => setQ(e.target.value)} className="input-luxe text-sm max-w-xs" />
          <select className="input-luxe text-sm max-w-xs" value={filters.isActive} onChange={(e) => setFilters({ ...filters, isActive: e.target.value, page: 1 })}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Pending / unsubscribed</option>
          </select>
        </div>

        {isFetching ? <Loader /> : (
          <div className="bg-bg-secondary border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Source</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Tags (comma-sep)</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="text-right p-4"></th>
                </tr>
              </thead>
              <tbody>
                {data?.subscribers?.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-text-muted text-sm text-center">No subscribers yet.</td></tr>
                ) : data?.subscribers?.map((s) => (
                  <tr key={s._id} className="border-b border-border/50">
                    <td className="p-4">{s.email}</td>
                    <td className="p-4 text-text-secondary">{s.firstName || '—'}</td>
                    <td className="p-4 text-text-secondary">{s.source}</td>
                    <td className="p-4 text-text-secondary text-xs">{s.isActive ? 'active' : s.unsubscribedAt ? 'unsubscribed' : 'pending'}</td>
                    <td className="p-4">
                      <input
                        defaultValue={(s.tags || []).join(', ')}
                        onBlur={(e) => onTagsBlur(s, e.target.value)}
                        className="bg-bg-tertiary border border-border text-xs px-2 py-1 w-48"
                      />
                    </td>
                    <td className="p-4 text-text-muted text-xs">{new Date(s.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => onDelete(s._id)} className="text-status-error text-xs hover:underline">Delete</button>
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
