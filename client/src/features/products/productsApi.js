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

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery,
  tagTypes: ['Product', 'Wishlist', 'Catalog'],
  endpoints: (builder) => ({
    listProducts: builder.query({
      query: (params) => ({ url: '/products', params }),
      transformResponse: (r) => ({ products: r.data.products, meta: r.meta }),
      providesTags: ['Product'],
    }),
    getProduct: builder.query({
      query: (slug) => `/products/${slug}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, slug) => [{ type: 'Product', id: slug }],
    }),
    getFeatured: builder.query({
      query: () => '/products/featured',
      transformResponse: unwrap,
    }),
    getNewArrivals: builder.query({
      query: () => '/products/new-arrivals',
      transformResponse: unwrap,
    }),
    getFlashSale: builder.query({
      query: () => '/products/flash-sale',
      transformResponse: unwrap,
    }),
    getWishlist: builder.query({
      query: () => '/wishlist',
      transformResponse: unwrap,
      providesTags: ['Wishlist'],
    }),
    addToWishlist: builder.mutation({
      query: (productId) => ({ url: `/wishlist/${productId}`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['Wishlist'],
    }),
    removeFromWishlist: builder.mutation({
      query: (productId) => ({ url: `/wishlist/${productId}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['Wishlist'],
    }),
    listBrands: builder.query({
      query: () => '/catalog/brands',
      transformResponse: unwrap,
      providesTags: ['Catalog'],
    }),
    listCategories: builder.query({
      query: () => '/catalog/categories',
      transformResponse: unwrap,
      providesTags: ['Catalog'],
    }),
  }),
});

export const {
  useListProductsQuery,
  useGetProductQuery,
  useGetFeaturedQuery,
  useGetNewArrivalsQuery,
  useGetFlashSaleQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useListBrandsQuery,
  useListCategoriesQuery,
} = productsApi;
