import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ADDON_GATE } from '@ssg/shared/enums';

export const getWishlist = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    match: { isPublished: true, deletedAt: null },
    populate: { path: 'brand', select: 'name slug' },
  });
  return ok(res, { products: user.wishlist });
});

export const addToWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) throw ApiError.badRequest('Bad product id');

  const product = await Product.findOne({ _id: productId, isPublished: true, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');

  if (
    product.requiresAddon !== ADDON_GATE.NONE &&
    !req.user.hasAddon(product.requiresAddon)
  ) {
    throw ApiError.addonRequired(product.requiresAddon);
  }

  const result = await User.updateOne(
    { _id: req.user._id, wishlist: { $ne: product._id } },
    { $addToSet: { wishlist: product._id } },
  );
  if (result.modifiedCount > 0) {
    await Product.updateOne({ _id: product._id }, { $inc: { wishlistCount: 1 } });
  }
  return ok(res, { wishlisted: true });
});

export const removeFromWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) throw ApiError.badRequest('Bad product id');

  const result = await User.updateOne(
    { _id: req.user._id },
    { $pull: { wishlist: productId } },
  );
  if (result.modifiedCount > 0) {
    await Product.updateOne(
      { _id: productId, wishlistCount: { $gt: 0 } },
      { $inc: { wishlistCount: -1 } },
    );
  }
  return ok(res, { wishlisted: false });
});
