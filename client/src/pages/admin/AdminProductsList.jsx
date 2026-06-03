import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  useAdminListProductsQuery,
  useAdminDeleteProductMutation,
  useAdminPublishProductMutation,
} from '../../features/admin/adminApi.js';
import { formatNaira } from '../../utils/formatCurrency.js';
import { Loader } from '../../components/common/Loader.jsx';

export function AdminProductsList() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 50 });
  const { data, isFetching, refetch } = useAdminListProductsQuery(filters);
  const [deleteProduct] = useAdminDeleteProductMutation();
  const [publish] = useAdminPublishProductMutation();

  const onDelete = async (id) => {
    if (!confirm('Delete this product? (Soft delete — recoverable in DB.)')) return;
    try {
      await deleteProduct(id).unwrap();
      toast.success('Deleted');
      refetch();
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete');
    }
  };

  const onPublish = async (p) => {
    try {
      await publish({ id: p._id, isPublished: !p.isPublished }).unwrap();
      toast.success(p.isPublished ? 'Unpublished' : 'Published');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not update');
    }
  };

  return (
    <>
      <Helmet><title>Products — Admin</title></Helmet>
      <div className="p-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl">Products</h1>
            <p className="text-text-muted text-sm mt-1">
              {data?.meta?.total ?? '…'} total
            </p>
          </div>
          <Link to="/admin/products/new" className="btn-gold text-xs">
            New product
          </Link>
        </div>

        <div className="mb-6 flex gap-3">
          {['', 'published', 'draft', 'sold'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilters({ ...filters, status: s, page: 1 })}
              className={`text-xs uppercase tracking-luxe px-4 py-2 border ${
                filters.status === s
                  ? 'border-gold text-gold'
                  : 'border-border text-text-secondary hover:border-border-highlight'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {isFetching ? (
          <Loader />
        ) : (
          <div className="bg-bg-secondary border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-luxe text-text-muted">
                <tr>
                  <th className="text-left p-4 w-20"></th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Brand</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-right p-4">Price</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.products?.map((p) => {
                  const primary = p.images?.find((i) => i.isPrimary) || p.images?.[0];
                  return (
                    <tr key={p._id} className="border-b border-border/50">
                      <td className="p-3">
                        {primary ? (
                          <img src={primary.url} alt="" className="w-12 h-12 object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-bg-tertiary" />
                        )}
                      </td>
                      <td className="p-4">
                        <Link to={`/admin/products/${p._id}`} className="text-text-primary hover:text-gold">
                          {p.title}
                        </Link>
                        <p className="text-xs text-text-muted font-mono">{p.sku}</p>
                      </td>
                      <td className="p-4 text-text-secondary">{p.brand?.name || '—'}</td>
                      <td className="p-4 text-text-secondary">{p.category}</td>
                      <td className="p-4 text-right font-mono">{formatNaira(p.price)}</td>
                      <td className="p-4 text-center">
                        <span className={
                          p.sold ? 'text-text-muted' :
                          p.isPublished ? 'text-status-success' : 'text-status-warning'
                        }>
                          {p.sold ? 'sold' : p.isPublished ? 'published' : 'draft'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onPublish(p)}
                          className="text-xs text-gold hover:text-gold-light mr-4"
                        >
                          {p.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => onDelete(p._id)} className="text-xs text-status-error hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
