import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistReducer, persistStore,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer from '../features/auth/authSlice.js';
import cartReducer from '../features/cart/cartSlice.js';
import { authApi } from '../features/auth/authApi.js';
import { membershipApi } from '../features/membership/membershipApi.js';
import { productsApi } from '../features/products/productsApi.js';
import { ordersApi } from '../features/orders/ordersApi.js';
import { requestsApi } from '../features/requests/requestsApi.js';
import { adminApi } from '../features/admin/adminApi.js';

const cartPersistConfig = {
  key: 'cart',
  version: 1,
  storage,
  whitelist: ['items'],   // never persist drawerOpen
};

const rootReducer = combineReducers({
  auth: authReducer,
  cart: persistReducer(cartPersistConfig, cartReducer),
  [authApi.reducerPath]: authApi.reducer,
  [membershipApi.reducerPath]: membershipApi.reducer,
  [productsApi.reducerPath]: productsApi.reducer,
  [ordersApi.reducerPath]: ordersApi.reducer,
  [requestsApi.reducerPath]: requestsApi.reducer,
  [adminApi.reducerPath]: adminApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (gdm) =>
    gdm({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      authApi.middleware,
      membershipApi.middleware,
      productsApi.middleware,
      ordersApi.middleware,
      requestsApi.middleware,
      adminApi.middleware,
    ),
});

export const persistor = persistStore(store);
