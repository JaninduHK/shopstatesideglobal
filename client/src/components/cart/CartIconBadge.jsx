import { useDispatch, useSelector } from 'react-redux';
import { openDrawer, selectCartCount } from '../../features/cart/cartSlice.js';

export function CartIconBadge() {
  const count = useSelector(selectCartCount);
  const dispatch = useDispatch();
  return (
    <button
      onClick={() => dispatch(openDrawer())}
      className="relative text-text-secondary hover:text-text-primary px-2"
      aria-label="Open cart"
    >
      <span className="text-xs uppercase tracking-luxe">Cart</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-2 w-4 h-4 bg-gold text-bg-primary text-[10px] font-bold flex items-center justify-center rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}
