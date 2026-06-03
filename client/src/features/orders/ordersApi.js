import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

const unwrap = (r) => r.data;

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  baseQuery,
  tagTypes: ['Order', 'AdminOrder'],
  endpoints: (b) => ({
    createOrder: b.mutation({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Order'],
    }),
    verifyOrderPayment: b.mutation({
      query: (body) => ({ url: '/orders/verify-payment', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Order'],
    }),
    listOrders: b.query({
      query: (params) => ({ url: '/orders', params }),
      transformResponse: (r) => ({ orders: r.data.orders, meta: r.meta }),
      providesTags: ['Order'],
    }),
    getOrder: b.query({
      query: (id) => `/orders/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Order', id }],
    }),
    cancelOrder: b.mutation({
      query: (id) => ({ url: `/orders/${id}/cancel`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['Order'],
    }),

    // Admin
    adminListOrders: b.query({
      query: (params) => ({ url: '/admin/orders', params }),
      transformResponse: (r) => ({ orders: r.data.orders, meta: r.meta }),
      providesTags: ['AdminOrder'],
    }),
    adminGetOrder: b.query({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'AdminOrder', id }],
    }),
    adminUpdateOrderStatus: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/orders/${id}/status`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['AdminOrder', { type: 'AdminOrder', id }],
    }),
    adminAddOrderNote: b.mutation({
      query: ({ id, note }) => ({ url: `/admin/orders/${id}/note`, method: 'POST', body: { note } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AdminOrder', id }],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useVerifyOrderPaymentMutation,
  useListOrdersQuery,
  useGetOrderQuery,
  useCancelOrderMutation,
  useAdminListOrdersQuery,
  useAdminGetOrderQuery,
  useAdminUpdateOrderStatusMutation,
  useAdminAddOrderNoteMutation,
} = ordersApi;
