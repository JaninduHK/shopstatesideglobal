import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  closeDrawer, removeItem, setQuantity,
  selectCartItems, selectCartSubtotal, selectDrawerOpen,
} from '../../features/cart/cartSlice.js';
import { formatNaira } from '../../utils/formatCurrency.js';

export function CartDrawer() {
  const open = useSelector(selectDrawerOpen);
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const close = () => dispatch(closeDrawer());

  const goToCheckout = () => {
    close();
    navigate('/member/checkout');
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={close}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-bg-secondary border-l border-border z-50 flex flex-col transform transition-transform duration-300 ease-luxe
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display text-2xl">Your cart</h2>
          <button onClick={close} className="text-text-secondary hover:text-text-primary text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gold text-3xl mb-3">◇</div>
              <p className="text-text-secondary text-sm mb-6">Your cart is empty.</p>
              <Link to="/member/shop" onClick={close} className="btn-ghost text-xs">
                Browse the collection
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-4 pb-4 border-b border-border/60">
                <Link to={`/member/shop/${item.slug}`} onClick={close} className="flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-20 h-24 object-cover" />
                  ) : (
                    <div className="w-20 h-24 bg-bg-tertiary" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/member/shop/${item.slug}`} onClick={close} className="text-sm text-text-primary hover:text-gold line-clamp-2">
                    {item.title}
                  </Link>
                  <p className="font-mono text-gold text-sm mt-1">{formatNaira(item.price)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center border border-border">
                      <button
                        onClick={() => dispatch(setQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
                        className="px-2 text-text-secondary hover:text-text-primary"
                      >−</button>
                      <span className="px-3 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(setQuantity({ productId: item.productId, quantity: item.quantity + 1 }))}
                        className="px-2 text-text-secondary hover:text-text-primary"
                      >+</button>
                    </div>
                    <button
                      onClick={() => dispatch(removeItem(item.productId))}
                      className="text-xs text-status-error hover:underline ml-auto"
                    >Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-luxe text-text-muted">Subtotal</span>
              <span className="font-mono text-lg text-gold">{formatNaira(subtotal)}</span>
            </div>
            <p className="text-xs text-text-muted">Shipping and tax calculated at checkout.</p>
            <button onClick={goToCheckout} className="btn-gold w-full">Checkout</button>
          </div>
        )}
      </aside>
    </>
  );
}
