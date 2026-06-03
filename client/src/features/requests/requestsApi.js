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

export const requestsApi = createApi({
  reducerPath: 'requestsApi',
  baseQuery,
  tagTypes: ['Request', 'AdminRequest'],
  endpoints: (b) => ({
    submitRequest: b.mutation({
      query: (body) => ({ url: '/special-requests', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Request'],
    }),
    verifyRequestPayment: b.mutation({
      query: (body) => ({ url: '/special-requests/verify-payment', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Request'],
    }),
    listRequests: b.query({
      query: (params) => ({ url: '/special-requests', params }),
      transformResponse: (r) => ({ requests: r.data.requests, meta: r.meta }),
      providesTags: ['Request'],
    }),
    getRequest: b.query({
      query: (id) => `/special-requests/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'Request', id }],
    }),
    payAdditional: b.mutation({
      query: (id) => ({ url: `/special-requests/${id}/pay-additional`, method: 'POST' }),
      transformResponse: unwrap,
    }),
    verifyAdditional: b.mutation({
      query: ({ id, reference }) => ({
        url: `/special-requests/${id}/pay-additional/verify`,
        method: 'POST',
        body: { reference },
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['Request', { type: 'Request', id }],
    }),
    requestUploadSignature: b.query({
      query: () => '/special-requests/upload-signature',
      transformResponse: unwrap,
    }),

    // Admin
    adminListRequests: b.query({
      query: (params) => ({ url: '/admin/special-requests', params }),
      transformResponse: (r) => ({ requests: r.data.requests, meta: r.meta }),
      providesTags: ['AdminRequest'],
    }),
    adminGetRequest: b.query({
      query: (id) => `/admin/special-requests/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'AdminRequest', id }],
    }),
    adminAssessRequest: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/special-requests/${id}/assess`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['AdminRequest', { type: 'AdminRequest', id }],
    }),
    adminUpdateRequestStatus: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/special-requests/${id}/status`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['AdminRequest', { type: 'AdminRequest', id }],
    }),
    adminAddRequestNote: b.mutation({
      query: ({ id, note }) => ({ url: `/admin/special-requests/${id}/note`, method: 'POST', body: { note } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AdminRequest', id }],
    }),
  }),
});

export const {
  useSubmitRequestMutation,
  useVerifyRequestPaymentMutation,
  useListRequestsQuery,
  useGetRequestQuery,
  usePayAdditionalMutation,
  useVerifyAdditionalMutation,
  useLazyRequestUploadSignatureQuery,
  useAdminListRequestsQuery,
  useAdminGetRequestQuery,
  useAdminAssessRequestMutation,
  useAdminUpdateRequestStatusMutation,
  useAdminAddRequestNoteMutation,
} = requestsApi;
