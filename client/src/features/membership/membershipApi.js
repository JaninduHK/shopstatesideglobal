import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setUser } from '../auth/authSlice.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const unwrap = (response) => response.data;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

export const membershipApi = createApi({
  reducerPath: 'membershipApi',
  baseQuery,
  tagTypes: ['Membership', 'Transactions'],
  endpoints: (builder) => ({
    getPlans: builder.query({
      query: () => '/membership/plans',
      transformResponse: unwrap,
    }),
    subscribe: builder.mutation({
      query: (body) => ({ url: '/membership/subscribe', method: 'POST', body }),
      transformResponse: unwrap,
    }),
    verifyPayment: builder.mutation({
      query: (body) => ({ url: '/membership/verify-payment', method: 'POST', body }),
      transformResponse: unwrap,
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const currentUser = getState().auth.user;
          if (currentUser && data?.membership) {
            dispatch(setUser({ ...currentUser, membership: data.membership }));
          }
        } catch {
          /* handled by caller */
        }
      },
      invalidatesTags: ['Membership', 'Transactions'],
    }),
    purchaseAddon: builder.mutation({
      query: (body) => ({ url: '/membership/add-on', method: 'POST', body }),
      transformResponse: unwrap,
    }),
    cancelMembership: builder.mutation({
      query: () => ({ url: '/membership/cancel', method: 'POST' }),
      transformResponse: unwrap,
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const currentUser = getState().auth.user;
          if (currentUser && data?.membership) {
            dispatch(setUser({ ...currentUser, membership: data.membership }));
          }
        } catch {
          /* noop */
        }
      },
      invalidatesTags: ['Membership'],
    }),
    getTransactions: builder.query({
      query: () => '/membership/transactions',
      transformResponse: unwrap,
      providesTags: ['Transactions'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useSubscribeMutation,
  useVerifyPaymentMutation,
  usePurchaseAddonMutation,
  useCancelMembershipMutation,
  useGetTransactionsQuery,
} = membershipApi;
