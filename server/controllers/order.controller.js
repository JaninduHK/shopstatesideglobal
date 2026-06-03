import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { randomToken } from '../utils/random.js';
import { paystack } from '../services/paystack.service.js';
import { sendEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { formatNaira } from '@ssg/shared/currency';
import { ORDER_STATUS, PAYMENT_STATUS } from '@ssg/shared/enums';
import {
  nextOrderNumber,
  validateAndSnapshot,
  computeTotals,
  markProductsSold,
  unmarkProductsSold,
  appendStatusHistory,
} from '../services/order.service.js';

export const createOrder = catchAsync(async (req, res) => {
  const { items, shippingAddress, customerNote } = req.body;
  const user = req.user;

  const { lineItems, products } = await validateAndSnapshot(items, user);
  const productsById = new Map(products.map((p) => [String(p._id), p]));
  const totals = await computeTotals(lineItems, productsById);

  const orderNumber = await nextOrderNumber();
  const reference = `ord_${randomToken(10)}`;

  const order = await Order.create({
    orderNumber,
    user: user._id,
    items: lineItems,
    shippingAddress,
    ...totals,
    customerNote,
    payment: { paystackReference: reference, status: PAYMENT_STATUS.PENDING },
    status: ORDER_STATUS.PENDING_PAYMENT,
    statusHistory: [{ status: ORDER_STATUS.PENDING_PAYMENT, changedAt: new Date() }],
  });

  const data = await paystack.initializeTransaction({
    email: user.email,
    amount: totals.total,
    reference,
    callbackUrl: `${env.clientUrl}/member/orders/${order._id}`,
    metadata: {
      orderId: order._id.toString(),
      orderNumber,
      kind: 'order',
    },
  });

  return created(res, {
    order: { id: order._id, orderNumber, total: totals.total },
    reference,
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
  });
});

export const verifyOrderPayment = catchAsync(async (req, res) => {
  const { reference } = req.body;
  const order = await Order.findOne({
    'payment.paystackReference': reference,
    user: req.user._id,
  });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.payment.status === PAYMENT_STATUS.PAID) {
    return ok(res, { order, alreadyVerified: true });
  }

  await applyOrderPaymentSuccess(order, req.user);
  return ok(res, { order });
});

/**
 * Apply payment-success: verify with Paystack, snapshot, mark items sold, send email.
 * Used by both /verify-payment and the webhook handler.
 */
export async function applyOrderPaymentSuccess(order, user) {
  const psData = await paystack.verifyTransaction(order.payment.paystackReference);
  if (psData.status !== 'success') {
    order.payment.status = PAYMENT_STATUS.FAILED;
    appendStatusHistory(order, ORDER_STATUS.PENDING_PAYMENT, {
      note: `Payment ${psData.status}: ${psData.gateway_response || ''}`.trim(),
    });
    await order.save();
    throw ApiError.badRequest(`Payment ${psData.status}`);
  }

  order.payment.status = PAYMENT_STATUS.PAID;
  order.payment.paidAt = new Date(psData.paid_at || Date.now());
  order.payment.paystackTransactionId = String(psData.id);
  order.status = ORDER_STATUS.CONFIRMED;
  appendStatusHistory(order, ORDER_STATUS.CONFIRMED);
  await order.save();

  await markProductsSold(order.items.map((i) => i.product));

  await sendEmail({
    to: user.email,
    subject: `Order ${order.orderNumber} confirmed`,
    template: 'order-placed',
    vars: {
      firstName: user.firstName,
      orderNumber: order.orderNumber,
      total: formatNaira(order.total),
      itemCount: order.items.length,
      ordersUrl: `${env.clientUrl}/member/orders/${order._id}`,
    },
  });
}

export const listOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  return ok(res, { orders }, { page: Number(page), limit: Number(limit), total });
});

export const getOrder = catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, { order });
});

const CANCELLABLE = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
];

export const cancelOrder = catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (!CANCELLABLE.includes(order.status)) {
    throw ApiError.conflict('Order can no longer be cancelled');
  }

  const wasPaid = order.payment.status === PAYMENT_STATUS.PAID;
  order.status = ORDER_STATUS.CANCELLED;
  appendStatusHistory(order, ORDER_STATUS.CANCELLED, {
    changedBy: req.user._id,
    note: 'Cancelled by customer',
  });
  await order.save();

  await unmarkProductsSold(order.items.map((i) => i.product));

  if (wasPaid) {
    try {
      await paystack.refundTransaction({
        reference: order.payment.paystackReference,
        amount: order.total,
        customerNote: `Refund for ${order.orderNumber}`,
        merchantNote: 'Customer cancellation',
      });
      order.payment.status = PAYMENT_STATUS.REFUNDED;
      order.payment.refundedAt = new Date();
      await order.save();
    } catch (err) {
      // Refund failed — keep order cancelled, log for admin attention
      order.adminNote = `${order.adminNote || ''}\nAuto-refund failed: ${err.message}`.trim();
      await order.save();
    }
  }

  await sendEmail({
    to: req.user.email,
    subject: `Order ${order.orderNumber} cancelled`,
    template: 'order-cancelled',
    vars: {
      firstName: req.user.firstName,
      orderNumber: order.orderNumber,
      refundLine: wasPaid ? `A refund of ${formatNaira(order.total)} is being processed.` : '',
      ordersUrl: `${env.clientUrl}/member/orders`,
    },
  });

  return ok(res, { order });
});
