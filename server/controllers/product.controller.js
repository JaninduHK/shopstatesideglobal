import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ADDON_GATE } from '@ssg/shared/enums';

/**
 * Build the addon-visibility filter for the current user.
 * Members without an add-on never see addon-gated products.
 */
function addonFilter(user) {
  const owned = user?.membership?.addOns || [];
  const allowed = [ADDON_GATE.NONE, ...owned];
  return { requiresAddon: { $in: allowed } };
}

function baseMemberFilter(user) {
  return {
    isPublished: true,
    deletedAt: null,
    ...addonFilter(user),
  };
}

export const listProducts = catchAsync(async (req, res) => {
  const {
    q, category, brand, condition, priceMin, priceMax,
    size, color, addon, sort, page, limit, inStock,
  } = req.query;

  const filter = baseMemberFilter(req.user);

  if (category) filter.category = category;
  if (brand) filter.brand = { $in: Array.isArray(brand) ? brand : [brand] };
  if (condition) filter.condition = { $in: Array.isArray(condition) ? condition : [condition] };
  if (size) filter.size = size;
  if (color) filter.color = color;
  if (inStock === true) filter.sold = false;

  if (priceMin || priceMax) {
    filter.price = {};
    if (priceMin) filter.price.$gte = priceMin;
    if (priceMax) filter.price.$lte = priceMax;
  }

  if (addon) {
    // user is explicitly asking to see addon-exclusive only — must own it
    if (!req.user.hasAddon(addon)) throw ApiError.addonRequired(addon);
    filter.requiresAddon = addon;
  }

  let query;
  if (q && q.trim()) {
    filter.$text = { $search: q.trim() };
    query = Product.find(filter, { score: { $meta: 'textScore' } });
  } else {
    query = Product.find(filter);
  }

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    most_wished: { wishlistCount: -1, createdAt: -1 },
  };
  const sortObj = q && q.trim() ? { score: { $meta: 'textScore' } } : sortMap[sort];

  const total = await Product.countDocuments(filter);
  const products = await query
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('brand', 'name slug tier')
    .lean();

  return ok(
    res,
    { products },
    { page, limit, total, pages: Math.ceil(total / limit) },
  );
});

export const getProductBySlug = catchAsync(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isPublished: true,
    deletedAt: null,
  }).populate('brand', 'name slug tier');

  if (!product) throw ApiError.notFound('Product not found');

  // Addon gate
  if (
    product.requiresAddon !== ADDON_GATE.NONE &&
    !req.user.hasAddon(product.requiresAddon)
  ) {
    throw ApiError.addonRequired(product.requiresAddon);
  }

  // Best-effort view counter (don't await; don't fail the request)
  Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(() => {});

  // Related products: same category, different product
  const related = await Product.find({
    ...baseMemberFilter(req.user),
    _id: { $ne: product._id },
    category: product.category,
  })
    .limit(4)
    .sort({ createdAt: -1 })
    .populate('brand', 'name slug')
    .lean();

  return ok(res, { product, related });
});

export const getFeatured = catchAsync(async (req, res) => {
  const products = await Product.find({
    ...baseMemberFilter(req.user),
    isFeatured: true,
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate('brand', 'name slug')
    .lean();
  return ok(res, { products });
});

export const getNewArrivals = catchAsync(async (req, res) => {
  const products = await Product.find({
    ...baseMemberFilter(req.user),
    isNewArrival: true,
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate('brand', 'name slug')
    .lean();
  return ok(res, { products });
});

export const getFlashSale = catchAsync(async (req, res) => {
  const now = new Date();
  const products = await Product.find({
    ...baseMemberFilter(req.user),
    isOnSale: true,
    $or: [{ discountEnds: null }, { discountEnds: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate('brand', 'name slug')
    .lean();
  return ok(res, { products });
});
