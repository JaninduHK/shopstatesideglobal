import mongoose from 'mongoose';
import { EMAIL_SOURCE } from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const EmailSubscriberSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    firstName: { type: String, trim: true },
    isActive: { type: Boolean, default: false }, // becomes true after double opt-in confirmation
    source: {
      type: String,
      enum: Object.values(EMAIL_SOURCE),
      default: EMAIL_SOURCE.FOOTER_FORM,
    },
    confirmToken: String,
    confirmTokenExpires: Date,
    confirmedAt: Date,

    unsubscribeToken: { type: String, index: true },
    unsubscribedAt: Date,

    tags: [{ type: String, lowercase: true, trim: true }],
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

EmailSubscriberSchema.index({ tags: 1, isActive: 1 });

export const EmailSubscriber = model('EmailSubscriber', EmailSubscriberSchema);
