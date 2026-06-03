import mongoose from 'mongoose';
import { Brand } from '../../models/Brand.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { uniqueSlug } from '../../utils/slug.js';

export const listBrands = catchAsync(async (req, res) => {
  const brands = await Brand.find({ deletedAt: null }).sort({ name: 1 }).lean();
  return ok(res, { brands });
});

export const createBrand = catchAsync(async (req, res) => {
  const { name } = req.body;
  const exists = await Brand.findOne({ name });
  if (exists) throw ApiError.conflict('Brand already exists');

  const slug = await uniqueSlug(Brand, name);
  const brand = await Brand.create({ ...req.body, slug });
  return created(res, { brand });
});

export const updateBrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');
  const brand = await Brand.findOne({ _id: id, deletedAt: null });
  if (!brand) throw ApiError.notFound('Brand not found');
  if (req.body.name && req.body.name !== brand.name) {
    brand.slug = await uniqueSlug(Brand, req.body.name, { ignoreId: brand._id });
  }
  Object.assign(brand, req.body);
  await brand.save();
  return ok(res, { brand });
});

export const deleteBrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  const brand = await Brand.findOne({ _id: id, deletedAt: null });
  if (!brand) throw ApiError.notFound('Brand not found');
  brand.deletedAt = new Date();
  brand.isActive = false;
  await brand.save();
  return noContent(res);
});
