import mongoose from 'mongoose';
import {
  PRODUCT_CATEGORY,
  PRODUCT_CONDITION,
  ADDON_GATE,
} from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false },
);

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '', maxlength: 280 },

    category: {
      type: String,
      enum: Object.values(PRODUCT_CATEGORY),
      required: true,
      index: true,
    },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    designerTags: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],

    price: { type: Number, required: true, min: 0 }, // kobo
    originalRetailPrice: { type: Number, min: 0 },
    discountPrice: { type: Number, min: 0 },
    discountEnds: Date,

    sku: { type: String, required: true, unique: true, uppercase: true },
    condition: {
      type: String,
      enum: Object.values(PRODUCT_CONDITION),
      required: true,
    },
    quantity: { type: Number, default: 1, min: 0 },
    sold: { type: Boolean, default: false, index: true },
    soldAt: Date,

    images: [ImageSchema],

    isAuthenticated: { type: Boolean, default: true },
    authenticationDetails: {
      authenticatedBy: String,
      authDate: Date,
      certificateId: String,
      notes: String,
    },

    size: String,
    color: String,
    material: String,
    dimensions: String,
    serialNumber: String,

    isPublished: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: true },
    isOnSale: { type: Boolean, default: false },

    requiresAddon: {
      type: String,
      enum: Object.values(ADDON_GATE),
      default: ADDON_GATE.NONE,
      index: true,
    },

    views: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ProductSchema.index({ category: 1, isPublished: 1, createdAt: -1 });
ProductSchema.index({ brand: 1, isPublished: 1 });
ProductSchema.index({ isFeatured: 1, isPublished: 1 });
ProductSchema.index({ isPublished: 1, createdAt: -1 });
ProductSchema.index({ title: 'text', description: 'text', tags: 'text', designerTags: 'text' });

ProductSchema.virtual('effectivePrice').get(function () {
  if (
    this.discountPrice &&
    (!this.discountEnds || this.discountEnds > new Date())
  ) {
    return this.discountPrice;
  }
  return this.price;
});

ProductSchema.set('toJSON', { virtuals: true });

export const Product = model('Product', ProductSchema);
