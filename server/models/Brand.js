import mongoose from 'mongoose';
import { BRAND_TIER } from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const BrandSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    logo: { url: String, publicId: String },
    description: String,
    tier: {
      type: String,
      enum: Object.values(BRAND_TIER),
      default: BRAND_TIER.LUXURY,
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Brand = model('Brand', BrandSchema);
