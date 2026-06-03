import { useListBrandsQuery, useListCategoriesQuery } from '../../features/products/productsApi.js';

const CONDITIONS = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'women', label: "Women's" },
  { value: 'men', label: "Men's" },
  { value: 'handbags', label: 'Handbags' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'watches', label: 'Watches' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'home', label: 'Home' },
  { value: 'art', label: 'Art' },
  { value: 'kids', label: 'Kids' },
];

export function ProductFilters({ filters, setFilters }) {
  const { data: brandsData } = useListBrandsQuery();
  useListCategoriesQuery(); // prefetch for nav usage

  const update = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const toggleBrand = (slug) => {
    const set = new Set(filters.brand?.split(',').filter(Boolean) || []);
    set.has(slug) ? set.delete(slug) : set.add(slug);
    update({ brand: [...set].join(',') || undefined });
  };
  const toggleCondition = (val) => {
    const set = new Set(filters.condition?.split(',').filter(Boolean) || []);
    set.has(val) ? set.delete(val) : set.add(val);
    update({ condition: [...set].join(',') || undefined });
  };

  return (
    <aside className="space-y-8 lg:sticky lg:top-20">
      <div>
        <h3 className="text-xs uppercase tracking-luxe text-text-muted mb-3">Category</h3>
        <select
          value={filters.category || ''}
          onChange={(e) => update({ category: e.target.value || undefined })}
          className="input-luxe text-sm"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-luxe text-text-muted mb-3">Brand</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {brandsData?.brands?.map((b) => {
            const checked = filters.brand?.split(',').includes(b._id);
            return (
              <label key={b._id} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={() => toggleBrand(b._id)}
                  className="accent-gold"
                />
                <span className={checked ? 'text-text-primary' : 'text-text-secondary'}>{b.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-luxe text-text-muted mb-3">Condition</h3>
        <div className="space-y-2">
          {CONDITIONS.map((c) => {
            const checked = filters.condition?.split(',').includes(c.value);
            return (
              <label key={c.value} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={() => toggleCondition(c.value)}
                  className="accent-gold"
                />
                <span className={checked ? 'text-text-primary' : 'text-text-secondary'}>{c.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-luxe text-text-muted mb-3">Price (₦)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin || ''}
            onChange={(e) => update({ priceMin: e.target.value ? Number(e.target.value) * 100 : undefined })}
            className="input-luxe text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax || ''}
            onChange={(e) => update({ priceMax: e.target.value ? Number(e.target.value) * 100 : undefined })}
            className="input-luxe text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFilters({ sort: 'newest', page: 1, limit: 24 })}
        className="text-xs uppercase tracking-luxe text-gold hover:text-gold-light"
      >
        Clear filters
      </button>
    </aside>
  );
}
