import mongoose from 'mongoose';
import { Product } from '../../models/Product.js';
import { Brand } from '../../models/Brand.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { uniqueSlug, generateSku } from '../../utils/slug.js';
import { signedUploadParams, destroyAsset } from '../../services/cloudinary.service.js';

export const adminListProducts = catchAsync(async (req, res) => {
  const {
    q, category, brand, status, requiresAddon,
    page = 1, limit = 50, sort = 'newest',
  } = req.query;

  const filter = { deletedAt: null };
  if (q && q.trim()) filter.$text = { $search: q.trim() };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (requiresAddon) filter.requiresAddon = requiresAddon;
  if (status === 'published') filter.isPublished = true;
  if (status === 'draft') filter.isPublished = false;
  if (status === 'sold') filter.sold = true;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
  };

  const total = await Product.countDocuments(filter);
  const items = await Product.find(filter)
    .sort(sortMap[sort] || sortMap.newest)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('brand', 'name slug')
    .lean();

  return ok(res, { products: items }, { page: Number(page), limit: Number(limit), total });
});

export const adminGetProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');
  const product = await Product.findOne({ _id: id, deletedAt: null }).populate('brand');
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, { product });
});

export const adminCreateProduct = catchAsync(async (req, res) => {
  const body = req.body;
  const brand = await Brand.findById(body.brand);
  if (!brand) throw ApiError.badRequest('Brand not found');

  const slug = await uniqueSlug(Product, body.title);
  const sku = body.sku?.trim() || generateSku(brand.slug);

  // ensure exactly one primary image (or default to first)
  const images = (body.images || []).map((img, idx) => ({
    ...img,
    isPrimary: img.isPrimary === true || (idx === 0 && !body.images.some((i) => i.isPrimary)),
  }));
  // collapse to exactly one primary
  let primarySet = false;
  for (const img of images) {
    if (img.isPrimary && !primarySet) primarySet = true;
    else img.isPrimary = false;
  }
  if (images.length && !primarySet) images[0].isPrimary = true;

  const product = await Product.create({ ...body, slug, sku, images });
  return created(res, { product });
});

export const adminUpdateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');

  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');

  const body = req.body;
  if (body.title && body.title !== product.title) {
    product.slug = await uniqueSlug(Product, body.title, { ignoreId: product._id });
  }
  Object.assign(product, body);
  await product.save();
  return ok(res, { product });
});

export const adminDeleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');

  product.deletedAt = new Date();
  product.isPublished = false;
  await product.save();

  // Best-effort Cloudinary cleanup of all images
  Promise.all((product.images || []).map((img) => destroyAsset(img.publicId))).catch(() => {});

  return noContent(res);
});

export const adminAddImages = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');

  for (const img of req.body.images) {
    product.images.push(img);
  }
  if (!product.images.some((i) => i.isPrimary) && product.images.length) {
    product.images[0].isPrimary = true;
  }
  await product.save();
  return ok(res, { product });
});

export const adminRemoveImage = catchAsync(async (req, res) => {
  const { id, imageId } = req.params;
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');

  const img = product.images.id(imageId);
  if (!img) throw ApiError.notFound('Image not found');
  await destroyAsset(img.publicId);
  img.deleteOne();
  if (!product.images.some((i) => i.isPrimary) && product.images.length) {
    product.images[0].isPrimary = true;
  }
  await product.save();
  return ok(res, { product });
});

export const adminSetPrimaryImage = catchAsync(async (req, res) => {
  const { id, imageId } = req.params;
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');
  let found = false;
  for (const img of product.images) {
    if (img._id.toString() === imageId) {
      img.isPrimary = true;
      found = true;
    } else {
      img.isPrimary = false;
    }
  }
  if (!found) throw ApiError.notFound('Image not found');
  await product.save();
  return ok(res, { product });
});

export const adminPublish = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isPublished } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { isPublished: !!isPublished },
    { new: true },
  );
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, { product });
});

export const adminFeature = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { isFeatured: !!isFeatured },
    { new: true },
  );
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, { product });
});

export const adminUploadSignature = catchAsync(async (req, res) => {
  const folder = req.query.folder || 'products';
  const params = signedUploadParams({ folder });
  return ok(res, params);
});
