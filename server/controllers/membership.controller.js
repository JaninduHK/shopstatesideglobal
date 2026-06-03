import { MembershipTransaction } from '../models/MembershipTransaction.js';
import { User } from '../models/User.js';
import { ProcessedWebhookEvent } from '../models/ProcessedWebhookEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { randomToken } from '../utils/random.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import {
  getPricing,
  getAddonMeta,
  SETTINGS_KEYS,
  getSetting,
} from '../services/siteSettings.service.js';
import { paystack } from '../services/paystack.service.js';
import {
  calculateAmount,
  applyActivation,
  applyCancellation,
  validateAddonsArg,
  planCodeFor,
} from '../services/membership.service.js';
import { sendEmail } from '../services/email.service.js';
import { formatNaira } from '@ssg/shared/currency';
import {
  PAYMENT_STATUS,
  MEMBERSHIP_TX_TYPE,
  MEMBERSHIP_STATUS,
  ADDON,
} from '@ssg/shared/enums';

function planLabel(plan, addonMeta) {
  switch (plan) {
    case 'basic':
      return 'Basic';
    case 'basic_addon1':
      return `Basic + ${addonMeta.addon1.name}`;
    case 'basic_addon2':
      return `Basic + ${addonMeta.addon2.name}`;
    case 'full':
      return `Basic + ${addonMeta.addon1.name} + ${addonMeta.addon2.name}`;
    default:
      return 'Membership';
  }
}

export const getPlans = catchAsync(async (req, res) => {
  const pricing = await getPricing();
  const addonMeta = await getAddonMeta();
  const basicBenefits = await getSetting(SETTINGS_KEYS.BASIC_BENEFITS);
  return ok(res, {
    plans: {
      basic: { id: 'basic', name: 'Basic', monthly: pricing.basic, benefits: basicBenefits },
    },
    addOns: {
      addon1: { id: ADDON.ADDON1, ...addonMeta.addon1, monthly: pricing.addon1 },
      addon2: { id: ADDON.ADDON2, ...addonMeta.addon2, monthly: pricing.addon2 },
    },
  });
});

export const subscribe = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user.emailVerified) {
    throw ApiError.forbidden('Verify your email before purchasing membership');
  }

  const { addOns } = req.body;
  validateAddonsArg(addOns);

  const amount = await calculateAmount({ includeBasic: true, addOns });
  const reference = `mem_${randomToken(10)}`;

  const tx = await MembershipTransaction.create({
    user: user._id,
    type: user.membership?.status === MEMBERSHIP_STATUS.ACTIVE
      ? MEMBERSHIP_TX_TYPE.RENEWAL
      : MEMBERSHIP_TX_TYPE.NEW,
    plan: planCodeFor(addOns),
    addOns,
    amount,
    paystackReference: reference,
    status: PAYMENT_STATUS.PENDING,
    metadata: { kind: 'membership', addOns },
  });

  const data = await paystack.initializeTransaction({
    email: user.email,
    amount,
    reference,
    callbackUrl: `${env.clientUrl}/membership/success`,
    metadata: {
      transactionId: tx._id.toString(),
      userId: user._id.toString(),
      kind: 'membership',
      addOns,
    },
  });

  return created(res, {
    reference: data.reference,
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
    amount,
  });
});

export const purchaseAddon = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user.hasActiveMembership()) {
    throw ApiError.membershipRequired('Active membership required to add features');
  }
  const { addOn } = req.body;
  if (user.membership.addOns?.includes(addOn)) {
    throw ApiError.conflict('You already have this add-on');
  }

  const amount = await calculateAmount({ includeBasic: false, addOns: [addOn] });
  const reference = `addon_${randomToken(10)}`;

  const tx = await MembershipTransaction.create({
    user: user._id,
    type: MEMBERSHIP_TX_TYPE.ADDON,
    addOns: [addOn],
    amount,
    paystackReference: reference,
    status: PAYMENT_STATUS.PENDING,
    metadata: { kind: 'addon', addOn },
  });

  const data = await paystack.initializeTransaction({
    email: user.email,
    amount,
    reference,
    callbackUrl: `${env.clientUrl}/member/membership`,
    metadata: {
      transactionId: tx._id.toString(),
      userId: user._id.toString(),
      kind: 'addon',
      addOn,
    },
  });

  return created(res, {
    reference: data.reference,
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
    amount,
  });
});

