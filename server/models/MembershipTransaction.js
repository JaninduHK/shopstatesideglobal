import mongoose from 'mongoose';
import { MEMBERSHIP_TX_TYPE, ADDON, PAYMENT_STATUS } from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const MembershipTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: Object.values(MEMBERSHIP_TX_TYPE),
      required: true,
    },
    // What this transaction enables/extends
    plan: { type: String }, // basic | basic_addon1 | basic_addon2 | full
    addOns: [{ type: String, enum: Object.values(ADDON) }],

    amount: { type: Number, required: true }, // kobo
    currency: { type: String, default: 'NGN' },

    paystackReference: { type: String, required: true, unique: true, index: true },
    paystackAuthorizationCode: String, // reusable auth for future renewals
    paystackTransactionId: String,

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },

    metadata: { type: Schema.Types.Mixed },
    paidAt: Date,
    failedAt: Date,
    failureReason: String,
  },
  { timestamps: true },
);

MembershipTransactionSchema.index({ user: 1, createdAt: -1 });

export const MembershipTransaction = model('MembershipTransaction', MembershipTransactionSchema);
