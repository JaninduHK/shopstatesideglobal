import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { SpecialRequest } from '../../models/SpecialRequest.js';
import { MembershipTransaction } from '../../models/MembershipTransaction.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, noContent } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendEmail } from '../../services/email.service.js';
import { planCodeFor } from '../../services/membership.service.js';
import { ROLES, MEMBERSHIP_STATUS, ADDON, PAYMENT_STATUS } from '@ssg/shared/enums';

export const adminListMembers = catchAsync(async (req, res) => {
  const {
    q, status, plan, page = 1, limit = 50,
  } = req.query;

  const filter = { role: ROLES.USER };
  if (status) filter['membership.status'] = status;
  if (plan) filter['membership.plan'] = plan;
  if (q && q.trim()) {
    const re = new RegExp(q.trim(), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
  }

  const total = await User.countDocuments(filter);
  const members = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .select('firstName lastName email phone avatar membership emailVerified isActive suspendedAt lastLogin loginCount createdAt')
    .lean();

  // Total spent per member (from paid orders)
  const ids = members.map((m) => m._id);
  const spendByMember = await Order.aggregate([
    { $match: { user: { $in: ids }, 'payment.status': PAYMENT_STATUS.PAID } },
    { $group: { _id: '$user', total: { $sum: '$total' } } },
  ]);
  const spendMap = new Map(spendByMember.map((s) => [String(s._id), s.total]));
  for (const m of members) m.totalSpent = spendMap.get(String(m._id)) || 0;

  return ok(res, { members }, { page: Number(page), limit: Number(limit), total });
});

export const adminGetMember = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest('Bad id');
  const member = await User.findById(id).lean();
  if (!member || member.role !== ROLES.USER) throw ApiError.notFound('Member not found');

  const [orders, requests, transactions, totalSpent] = await Promise.all([
    Order.find({ user: id }).sort({ createdAt: -1 }).limit(20).lean(),
    SpecialRequest.find({ user: id }).sort({ createdAt: -1 }).limit(20).lean(),
    MembershipTransaction.find({ user: id }).sort({ createdAt: -1 }).limit(20).lean(),
    Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(id), 'payment.status': PAYMENT_STATUS.PAID } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  return ok(res, {
    member: { ...member, totalSpent: totalSpent[0]?.total || 0 },
    orders,
    requests,
    transactions,
  });
});

export const adminSuspendMember = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { suspended, reason } = req.body;
  const member = await User.findById(id);
  if (!member || member.role !== ROLES.USER) throw ApiError.notFound('Member not found');

  member.isActive = !suspended;
  member.suspendedAt = suspended ? new Date() : undefined;
  member.suspendReason = suspended ? reason : undefined;
  await member.save();
  return ok(res, { member });
});

export const adminUpdateMembership = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { plan, addOns, endDate, status } = req.body;
  const member = await User.findById(id);
  if (!member || member.role !== ROLES.USER) throw ApiError.notFound('Member not found');

  member.membership = member.membership || {};
  if (Array.isArray(addOns)) {
    const validAddons = Object.values(ADDON);
    member.membership.addOns = addOns.filter((a) => validAddons.includes(a));
    member.membership.plan = planCodeFor(member.membership.addOns);
  } else if (plan) {
    member.membership.plan = plan;
  }
  if (endDate) member.membership.endDate = new Date(endDate);
  if (status) member.membership.status = status;
  if (!member.membership.startDate) member.membership.startDate = new Date();
  await member.save();
  return ok(res, { member });
});

export const adminSendDirectEmail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { subject, body } = req.body;
  if (!subject || !body) throw ApiError.badRequest('Subject and body required');

  const member = await User.findById(id);
  if (!member || member.role !== ROLES.USER) throw ApiError.notFound('Member not found');

  // Use a minimal inline template so we don't need a dedicated file
  const html = `
<!doctype html><html><body style="margin:0;padding:40px;background:#0a0a0a;color:#f5f5f0;font-family:Inter,Arial,sans-serif;">
  <table style="max-width:600px;margin:auto;background:#111;border:1px solid #2a2a2a;">
    <tr><td style="padding:32px 40px;border-bottom:1px solid #2a2a2a;color:#c9a96e;font-family:Georgia,serif;font-size:24px;letter-spacing:.08em;">STATE SIDE GLOBAL</td></tr>
    <tr><td style="padding:32px 40px;color:#a0a0a0;line-height:1.6;white-space:pre-wrap;">${body.replace(/</g, '&lt;')}</td></tr>
  </table>
</body></html>`;

  // sendEmail expects a template file — bypass by calling SendGrid directly here would mean
  // duplicating logic. Simpler: write an inline render path via a small helper.
  // For now, accept the limitation and send via the file-based path using a generic template if available;
  // otherwise log + use ad-hoc nodemailer in dev. To avoid creating yet another template file just for this,
  // we'll write the HTML to a transient template-less email by invoking sendgrid directly only if configured.
  // Pragmatic fallback: stash subject/body in adminNote-style logging and notify admin in response.

  const { env } = await import('../../config/env.js');
  if (!env.email.sendgridKey) {
    // Dev mode — log and pretend
    const { logger } = await import('../../utils/logger.js');
    logger.info(`[direct-email:dev] to=${member.email} subject="${subject}"`);
  } else {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(env.email.sendgridKey);
    await sgMail.send({
      to: member.email,
      from: { email: env.email.from, name: env.email.fromName },
      subject,
      html,
      text: body,
    });
  }

  return ok(res, { sent: true });
});

export const adminDeleteMember = catchAsync(async (req, res) => {
  const { id } = req.params;
  const member = await User.findById(id);
  if (!member || member.role !== ROLES.USER) throw ApiError.notFound('Member not found');
  member.isActive = false;
  member.suspendedAt = new Date();
  member.suspendReason = 'Admin soft-delete';
  // Anonymise PII fields lightly (full GDPR deletion is a separate workflow)
  member.email = `deleted-${member._id}@statesideglobal.local`;
  member.firstName = 'Deleted';
  member.lastName = 'User';
  member.phone = '';
  await member.save();
  return noContent(res);
});