/**
 * Verify a payment (called from frontend right after Paystack inline success).
 * Idempotent: if the transaction is already paid, just return current state.
 */
export const verifyPayment = catchAsync(async (req, res) => {
  const { reference } = req.body;
  const tx = await MembershipTransaction.findOne({
    paystackReference: reference,
    user: req.user._id,
  });
  if (!tx) throw ApiError.notFound('Transaction not found');

  if (tx.status === PAYMENT_STATUS.PAID) {
    return ok(res, { membership: req.user.membership, alreadyVerified: true });
  }

  await applyVerifiedCharge(tx, req.user);
  return ok(res, { membership: req.user.membership });
});

/**
 * Shared helper: given a transaction + user, verify with Paystack and apply membership update.
 * Used by both /verify-payment and the webhook.
 */
async function applyVerifiedCharge(tx, user) {
  const psData = await paystack.verifyTransaction(tx.paystackReference);
  if (psData.status !== 'success') {
    tx.status = PAYMENT_STATUS.FAILED;
    tx.failedAt = new Date();
    tx.failureReason = psData.gateway_response || psData.status;
    await tx.save();
    throw ApiError.badRequest(`Payment ${psData.status}`);
  }

  if (psData.amount !== tx.amount) {
    logger.warn(`Amount mismatch for ${tx.paystackReference}: paid ${psData.amount} expected ${tx.amount}`);
  }

  tx.status = PAYMENT_STATUS.PAID;
  tx.paidAt = new Date(psData.paid_at || Date.now());
  tx.paystackTransactionId = String(psData.id);
  tx.paystackAuthorizationCode = psData.authorization?.authorization_code;
  await tx.save();

  applyActivation(user, {
    type: tx.type,
    addOns: tx.addOns,
    includeBasic: tx.type !== MEMBERSHIP_TX_TYPE.ADDON,
    addonOnly: tx.type === MEMBERSHIP_TX_TYPE.ADDON,
  });
  if (tx.paystackAuthorizationCode) {
    user.membership.paystackCustomerCode = psData.customer?.customer_code || user.membership.paystackCustomerCode;
    user.membership.paystackAuthorizationCode = tx.paystackAuthorizationCode;
  }
  await user.save();

  const addonMeta = await getAddonMeta();
  if (tx.type === MEMBERSHIP_TX_TYPE.ADDON) {
    await sendEmail({
      to: user.email,
      subject: 'Add-on unlocked — State Side Global',
      template: 'addon-receipt',
      vars: {
        firstName: user.firstName,
        addonName: tx.addOns[0] === ADDON.ADDON1 ? addonMeta.addon1.name : addonMeta.addon2.name,
        amount: formatNaira(tx.amount),
        reference: tx.paystackReference,
        shopUrl: `${env.clientUrl}/member/shop`,
      },
    });
  } else {
    await sendEmail({
      to: user.email,
      subject: 'Welcome to the Inner Circle',
      template: 'membership-receipt',
      vars: {
        firstName: user.firstName,
        planLabel: planLabel(user.membership.plan, addonMeta),
        amount: formatNaira(tx.amount),
        endDate: user.membership.endDate.toDateString(),
        reference: tx.paystackReference,
        shopUrl: `${env.clientUrl}/member`,
      },
    });
  }
}

export const cancel = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user.hasActiveMembership()) throw ApiError.notFound('No active membership');
  applyCancellation(user);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Auto-renewal cancelled',
    template: 'membership-cancelled',
    vars: {
      firstName: user.firstName,
      endDate: user.membership.endDate.toDateString(),
      manageUrl: `${env.clientUrl}/member/membership`,
    },
  });

  return ok(res, {
    cancelledAt: new Date(),
    accessUntil: user.membership.endDate,
    membership: user.membership,
  });
});

export const transactions = catchAsync(async (req, res) => {
  const list = await MembershipTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  return ok(res, { transactions: list });
});

