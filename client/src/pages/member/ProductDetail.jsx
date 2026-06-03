import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import {
  useGetProductQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../features/products/productsApi.js';
import { addItem, openDrawer } from '../../features/cart/cartSlice.js';
import { Loader } from '../../components/common/Loader.jsx';
import { ProductGallery } from '../../components/product/ProductGallery.jsx';
import { ProductCard } from '../../components/product/ProductCard.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const CONDITION_LABEL = {
  new_with_tags: 'New with tags',
  excellent: 'Excellent',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
};

export function ProductDetail() {
  const { slug } = useParams();
  const { data, isLoading, error } = useGetProductQuery(slug);
  const { data: wishlistData } = useGetWishlistQuery();
  const [add] = useAddToWishlistMutation();
  const [remove] = useRemoveFromWishlistMutation();
  const dispatch = useDispatch();

  if (isLoading) return <Loader label="Loading" />;
  if (error?.data?.error?.code === 'ADDON_REQUIRED') {
    return (
      <div className="container-luxe py-32 text-center max-w-xl mx-auto">
        <div className="text-gold text-4xl mb-4">◆</div>
        <h1 className="font-display text-3xl mb-3">Add-on required</h1>
        <p className="text-text-secondary mb-8">
          This piece is reserved for members with the {error.data.error.details?.addon} add-on.
        </p>
        <Link to="/member/membership" className="btn-gold">View add-ons</Link>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="container-luxe py-32 text-center">
        <p className="text-text-muted">Product not found.</p>
        <Link to="/member/shop" className="btn-ghost mt-6">Back to shop</Link>
      </div>
    );
  }

  const product = data.product;
  const wishlisted = wishlistData?.products?.some((p) => p._id === product._id);

  const handleAddToCart = () => {
    const primary = product.images?.find((i) => i.isPrimary) || product.images?.[0];
    dispatch(addItem({
      productId: product._id,
      title: product.title,
      slug: product.slug,
      image: primary?.url || '',
      price: product.discountPrice || product.price,
      requiresAddon: product.requiresAddon,
    }));
    dispatch(openDrawer());
  };

  const toggleWishlist = async () => {
    try {
      if (wishlisted) {
        await remove(product._id).unwrap();
        toast.success('Removed from wishlist');
      } else {
        await add(product._id).unwrap();
        toast.success('Saved to wishlist');
      }
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not update wishlist');
    }
  };

  return (
    <>
      <Helmet><title>{product.title} — State Side Global</title></Helmet>
      <div className="container-luxe py-12">
        <Link to="/member/shop" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-8 inline-block">
          ← Back to shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          <ProductGallery images={product.images} title={product.title} />

          <div>
            <p className="text-xs uppercase tracking-luxe text-gold mb-2">{product.brand?.name}</p>
            <h1 className="font-display text-4xl leading-tight">{product.title}</h1>

            <div className="mt-6 flex items-baseline gap-4">
              <span className="font-mono text-3xl text-gold">{formatNaira(product.price)}</span>
              {product.originalRetailPrice > product.price && (
                <span className="font-mono text-sm text-text-muted line-through">
                  Retail {formatNaira(product.originalRetailPrice)}
                </span>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-border space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Condition</span>
                <span>{CONDITION_LABEL[product.condition] || product.condition}</span>
              </div>
              {product.color && <div className="flex justify-between"><span className="text-text-muted">Colour</span><span>{product.color}</span></div>}
              {product.material && <div className="flex justify-between"><span className="text-text-muted">Material</span><span>{product.material}</span></div>}
              {product.size && <div className="flex justify-between"><span className="text-text-muted">Size</span><span>{product.size}</span></div>}
              {product.dimensions && <div className="flex justify-between"><span className="text-text-muted">Dimensions</span><span>{product.dimensions}</span></div>}
              <div className="flex justify-between">
                <span className="text-text-muted">SKU</span>
                <span className="font-mono text-xs">{product.sku}</span>
              </div>
            </div>

            <div className="mt-8 bg-bg-secondary border-l-2 border-gold p-4 text-sm">
              <p className="text-xs uppercase tracking-luxe text-gold mb-1">Authenticated</p>
              <p className="text-text-secondary">
                Verified by our luxury authentication experts before listing.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={handleAddToCart} className="btn-gold flex-1" disabled={product.sold}>
                {product.sold ? 'Sold' : 'Add to cart'}
              </button>
              <button onClick={toggleWishlist} className="btn-ghost px-6">
                {wishlisted ? '♥' : '♡'}
              </button>
            </div>

            {product.description && (
              <div className="mt-12">
                <h2 className="font-display text-xl mb-3">Description</h2>
                <p className="text-text-secondary leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {data.related?.length > 0 && (
          <section className="mt-24">
            <h2 className="font-display text-2xl mb-8">You may also like</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {data.related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
