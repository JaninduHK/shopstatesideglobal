import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const SiteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const SiteSettings = model('SiteSettings', SiteSettingsSchema);