/**
 * Paystack webhook handler. Mounted after rawBodyParser + verifyPaystackSignature middleware.
 */
export const handleWebhook = catchAsync(async (req, res) => {
  const event = req.body;
  const eventId = event?.data?.id ? `${event.event}:${event.data.id}` : `${event.event}:${event?.data?.reference}`;

  if (!eventId) {
    return ok(res, { ignored: true });
  }

  // Idempotency check
  try {
    await ProcessedWebhookEvent.create({
      eventId,
      eventType: event.event,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
    });
  } catch (err) {
    if (err?.code === 11000) {
      // already processed
      return ok(res, { duplicate: true });
    }
    throw err;
  }

  try {
    await dispatchWebhook(event);
  } catch (err) {
    logger.error(`Webhook handler error: ${err.message}`);
    // Don't throw — Paystack will keep retrying. We've recorded the event.
    // For now, return 200 to avoid retry storms on persistent bugs.
  }

  return ok(res, { received: true });
});

async function dispatchWebhook(event) {
  const { event: type, data } = event;
  if (!data?.reference) return;
  const ref = data.reference;

  // Route by reference prefix: mem_/addon_/renew_ → membership; ord_ → order;
  // spr_/sprx_ → special request payments
  if (ref.startsWith('ord_')) {
    await dispatchOrderEvent(type, data);
    return;
  }
  if (ref.startsWith('spr_') || ref.startsWith('sprx_')) {
    await dispatchSpecialRequestEvent(type, data);
    return;
  }

  switch (type) {
    case 'charge.success': {
      const tx = await MembershipTransaction.findOne({ paystackReference: ref });
      if (!tx || tx.status === PAYMENT_STATUS.PAID) return;
      const user = await User.findById(tx.user);
      if (!user) return;
      await applyVerifiedCharge(tx, user);
      break;
    }
    case 'charge.failed': {
      const tx = await MembershipTransaction.findOne({ paystackReference: ref });
      if (!tx) return;
      tx.status = PAYMENT_STATUS.FAILED;
      tx.failedAt = new Date();
      tx.failureReason = data.gateway_response;
      await tx.save();
      const user = await User.findById(tx.user);
      if (user && tx.type === MEMBERSHIP_TX_TYPE.RENEWAL) {
        await sendEmail({
          to: user.email,
          subject: 'Payment failed — State Side Global',
          template: 'payment-failed',
          vars: {
            firstName: user.firstName,
            plansUrl: `${env.clientUrl}/membership/plans`,
          },
        });
      }
      break;
    }
    default:
      logger.debug(`Unhandled Paystack event: ${type}`);
  }
}

async function dispatchOrderEvent(type, data) {
  const { Order } = await import('../models/Order.js');
  const { applyOrderPaymentSuccess } = await import('./order.controller.js');

  if (type !== 'charge.success') return;

  const order = await Order.findOne({ 'payment.paystackReference': data.reference }).populate('user');
  if (!order || order.payment.status === PAYMENT_STATUS.PAID) return;
  await applyOrderPaymentSuccess(order, order.user);
}

async function dispatchSpecialRequestEvent(type, data) {
  const { SpecialRequest } = await import('../models/SpecialRequest.js');
  const ref = data.reference;
  const isAdditional = ref.startsWith('sprx_');
  const field = isAdditional ? 'additionalPayment.paystackReference' : 'submissionPayment.paystackReference';

  const request = await SpecialRequest.findOne({ [field]: ref }).populate('user');
  if (!request) return;

  if (type === 'charge.success') {
    const {
      applySubmissionPaymentSuccess,
      applyAdditionalPaymentSuccess,
    } = await import('./specialRequest.controller.js');
    if (isAdditional) {
      if (request.additionalPayment?.status === PAYMENT_STATUS.PAID) return;
      await applyAdditionalPaymentSuccess(request, request.user);
    } else {
      if (request.submissionPayment?.status === PAYMENT_STATUS.PAID) return;
      await applySubmissionPaymentSuccess(request, request.user);
    }
  }
  // refund.processed events also arrive here. We optimistically set REFUNDED at reject time;
  // this event confirms it but doesn't need to do additional work for now.
}
