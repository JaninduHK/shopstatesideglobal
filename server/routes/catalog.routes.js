import { Router } from 'express';
import { Brand } from '../models/Brand.js';
import { Category } from '../models/Category.js';
import { authenticate, requireActiveMembership } from '../middleware/auth.middleware.js';
import { ok } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';

export const catalogRouter = Router();

catalogRouter.use(authenticate, requireActiveMembership);

catalogRouter.get(
  '/brands',
  catchAsync(async (req, res) => {
    const brands = await Brand.find({ isActive: true, deletedAt: null })
      .sort({ name: 1 })
      .select('name slug tier logo')
      .lean();
    return ok(res, { brands });
  }),
);

catalogRouter.get(
  '/categories',
  catchAsync(async (req, res) => {
    const categories = await Category.find({ isActive: true, deletedAt: null })
      .sort({ parent: 1, sortOrder: 1, name: 1 })
      .select('name slug parent image sortOrder')
      .lean();
    return ok(res, { categories });
  }),
);
