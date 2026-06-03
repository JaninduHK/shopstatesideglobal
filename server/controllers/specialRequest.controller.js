import { SpecialRequest } from '../models/SpecialRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { randomToken } from '../utils/random.js';
import { paystack } from '../services/paystack.service.js';
import { signedUploadParams } from '../services/cloudinary.service.js';
import { sendEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { formatNaira } from '@ssg/shared/currency';
import { PAYMENT_STATUS, SPECIAL_REQUEST_STATUS } from '@ssg/shared/enums';
import {
  nextRequestNumber,
  currentSubmissionFee,
  appendStatusHistory,
} from '../services/specialRequest.service.js';

export const uploadSignature = catchAsync(async (req, res) => {
  const params = signedUploadParams({ folder: 'special-requests' });
  return ok(res, params);
});

export const submitRequest = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user.emailVerified) {
    throw ApiError.forbidden('Verify your email before submitting a request');
  }

  const fee = await currentSubmissionFee();
  const requestNumber = await nextRequestNumber();
  const reference = `spr_${randomToken(10)}`;

  const request = await SpecialRequest.create({
    requestNumber,
    user: user._id,
    title: req.body.title,
    description: req.body.description,
    budget: req.body.budget,
    category: req.body.category,
    brand: req.body.brand,
    additionalNotes: req.body.additionalNotes,
    referenceImages: req.body.referenceImages,
    status: SPECIAL_REQUEST_STATUS.PENDING_PAYMENT,
    submissionFee: fee,
    submissionPayment: {
      paystackReference: reference,
      status: PAYMENT_STATUS.PENDING,
      amount: fee,
    },
    statusHistory: [{ status: SPECIAL_REQUEST_STATUS.PENDING_PAYMENT, changedAt: new Date() }],
  });

  const psData = await paystack.initializeTransaction({
    email: user.email,
    amount: fee,
    reference,
    callbackUrl: `${env.clientUrl}/member/requests/${request._id}`,
    metadata: {
      requestId: request._id.toString(),
      requestNumber,
      kind: 'special-request-submission',
    },
  });

  return created(res, {
    request: { id: request._id, requestNumber },
    reference,
    accessCode: psData.access_code,
    authorizationUrl: psData.authorization_url,
    amount: fee,
  });
});

export const verifySubmissionPayment = catchAsync(async (req, res) => {
  const { reference } = req.body;
  const request = await SpecialRequest.findOne({
    'submissionPayment.paystackReference': reference,
    user: req.user._id,
  });
  if (!request) throw ApiError.notFound('Request not found');

  if (request.submissionPayment.status === PAYMENT_STATUS.PAID) {
    return ok(res, { request, alreadyVerified: true });
  }

  await applySubmissionPaymentSuccess(request, req.user);
  return ok(res, { request });
});

export async function applySubmissionPaymentSuccess(request, user) {
  const psData = await paystack.verifyTransaction(request.submissionPayment.paystackReference);
  if (psData.status !== 'success') {
    request.submissionPayment.status = PAYMENT_STATUS.FAILED;
    await request.save();
    throw ApiError.badRequest(`Payment ${psData.status}`);
  }

  request.submissionPayment.status = PAYMENT_STATUS.PAID;
  request.submissionPayment.paidAt = new Date(psData.paid_at || Date.now());
  request.submissionPayment.paystackTransactionId = String(psData.id);
  request.status = SPECIAL_REQUEST_STATUS.SUBMITTED;
  appendStatusHistory(request, SPECIAL_REQUEST_STATUS.SUBMITTED);
  await request.save();

  await sendEmail({
    to: user.email,
    subject: `Request ${request.requestNumber} submitted`,
    template: 'request-submitted',
    vars: {
      firstName: user.firstName,
      requestNumber: request.requestNumber,
      title: request.title,
      fee: formatNaira(request.submissionFee),
      requestUrl: `${env.clientUrl}/member/requests/${request._id}`,
    },
  });
}

export const listRequests = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;
  const total = await SpecialRequest.countDocuments(filter);
  const requests = await SpecialRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();
  return ok(res, { requests }, { page: Number(page), limit: Number(limit), total });
});

export const getRequest = catchAsync(async (req, res) => {
  const request = await SpecialRequest.findOne({ _id: req.params.id, user: req.user._id });
  if (!request) throw ApiError.notFound('Request not found');
  return ok(res, { request });
});

export const payAdditional = catchAsync(async (req, res) => {
  const request = await SpecialRequest.findOne({ _id: req.params.id, user: req.user._id });
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT) {
    throw ApiError.conflict('No additional payment due at this stage');
  }
  if (!request.additionalCostAssessed) {
    throw ApiError.badRequest('Additional cost not assessed');
  }

  const reference = `sprx_${randomToken(10)}`;
  request.additionalPayment = {
    paystackReference: reference,
    status: PAYMENT_STATUS.PENDING,
    amount: request.additionalCostAssessed,
  };
  await request.save();

  const psData = await paystack.initializeTransaction({
    email: req.user.email,
    amount: request.additionalCostAssessed,
    reference,
    callbackUrl: `${env.clientUrl}/member/requests/${request._id}`,
    metadata: {
      requestId: request._id.toString(),
      requestNumber: request.requestNumber,
      kind: 'special-request-additional',
    },
  });

  return ok(res, {
    reference,
    accessCode: psData.access_code,
    authorizationUrl: psData.authorization_url,
    amount: request.additionalCostAssessed,
  });
});

export const verifyAdditionalPayment = catchAsync(async (req, res) => {
  const { reference } = req.body;
  const request = await SpecialRequest.findOne({
    _id: req.params.id,
    user: req.user._id,
    'additionalPayment.paystackReference': reference,
  });
  if (!request) throw ApiError.notFound('Request not found');

  if (request.additionalPayment.status === PAYMENT_STATUS.PAID) {
    return ok(res, { request, alreadyVerified: true });
  }

  await applyAdditionalPaymentSuccess(request, req.user);
  return ok(res, { request });
});

export async function applyAdditionalPaymentSuccess(request, user) {
  const psData = await paystack.verifyTransaction(request.additionalPayment.paystackReference);
  if (psData.status !== 'success') {
    request.additionalPayment.status = PAYMENT_STATUS.FAILED;
    await request.save();
    throw ApiError.badRequest(`Payment ${psData.status}`);
  }
  request.additionalPayment.status = PAYMENT_STATUS.PAID;
  request.additionalPayment.paidAt = new Date(psData.paid_at || Date.now());
  request.additionalPayment.paystackTransactionId = String(psData.id);
  request.status = SPECIAL_REQUEST_STATUS.SOURCING;
  appendStatusHistory(request, SPECIAL_REQUEST_STATUS.ADDITIONAL_PAID);
  appendStatusHistory(request, SPECIAL_REQUEST_STATUS.SOURCING, { note: 'Auto-advanced after payment' });
  await request.save();

  await sendEmail({
    to: user.email,
    subject: `Request ${request.requestNumber}: payment received, sourcing your piece`,
    template: 'request-additional-paid',
    vars: {
      firstName: user.firstName,
      requestNumber: request.requestNumber,
      amount: formatNaira(request.additionalPayment.amount),
      requestUrl: `${env.clientUrl}/member/requests/${request._id}`,
    },
  });
}
