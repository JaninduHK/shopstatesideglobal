import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, clearAuth, setUser } from './authSlice.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// Retry once on 401 by attempting a refresh, then replay original request.
const baseQueryWithRefresh = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    const refresh = await rawBaseQuery(
      { url: '/auth/refresh-token', method: 'POST' },
      api,
      extraOptions,
    );
    if (refresh.data?.data?.accessToken) {
      api.dispatch(setCredentials({ accessToken: refresh.data.data.accessToken }));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearAuth());
    }
  }
  return result;
};

const unwrap = (response) => response.data;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithRefresh,
  tagTypes: ['Me'],
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: unwrap,
    }),
    verifyEmail: builder.mutation({
      query: (token) => ({ url: `/auth/verify-email/${token}`, method: 'POST' }),
      transformResponse: unwrap,
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrap,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
          localStorage.setItem('hasSession', '1');
        } catch {
          /* handled by caller */
        }
      },
      invalidatesTags: ['Me'],
    }),
    refreshToken: builder.mutation({
      query: () => ({ url: '/auth/refresh-token', method: 'POST' }),
      transformResponse: unwrap,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ accessToken: data.accessToken }));
        } catch {
          /* silent */
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      transformResponse: unwrap,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearAuth());
          localStorage.removeItem('hasSession');
        }
      },
      invalidatesTags: ['Me'],
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
      transformResponse: unwrap,
    }),
    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `/auth/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
      transformResponse: unwrap,
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      transformResponse: unwrap,
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) dispatch(setUser(data.user));
        } catch {
          /* not logged in */
        }
      },
    }),
  }),
});

export const {
  useRegisterMutation,
  useVerifyEmailMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
} = authApi;
