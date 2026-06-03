import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useListProductsQuery } from '../../features/products/productsApi.js';
import { ProductGrid } from '../../components/product/ProductGrid.jsx';
import { ProductFilters } from '../../components/product/ProductFilters.jsx';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price low → high' },
  { value: 'price_desc', label: 'Price high → low' },
  { value: 'most_wished', label: 'Most wished' },
];

export function Shop() {
  const [filters, setFilters] = useState({ sort: 'newest', page: 1, limit: 24 });
  const [searchInput, setSearchInput] = useState('');

  const { data, isFetching } = useListProductsQuery(filters);

  const onSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: searchInput || undefined, page: 1 }));
  };

  return (
    <>
      <Helmet><title>The Collection — State Side Global</title></Helmet>
      <div className="container-luxe py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">The Collection</p>
            <h1 className="font-display text-4xl">Shop</h1>
          </div>
          <form onSubmit={onSearch} className="flex gap-2 flex-1 max-w-md">
            <input
              type="search"
              placeholder="Search by brand, style…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-luxe flex-1 text-sm"
            />
            <button type="submit" className="btn-ghost text-xs py-3 px-6">Search</button>
          </form>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-10">
          <ProductFilters filters={filters} setFilters={setFilters} />
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-xs uppercase tracking-luxe text-text-muted">
                {data?.meta?.total ?? '—'} pieces
              </p>
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
                className="bg-bg-secondary border border-border text-text-primary px-4 py-2 text-xs uppercase tracking-luxe"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <ProductGrid products={data?.products} loading={isFetching} />

            {data?.meta?.pages > 1 && (
              <div className="mt-12 flex justify-center gap-2">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Prev
                </button>
                <span className="px-4 py-2 text-xs uppercase tracking-luxe text-text-secondary">
                  Page {filters.page} of {data.meta.pages}
                </span>
                <button
                  disabled={filters.page >= data.meta.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
