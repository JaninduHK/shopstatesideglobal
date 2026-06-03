import mongoose from 'mongoose';
import {
  SPECIAL_REQUEST_STATUS,
  PAYMENT_STATUS,
  PRODUCT_CATEGORY,
} from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const ReferenceImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: true },
);

const PaymentSubdocSchema = new Schema(
  {
    paystackReference: { type: String, index: true },
    paystackTransactionId: String,
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    amount: Number,                // kobo
    paidAt: Date,
    refundedAt: Date,
    refundReference: String,
  },
  { _id: false },
);

const StatusHistorySchema = new Schema(
  {
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { _id: false },
);

const SpecialRequestSchema = new Schema(
  {
    requestNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    budget: { type: Number, required: true, min: 0 }, // kobo
    category: {
      type: String,
      enum: Object.values(PRODUCT_CATEGORY),
    },
    brand: { type: String, trim: true, maxlength: 120 },
    additionalNotes: { type: String, trim: true, maxlength: 2000 },
    referenceImages: [ReferenceImageSchema],

    status: {
      type: String,
      enum: Object.values(SPECIAL_REQUEST_STATUS),
      default: SPECIAL_REQUEST_STATUS.PENDING_PAYMENT,
      index: true,
    },

    submissionFee: { type: Number, required: true }, // kobo, snapshot at submit
    submissionPayment: PaymentSubdocSchema,

    additionalCostAssessed: { type: Number, min: 0 }, // kobo
    additionalCostNote: { type: String, maxlength: 2000 },
    additionalPayment: PaymentSubdocSchema,

    adminNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    estimatedDelivery: Date,

    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true },
);

SpecialRequestSchema.index({ user: 1, createdAt: -1 });
SpecialRequestSchema.index({ status: 1, createdAt: -1 });

export const SpecialRequest = model('SpecialRequest', SpecialRequestSchema);
