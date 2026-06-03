import mongoose from 'mongoose';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
} from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const AddressSnapshotSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'Nigeria' },
    postalCode: String,
  },
  { _id: false },
);

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },        // snapshot
    image: { type: String },                         // snapshot URL
    price: { type: Number, required: true },         // snapshot kobo
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: true },
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

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: [OrderItemSchema],
    shippingAddress: { type: AddressSnapshotSchema, required: true },

    subtotal: { type: Number, required: true },      // kobo
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },

    payment: {
      method: { type: String, enum: Object.values(PAYMENT_METHOD), default: PAYMENT_METHOD.PAYSTACK },
      status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
      paystackReference: { type: String, index: true },
      paystackTransactionId: String,
      paidAt: Date,
      refundedAt: Date,
    },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING_PAYMENT,
      index: true,
    },
    trackingNumber: String,
    courierService: String,

    customerNote: String,
    adminNote: String,
    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order = model('Order', OrderSchema);
