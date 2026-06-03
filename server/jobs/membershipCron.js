import cron from 'node-cron';
import { User } from '../models/User.js';
import { MembershipTransaction } from '../models/MembershipTransaction.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { randomToken } from '../utils/random.js';
import { paystack } from '../services/paystack.service.js';
import { applyActivation, applyExpired, calculateAmount, planCodeFor } from '../services/membership.service.js';
import { sendEmail } from '../services/email.service.js';
import {
  MEMBERSHIP_STATUS,
  MEMBERSHIP_TX_TYPE,
  PAYMENT_STATUS,
} from '@ssg/shared/enums';

const MS_PER_DAY = 24 * 3600_000;

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function sendRenewalReminders() {
  const now = Date.now();
  const threeDayWindow = { gte: new Date(now + 2 * MS_PER_DAY), lt: new Date(now + 4 * MS_PER_DAY) };
  const oneDayWindow = { gte: new Date(now), lt: new Date(now + 2 * MS_PER_DAY) };

  const candidates = await User.find({
    'membership.status': MEMBERSHIP_STATUS.ACTIVE,
    'membership.endDate': { $gte: threeDayWindow.gte, $lt: oneDayWindow.lt },
  });

  for (const user of candidates) {
    const end = user.membership.endDate;
    const daysOut = Math.ceil((end.getTime() - now) / MS_PER_DAY);
    const isThreeDay = daysOut === 3;
    const isOneDay = daysOut === 1;
    if (!isThreeDay && !isOneDay) continue;

    if (user.membership.renewalReminderSentFor && isSameDay(user.membership.renewalReminderSentFor, new Date())) {
      continue;
    }

    const heading = isThreeDay ? 'Your membership renews in 3 days' : 'Your membership renews tomorrow';
    const body = user.membership.autoRenew
      ? 'Your card on file will be charged automatically.'
      : 'Auto-renew is off — your access will end on this date. Renew anytime to keep it.';

    await sendEmail({
      to: user.email,
      subject: heading,
      template: 'renewal-reminder',
      vars: {
        firstName: user.firstName,
        endDate: end.toDateString(),
        heading,
        body,
        subjectLine: heading,
        manageUrl: `${env.clientUrl}/member/membership`,
      },
    });
    user.membership.renewalReminderSentFor = new Date();
    await user.save();
    logger.info(`Renewal reminder sent to ${user.email} (${daysOut}d out)`);
  }
}

export async function attemptAutoRenewals() {
  const now = new Date();
  const due = await User.find({
    'membership.status': MEMBERSHIP_STATUS.ACTIVE,
    'membership.autoRenew': true,
    'membership.endDate': { $lte: now },
    'membership.paystackAuthorizationCode': { $exists: true, $ne: null },
  });

  for (const user of due) {
    user.membership.lastRenewalAttemptAt = new Date();
    await user.save();

    const addOns = user.membership.addOns || [];
    const amount = await calculateAmount({ includeBasic: true, addOns });
    const reference = `renew_${randomToken(10)}`;

    const tx = await MembershipTransaction.create({
      user: user._id,
      type: MEMBERSHIP_TX_TYPE.RENEWAL,
      plan: planCodeFor(addOns),
      addOns,
      amount,
      paystackReference: reference,
      status: PAYMENT_STATUS.PENDING,
      metadata: { kind: 'auto-renewal' },
    });

    try {
      const result = await paystack.chargeAuthorization({
        email: user.email,
        amount,
        authorizationCode: user.membership.paystackAuthorizationCode,
        reference,
        metadata: { kind: 'auto-renewal', userId: user._id.toString() },
      });

      if (result.status === 'success') {
        tx.status = PAYMENT_STATUS.PAID;
        tx.paidAt = new Date();
        tx.paystackTransactionId = String(result.id);
        await tx.save();

        applyActivation(user, {
          type: MEMBERSHIP_TX_TYPE.RENEWAL,
          addOns,
          includeBasic: true,
        });
        await user.save();
        logger.info(`Auto-renewed ${user.email}`);
      } else {
        tx.status = PAYMENT_STATUS.FAILED;
        tx.failedAt = new Date();
        tx.failureReason = result.gateway_response;
        await tx.save();
        await onRenewalFailure(user);
      }
    } catch (err) {
      tx.status = PAYMENT_STATUS.FAILED;
      tx.failedAt = new Date();
      tx.failureReason = err.message;
      await tx.save();
      await onRenewalFailure(user);
      logger.error(`Auto-renew failed for ${user.email}: ${err.message}`);
    }
  }
}

async function onRenewalFailure(user) {
  applyExpired(user);
  await user.save();
  await sendEmail({
    to: user.email,
    subject: 'Payment failed — restore your access',
    template: 'payment-failed',
    vars: {
      firstName: user.firstName,
      plansUrl: `${env.clientUrl}/membership/plans`,
    },
  });
}

export async function expireLapsedMemberships() {
  const now = new Date();
  // For members where endDate has passed AND auto-renew is off OR no auth code stored
  const candidates = await User.find({
    'membership.status': MEMBERSHIP_STATUS.ACTIVE,
    'membership.endDate': { $lte: now },
    $or: [
      { 'membership.autoRenew': false },
      { 'membership.paystackAuthorizationCode': { $in: [null, undefined] } },
    ],
  });

  for (const user of candidates) {
    applyExpired(user);
    await user.save();
    await sendEmail({
      to: user.email,
      subject: 'Your membership has expired',
      template: 'membership-expired',
      vars: {
        firstName: user.firstName,
        plansUrl: `${env.clientUrl}/membership/plans`,
      },
    });
    logger.info(`Membership expired for ${user.email}`);
  }
}

export function startCronJobs() {
  if (env.isTest) return;

  // Daily at 9:00 — reminders
  cron.schedule('0 9 * * *', () => {
    sendRenewalReminders().catch((e) => logger.error(`renewal reminders cron: ${e.message}`));
  });

  // Hourly — attempt auto-renewals for anything that just expired
  cron.schedule('0 * * * *', () => {
    attemptAutoRenewals().catch((e) => logger.error(`auto-renew cron: ${e.message}`));
    expireLapsedMemberships().catch((e) => logger.error(`expire-lapsed cron: ${e.message}`));
  });

  logger.info('Membership cron jobs scheduled');
}
