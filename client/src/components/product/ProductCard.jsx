import { Link } from 'react-router-dom';
import { formatNaira } from '../../utils/formatCurrency.js';
import { useAuth } from '../../hooks/useAuth.js';

export function ProductCard({ product }) {
  const { hasAddon } = useAuth();
  const primary = product.images?.find((i) => i.isPrimary) || product.images?.[0];
  const locked = product.requiresAddon && product.requiresAddon !== 'none' && !hasAddon(product.requiresAddon);

  return (
    <Link
      to={`/member/shop/${product.slug}`}
      className="group block bg-bg-secondary border border-border hover:border-border-highlight transition-colors duration-200 ease-luxe"
    >
      <div className="aspect-[3/4] bg-bg-tertiary relative overflow-hidden">
        {primary ? (
          <img
            src={primary.url}
            alt={primary.alt || product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-luxe"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg-tertiary to-bg-secondary" />
        )}
        {locked && (
          <div className="absolute inset-0 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="text-gold text-2xl mb-2">◆</div>
              <p className="text-xs uppercase tracking-luxe text-gold">
                Add-on required
              </p>
            </div>
          </div>
        )}
        {product.sold && (
          <div className="absolute top-3 left-3 bg-bg-primary/90 text-xs uppercase tracking-luxe text-text-muted px-3 py-1">
            Sold
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-luxe text-text-muted">
          {product.brand?.name || '—'}
        </p>
        <h3 className="mt-1 text-sm text-text-primary line-clamp-2 leading-snug">
          {product.title}
        </h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-gold">{formatNaira(product.price)}</span>
          {product.originalRetailPrice > product.price && (
            <span className="font-mono text-xs text-text-muted line-through">
              {formatNaira(product.originalRetailPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
