import Joi from 'joi';
import {
  PRODUCT_CATEGORY,
  PRODUCT_CONDITION,
  ADDON_GATE,
  BRAND_TIER,
} from '@ssg/shared/enums';

const csv = (joi) =>
  Joi.alternatives().try(
    Joi.array().items(joi),
    Joi.string().custom((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  );

export const listProductsSchema = Joi.object({
  q: Joi.string().trim().allow(''),
  category: Joi.string().valid(...Object.values(PRODUCT_CATEGORY)),
  brand: csv(Joi.string()),
  condition: csv(Joi.string().valid(...Object.values(PRODUCT_CONDITION))),
  priceMin: Joi.number().integer().min(0),
  priceMax: Joi.number().integer().min(0),
  size: Joi.string(),
  color: Joi.string(),
  addon: Joi.string().valid('addon1', 'addon2'),
  sort: Joi.string().valid('newest', 'price_asc', 'price_desc', 'most_wished').default('newest'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(24),
  inStock: Joi.boolean(),
});

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().required(),
  alt: Joi.string().allow('').default(''),
  isPrimary: Joi.boolean().default(false),
});

export const createProductSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('').default(''),
  shortDescription: Joi.string().allow('').max(280).default(''),
  category: Joi.string().valid(...Object.values(PRODUCT_CATEGORY)).required(),
  subcategory: Joi.string().hex().length(24).allow(null),
  brand: Joi.string().hex().length(24).required(),
  designerTags: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string()).default([]),
  price: Joi.number().integer().min(0).required(),
  originalRetailPrice: Joi.number().integer().min(0),
  discountPrice: Joi.number().integer().min(0),
  discountEnds: Joi.date(),
  sku: Joi.string().trim(),
  condition: Joi.string().valid(...Object.values(PRODUCT_CONDITION)).required(),
  quantity: Joi.number().integer().min(0).default(1),
  images: Joi.array().items(imageSchema).default([]),
  isAuthenticated: Joi.boolean().default(true),
  authenticationDetails: Joi.object({
    authenticatedBy: Joi.string().allow(''),
    authDate: Joi.date(),
    certificateId: Joi.string().allow(''),
    notes: Joi.string().allow(''),
  }),
  size: Joi.string().allow(''),
  color: Joi.string().allow(''),
  material: Joi.string().allow(''),
  dimensions: Joi.string().allow(''),
  serialNumber: Joi.string().allow(''),
  isPublished: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  isNewArrival: Joi.boolean().default(true),
  isOnSale: Joi.boolean().default(false),
  requiresAddon: Joi.string().valid(...Object.values(ADDON_GATE)).default(ADDON_GATE.NONE),
});

export const updateProductSchema = createProductSchema.fork(
  Object.keys(createProductSchema.describe().keys),
  (s) => s.optional(),
);

export const addImagesSchema = Joi.object({
  images: Joi.array().items(imageSchema).min(1).required(),
});

export const brandSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().allow(''),
  logo: Joi.object({ url: Joi.string().uri().required(), publicId: Joi.string().required() }).allow(null),
  tier: Joi.string().valid(...Object.values(BRAND_TIER)),
  isActive: Joi.boolean(),
});

export const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  parent: Joi.string().hex().length(24).allow(null, ''),
  image: Joi.object({ url: Joi.string().uri().required(), publicId: Joi.string().required() }).allow(null),
  description: Joi.string().allow(''),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
});
