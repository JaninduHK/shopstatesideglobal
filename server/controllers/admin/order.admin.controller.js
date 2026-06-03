import mongoose from 'mongoose';
import { Order } from '../../models/Order.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendEmail } from '../../services/email.service.js';
import { appendStatusHistory, unmarkProductsSold } from '../../services/order.service.js';
import { env } from '../../config/env.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '@ssg/shared/enums';
import { paystack } from '../../services/paystack.service.js';
import { formatNaira } from '@ssg/shared/currency';

export const adminListOrders = catchAsync(async (req, res) => {
  const {
    q, status, paymentStatus, dateFrom, dateTo,
    page = 1, limit = 50,
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter['payment.status'] = paymentStatus;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  if (q && q.trim()) {
    filter.$or = [{ orderNumber: new RegExp(q.trim(), 'i') }];
  }

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('user', 'firstName lastName email')
    .lean();

  return ok(res, { orders }, { page: Number(page), limit: Number(limit), total });
});

export const adminGetOrder = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw ApiError.badRequest('Bad id');
  const order = await Order.findById(req.params.id).populate('user', 'firstName lastName email phone');
  if (!order) throw ApiError.notFound('Order not found');
  return ok(res, { order });
});

const EMAIL_FOR = {
  [ORDER_STATUS.SHIPPED]: 'order-shipped',
  [ORDER_STATUS.DELIVERED]: 'order-delivered',
  [ORDER_STATUS.CANCELLED]: 'order-cancelled',
};

export const adminUpdateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, courierService, note, notifyCustomer } = req.body;

  const order = await Order.findById(id).populate('user', 'firstName lastName email');
  if (!order) throw ApiError.notFound('Order not found');

  // Cancelled orders un-sell items + refund (if paid)
  if (status === ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.CANCELLED) {
    await unmarkProductsSold(order.items.map((i) => i.product));
    if (order.payment.status === PAYMENT_STATUS.PAID) {
      try {
        await paystack.refundTransaction({
          reference: order.payment.paystackReference,
          amount: order.total,
          merchantNote: 'Admin cancellation',
        });
        order.payment.status = PAYMENT_STATUS.REFUNDED;
        order.payment.refundedAt = new Date();
      } catch (err) {
        order.adminNote = `${order.adminNote || ''}\nAuto-refund failed: ${err.message}`.trim();
      }
    }
  }

  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courierService !== undefined) order.courierService = courierService;
  order.status = status;
  appendStatusHistory(order, status, { changedBy: req.user._id, note });
  await order.save();

  if (notifyCustomer !== false && EMAIL_FOR[status]) {
    await sendEmail({
      to: order.user.email,
      subject: `Order ${order.orderNumber}: ${status.replace('_', ' ')}`,
      template: EMAIL_FOR[status],
      vars: {
        firstName: order.user.firstName,
        orderNumber: order.orderNumber,
        total: formatNaira(order.total),
        trackingNumber: order.trackingNumber || '—',
        courierService: order.courierService || '—',
        note: note || '',
        refundLine: order.payment.status === PAYMENT_STATUS.REFUNDED
          ? `A refund of ${formatNaira(order.total)} is being processed.` : '',
        ordersUrl: `${env.clientUrl}/member/orders/${order._id}`,
      },
    });
  }

  return ok(res, { order });
});

export const adminAddOrderNote = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  order.adminNote = `${order.adminNote || ''}\n[${new Date().toISOString()}] ${req.body.note}`.trim();
  await order.save();
  return ok(res, { order });
});
