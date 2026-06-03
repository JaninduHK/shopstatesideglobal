import mongoose from 'mongoose';
import { SpecialRequest } from '../../models/SpecialRequest.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { paystack } from '../../services/paystack.service.js';
import { sendEmail } from '../../services/email.service.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import { formatNaira } from '@ssg/shared/currency';
import {
  SPECIAL_REQUEST_STATUS,
  PAYMENT_STATUS,
} from '@ssg/shared/enums';
import {
  appendStatusHistory,
  assertAdminTransition,
} from '../../services/specialRequest.service.js';

export const adminListRequests = catchAsync(async (req, res) => {
  const { status, q, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q && q.trim()) {
    filter.$or = [
      { requestNumber: new RegExp(q.trim(), 'i') },
      { title: new RegExp(q.trim(), 'i') },
    ];
  }
  const total = await SpecialRequest.countDocuments(filter);
  const requests = await SpecialRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('user', 'firstName lastName email')
    .lean();
  return ok(res, { requests }, { page: Number(page), limit: Number(limit), total });
});

export const adminGetRequest = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw ApiError.badRequest('Bad id');
  const request = await SpecialRequest.findById(req.params.id).populate('user', 'firstName lastName email phone');
  if (!request) throw ApiError.notFound('Request not found');
  return ok(res, { request });
});

export const adminAssess = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { additionalCostAssessed, additionalCostNote } = req.body;
  const request = await SpecialRequest.findById(id).populate('user', 'firstName email');
  if (!request) throw ApiError.notFound('Request not found');
  if (![SPECIAL_REQUEST_STATUS.SUBMITTED, SPECIAL_REQUEST_STATUS.UNDER_REVIEW].includes(request.status)) {
    throw ApiError.conflict('Cannot assess at this status');
  }

  request.additionalCostAssessed = additionalCostAssessed;
  request.additionalCostNote = additionalCostNote;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.status = SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT;
  appendStatusHistory(request, SPECIAL_REQUEST_STATUS.ACCEPTED, {
    changedBy: req.user._id,
    note: `Additional cost: ${formatNaira(additionalCostAssessed)}`,
  });
  appendStatusHistory(request, SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT, {
    changedBy: req.user._id,
  });
  await request.save();

  await sendEmail({
    to: request.user.email,
    subject: `Request ${request.requestNumber} accepted — additional payment required`,
    template: 'request-accepted',
    vars: {
      firstName: request.user.firstName,
      requestNumber: request.requestNumber,
      title: request.title,
      additionalCost: formatNaira(additionalCostAssessed),
      additionalCostNote,
      payUrl: `${env.clientUrl}/member/requests/${request._id}`,
    },
  });

  return ok(res, { request });
});

export const adminUpdateStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const request = await SpecialRequest.findById(id).populate('user', 'firstName email');
  if (!request) throw ApiError.notFound('Request not found');

  // Rejection has its own flow — must be from submitted/under_review/accepted
  if (status === SPECIAL_REQUEST_STATUS.REJECTED) {
    if (![
      SPECIAL_REQUEST_STATUS.SUBMITTED,
      SPECIAL_REQUEST_STATUS.UNDER_REVIEW,
      SPECIAL_REQUEST_STATUS.ACCEPTED,
      SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT,
    ].includes(request.status)) {
      throw ApiError.conflict(`Cannot reject from ${request.status}`);
    }
    await applyRejection(request, req.user, note);
    return ok(res, { request });
  }

  assertAdminTransition(request.status, status);
  request.status = status;
  appendStatusHistory(request, status, { changedBy: req.user._id, note });
  await request.save();

  // Notify on terminal-ish transitions
  if (status === SPECIAL_REQUEST_STATUS.COMPLETED) {
    await sendEmail({
      to: request.user.email,
      subject: `Request ${request.requestNumber} completed`,
      template: 'request-completed',
      vars: {
        firstName: request.user.firstName,
        requestNumber: request.requestNumber,
        title: request.title,
        requestUrl: `${env.clientUrl}/member/requests/${request._id}`,
      },
    });
  }

  return ok(res, { request });
});

async function applyRejection(request, admin, adminNote) {
  request.status = SPECIAL_REQUEST_STATUS.REJECTED;
  appendStatusHistory(request, SPECIAL_REQUEST_STATUS.REJECTED, {
    changedBy: admin._id,
    note: adminNote || 'Rejected by admin',
  });

  // Refund submission fee if it was paid
  const sp = request.submissionPayment;
  if (sp?.status === PAYMENT_STATUS.PAID && sp.paystackReference) {
    try {
      const refund = await paystack.refundTransaction({
        reference: sp.paystackReference,
        amount: request.submissionFee,
        merchantNote: 'Special request rejected — submission fee refund',
      });
      sp.refundReference = refund?.transaction?.reference || refund?.reference || '';
      // Mark optimistically; webhook refund.processed will confirm
      sp.status = PAYMENT_STATUS.REFUNDED;
      sp.refundedAt = new Date();
    } catch (err) {
      logger.error(`Refund failed for ${request.requestNumber}: ${err.message}`);
      request.adminNote = `${request.adminNote || ''}\nRefund FAILED: ${err.message}`.trim();
    }
  }

  await request.save();

  await sendEmail({
    to: request.user.email,
    subject: `Request ${request.requestNumber} not accepted`,
    template: 'request-rejected',
    vars: {
      firstName: request.user.firstName,
      requestNumber: request.requestNumber,
      title: request.title,
      fee: formatNaira(request.submissionFee),
      adminNote: adminNote || '',
      refundLine: sp?.status === PAYMENT_STATUS.REFUNDED
        ? `Your ${formatNaira(request.submissionFee)} submission fee is being refunded — please allow 1–7 business days.`
        : '',
      requestUrl: `${env.clientUrl}/member/requests/${request._id}`,
    },
  });
}

export const adminAddRequestNote = catchAsync(async (req, res) => {
  const request = await SpecialRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');
  request.adminNote = `${request.adminNote || ''}\n[${new Date().toISOString()}] ${req.body.note}`.trim();
  await request.save();
  return ok(res, { request });
});
