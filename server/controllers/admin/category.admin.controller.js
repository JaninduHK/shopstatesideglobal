import mongoose from 'mongoose';
import { Category } from '../../models/Category.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { uniqueSlug } from '../../utils/slug.js';

export const listCategories = catchAsync(async (req, res) => {
  const categories = await Category.find({ deletedAt: null })
    .sort({ parent: 1, sortOrder: 1, name: 1 })
    .lean();
  return ok(res, { categories });
});

export const createCategory = catchAsync(async (req, res) => {
  const { name } = req.body;
  const slug = await uniqueSlug(Category, name);
  const category = await Category.create({
    ...req.body,
    parent: req.body.parent || null,
    slug,
  });
  return created(res, { category });
});

export const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');
  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) throw ApiError.notFound('Category not found');
  if (req.body.name && req.body.name !== category.name) {
    category.slug = await uniqueSlug(Category, req.body.name, { ignoreId: category._id });
  }
  Object.assign(category, req.body);
  if (req.body.parent === '') category.parent = null;
  await category.save();
  return ok(res, { category });
});

export const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) throw ApiError.notFound('Category not found');

  const children = await Category.countDocuments({ parent: id, deletedAt: null });
  if (children > 0) throw ApiError.conflict('Category has children — delete those first');

  category.deletedAt = new Date();
  category.isActive = false;
  await category.save();
  return noContent(res);
});
