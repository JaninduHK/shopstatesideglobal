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

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery,
  tagTypes: [
    'AdminProduct', 'AdminBrand', 'AdminCategory',
    'AdminMember', 'AdminDashboard', 'AdminSubscriber',
    'AdminSettings', 'AdminMembershipSettings', 'AdminArticle', 'AdminFAQ',
    'AdminSubscription', 'AdminMembershipTx',
  ],
  endpoints: (b) => ({
    // ---- Products ----
    adminListProducts: b.query({
      query: (params) => ({ url: '/admin/products', params }),
      transformResponse: (r) => ({ products: r.data.products, meta: r.meta }),
      providesTags: ['AdminProduct'],
    }),
    adminGetProduct: b.query({
      query: (id) => `/admin/products/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'AdminProduct', id }],
    }),
    adminCreateProduct: b.mutation({
      query: (body) => ({ url: '/admin/products', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminProduct'],
    }),
    adminUpdateProduct: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/products/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['AdminProduct', { type: 'AdminProduct', id }],
    }),
    adminDeleteProduct: b.mutation({
      query: (id) => ({ url: `/admin/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminProduct'],
    }),
    adminAddImages: b.mutation({
      query: ({ id, images }) => ({ url: `/admin/products/${id}/images`, method: 'POST', body: { images } }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AdminProduct', id }],
    }),
    adminRemoveImage: b.mutation({
      query: ({ id, imageId }) => ({ url: `/admin/products/${id}/images/${imageId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AdminProduct', id }],
    }),
    adminSetPrimary: b.mutation({
      query: ({ id, imageId }) => ({ url: `/admin/products/${id}/images/${imageId}/primary`, method: 'PATCH' }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AdminProduct', id }],
    }),
    adminPublishProduct: b.mutation({
      query: ({ id, isPublished }) => ({ url: `/admin/products/${id}/publish`, method: 'PATCH', body: { isPublished } }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminProduct'],
    }),
    adminFeatureProduct: b.mutation({
      query: ({ id, isFeatured }) => ({ url: `/admin/products/${id}/feature`, method: 'PATCH', body: { isFeatured } }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminProduct'],
    }),
    adminUploadSignature: b.query({
      query: (folder = 'products') => ({ url: '/admin/products/upload-signature', params: { folder } }),
      transformResponse: unwrap,
    }),

    // ---- Brands ----
    adminListBrands: b.query({
      query: () => '/admin/brands',
      transformResponse: unwrap,
      providesTags: ['AdminBrand'],
    }),
    adminCreateBrand: b.mutation({
      query: (body) => ({ url: '/admin/brands', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminBrand'],
    }),
    adminUpdateBrand: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/brands/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminBrand'],
    }),
    adminDeleteBrand: b.mutation({
      query: (id) => ({ url: `/admin/brands/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminBrand'],
    }),

    // ---- Categories ----
    adminListCategories: b.query({
      query: () => '/admin/categories',
      transformResponse: unwrap,
      providesTags: ['AdminCategory'],
    }),
    adminCreateCategory: b.mutation({
      query: (body) => ({ url: '/admin/categories', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCategory'],
    }),
    adminUpdateCategory: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/categories/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCategory'],
    }),
    adminDeleteCategory: b.mutation({
      query: (id) => ({ url: `/admin/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminCategory'],
    }),

    // ---- Dashboard ----
    adminGetStats: b.query({
      query: () => '/admin/dashboard/stats',
      transformResponse: unwrap,
      providesTags: ['AdminDashboard'],
    }),
    adminGetRevenueChart: b.query({
      query: (range = '30d') => `/admin/dashboard/revenue-chart?range=${range}`,
      transformResponse: unwrap,
    }),
    adminGetMembershipGrowth: b.query({
      query: (range = '30d') => `/admin/dashboard/membership-growth?range=${range}`,
      transformResponse: unwrap,
    }),
    adminGetRecentActivity: b.query({
      query: () => '/admin/dashboard/recent-activity?limit=20',
      transformResponse: unwrap,
    }),

    // ---- Members ----
    adminListMembers: b.query({
      query: (params) => ({ url: '/admin/members', params }),
      transformResponse: (r) => ({ members: r.data.members, meta: r.meta }),
      providesTags: ['AdminMember'],
    }),
    adminGetMember: b.query({
      query: (id) => `/admin/members/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'AdminMember', id }],
    }),
    adminSuspendMember: b.mutation({
      query: ({ id, suspended, reason }) => ({
        url: `/admin/members/${id}/suspend`, method: 'PATCH', body: { suspended, reason },
      }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['AdminMember', { type: 'AdminMember', id }],
    }),
    adminOverrideMembership: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/members/${id}/membership`, method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: (_r, _e, { id }) => ['AdminMember', { type: 'AdminMember', id }],
    }),
    adminEmailMember: b.mutation({
      query: ({ id, subject, body }) => ({
        url: `/admin/members/${id}/email`, method: 'POST', body: { subject, body },
      }),
      transformResponse: unwrap,
    }),
    adminDeleteMember: b.mutation({
      query: (id) => ({ url: `/admin/members/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminMember'],
    }),

    // ---- Memberships ----
    adminListSubscriptions: b.query({
      query: (params) => ({ url: '/admin/memberships/subscriptions', params }),
      transformResponse: (r) => ({ subscriptions: r.data.subscriptions, meta: r.meta }),
      providesTags: ['AdminSubscription'],
    }),
    adminListAllTransactions: b.query({
      query: (params) => ({ url: '/admin/memberships/transactions', params }),
      transformResponse: (r) => ({ transactions: r.data.transactions, meta: r.meta }),
      providesTags: ['AdminMembershipTx'],
    }),
    adminGetMembershipSettings: b.query({
      query: () => '/admin/memberships/settings',
      transformResponse: unwrap,
      providesTags: ['AdminMembershipSettings'],
    }),
    adminUpdateMembershipSettings: b.mutation({
      query: (body) => ({ url: '/admin/memberships/settings', method: 'PATCH', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminMembershipSettings'],
    }),

    // ---- Subscribers ----
    adminListSubscribers: b.query({
      query: (params) => ({ url: '/admin/subscribers', params }),
      transformResponse: (r) => ({ subscribers: r.data.subscribers, meta: r.meta }),
      providesTags: ['AdminSubscriber'],
    }),
    adminUpdateSubscriberTags: b.mutation({
      query: ({ id, tags }) => ({ url: `/admin/subscribers/${id}/tags`, method: 'PATCH', body: { tags } }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminSubscriber'],
    }),
    adminDeleteSubscriber: b.mutation({
      query: (id) => ({ url: `/admin/subscribers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminSubscriber'],
    }),

    // ---- Settings ----
    adminGetSettings: b.query({
      query: () => '/admin/settings',
      transformResponse: unwrap,
      providesTags: ['AdminSettings'],
    }),
    adminPatchSettings: b.mutation({
      query: (updates) => ({ url: '/admin/settings', method: 'PATCH', body: { updates } }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminSettings'],
    }),

    // ---- Articles ----
    adminListArticles: b.query({
      query: () => '/admin/content/articles',
      transformResponse: unwrap,
      providesTags: ['AdminArticle'],
    }),
    adminGetArticle: b.query({
      query: (id) => `/admin/content/articles/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'AdminArticle', id }],
    }),
    adminCreateArticle: b.mutation({
      query: (body) => ({ url: '/admin/content/articles', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminArticle'],
    }),
    adminUpdateArticle: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/content/articles/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminArticle'],
    }),
    adminDeleteArticle: b.mutation({
      query: (id) => ({ url: `/admin/content/articles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminArticle'],
    }),

    // ---- FAQ ----
    adminListFAQ: b.query({
      query: () => '/admin/content/faq',
      transformResponse: unwrap,
      providesTags: ['AdminFAQ'],
    }),
    adminCreateFAQ: b.mutation({
      query: (body) => ({ url: '/admin/content/faq', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminFAQ'],
    }),
    adminUpdateFAQ: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/content/faq/${id}`, method: 'PUT', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminFAQ'],
    }),
    adminDeleteFAQ: b.mutation({
      query: (id) => ({ url: `/admin/content/faq/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminFAQ'],
    }),
  }),
});

export const {
  useAdminListProductsQuery,
  useAdminGetProductQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminDeleteProductMutation,
  useAdminAddImagesMutation,
  useAdminRemoveImageMutation,
  useAdminSetPrimaryMutation,
  useAdminPublishProductMutation,
  useAdminFeatureProductMutation,
  useLazyAdminUploadSignatureQuery,
  useAdminListBrandsQuery,
  useAdminCreateBrandMutation,
  useAdminUpdateBrandMutation,
  useAdminDeleteBrandMutation,
  useAdminListCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminUpdateCategoryMutation,
  useAdminDeleteCategoryMutation,

  useAdminGetStatsQuery,
  useAdminGetRevenueChartQuery,
  useAdminGetMembershipGrowthQuery,
  useAdminGetRecentActivityQuery,

  useAdminListMembersQuery,
  useAdminGetMemberQuery,
  useAdminSuspendMemberMutation,
  useAdminOverrideMembershipMutation,
  useAdminEmailMemberMutation,
  useAdminDeleteMemberMutation,

  useAdminListSubscriptionsQuery,
  useAdminListAllTransactionsQuery,
  useAdminGetMembershipSettingsQuery,
  useAdminUpdateMembershipSettingsMutation,

  useAdminListSubscribersQuery,
  useAdminUpdateSubscriberTagsMutation,
  useAdminDeleteSubscriberMutation,

  useAdminGetSettingsQuery,
  useAdminPatchSettingsMutation,

  useAdminListArticlesQuery,
  useAdminGetArticleQuery,
  useAdminCreateArticleMutation,
  useAdminUpdateArticleMutation,
  useAdminDeleteArticleMutation,

  useAdminListFAQQuery,
  useAdminCreateFAQMutation,
  useAdminUpdateFAQMutation,
  useAdminDeleteFAQMutation,
} = adminApi;
