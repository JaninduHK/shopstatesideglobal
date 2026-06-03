import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useGetWishlistQuery } from '../../features/products/productsApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { ProductCard } from '../../components/product/ProductCard.jsx';

export function Wishlist() {
  const { data, isLoading } = useGetWishlistQuery();
  if (isLoading) return <Loader label="Loading wishlist" />;
  const products = data?.products || [];

  return (
    <>
      <Helmet><title>Wishlist — State Side Global</title></Helmet>
      <div className="container-luxe py-16">
        <p className="text-xs uppercase tracking-luxe text-gold mb-2">Saved</p>
        <h1 className="font-display text-4xl mb-12">Wishlist</h1>

        {products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-gold text-3xl mb-3">♡</div>
            <p className="text-text-secondary mb-6">Nothing saved yet.</p>
            <Link to="/member/shop" className="btn-ghost">Browse the collection</Link>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
