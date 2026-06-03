import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],          // { productId, title, image, price (kobo), quantity, slug, requiresAddon }
  drawerOpen: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action) {
      const item = action.payload;
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + (item.quantity || 1), 10);
      } else {
        state.items.push({ ...item, quantity: item.quantity || 1 });
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    setQuantity(state, action) {
      const { productId, quantity } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (item) item.quantity = Math.max(1, Math.min(quantity, 10));
    },
    clearCart(state) {
      state.items = [];
    },
    openDrawer(state) { state.drawerOpen = true; },
    closeDrawer(state) { state.drawerOpen = false; },
    toggleDrawer(state) { state.drawerOpen = !state.drawerOpen; },
  },
});

export const {
  addItem, removeItem, setQuantity, clearCart,
  openDrawer, closeDrawer, toggleDrawer,
} = cartSlice.actions;

export default cartSlice.reducer;

export const selectCartItems = (s) => s.cart.items;
export const selectCartCount = (s) =>
  s.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (s) =>
  s.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
export const selectDrawerOpen = (s) => s.cart.drawerOpen;
