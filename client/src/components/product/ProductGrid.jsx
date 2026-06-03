import { ProductCard } from './ProductCard.jsx';

export function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-bg-secondary border border-border animate-pulse">
            <div className="aspect-[3/4] bg-bg-tertiary" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-1/3 bg-bg-tertiary" />
              <div className="h-3 w-2/3 bg-bg-tertiary" />
              <div className="h-4 w-1/2 bg-bg-tertiary mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!products?.length) {
    return (
      <div className="py-24 text-center text-text-muted">
        <div className="text-gold text-3xl mb-3">◆</div>
        <p className="text-sm uppercase tracking-luxe">No pieces match your filters</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}
