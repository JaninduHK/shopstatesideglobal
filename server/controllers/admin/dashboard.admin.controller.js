import { User } from '../../models/User.js';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { SpecialRequest } from '../../models/SpecialRequest.js';
import { MembershipTransaction } from '../../models/MembershipTransaction.js';
import { ok } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { MEMBERSHIP_STATUS, ORDER_STATUS, PAYMENT_STATUS, SPECIAL_REQUEST_STATUS } from '@ssg/shared/enums';

const MS_PER_DAY = 24 * 3600_000;

export const getStats = catchAsync(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(Date.now() - 7 * MS_PER_DAY);

  const [
    revenueAggMonth,
    revenueAggAll,
    activeMembers,
    newMembersThisWeek,
    pendingOrders,
    openRequests,
    productsTotal,
    productsSold,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { 'payment.status': PAYMENT_STATUS.PAID, paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { 'payment.status': PAYMENT_STATUS.PAID } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    User.countDocuments({ 'membership.status': MEMBERSHIP_STATUS.ACTIVE }),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING] },
    }),
    SpecialRequest.countDocuments({
      status: {
        $in: [
          SPECIAL_REQUEST_STATUS.SUBMITTED,
          SPECIAL_REQUEST_STATUS.UNDER_REVIEW,
          SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT,
          SPECIAL_REQUEST_STATUS.SOURCING,
          SPECIAL_REQUEST_STATUS.READY,
        ],
      },
    }),
    Product.countDocuments({ deletedAt: null, isPublished: true }),
    Product.countDocuments({ deletedAt: null, sold: true }),
  ]);

  return ok(res, {
    revenue: {
      thisMonth: revenueAggMonth[0]?.total || 0,
      allTime: revenueAggAll[0]?.total || 0,
    },
    activeMembers,
    newMembersThisWeek,
    pendingOrders,
    openRequests,
    productsListed: productsTotal,
    productsSold,
  });
});

export const getRevenueChart = catchAsync(async (req, res) => {
  const range = req.query.range || '30d';
  const days = range === '7d' ? 7 : range === '12m' ? 365 : 30;
  const groupBy = range === '12m' ? 'month' : 'day';
  const since = new Date(Date.now() - days * MS_PER_DAY);

  // Group by day or month bucket
  const dateProjection =
    groupBy === 'day'
      ? { $dateToString: { format: '%Y-%m-%d', date: '$payment.paidAt' } }
      : { $dateToString: { format: '%Y-%m', date: '$payment.paidAt' } };

  const data = await Order.aggregate([
    { $match: { 'payment.status': PAYMENT_STATUS.PAID, 'payment.paidAt': { $gte: since } } },
    {
      $group: {
        _id: dateProjection,
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Pad missing buckets so the chart line is continuous
  const series = [];
  if (groupBy === 'day') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * MS_PER_DAY);
      const key = d.toISOString().slice(0, 10);
      const match = data.find((x) => x._id === key);
      series.push({ date: key, revenue: match?.revenue || 0, orders: match?.orders || 0 });
    }
  } else {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const match = data.find((x) => x._id === key);
      series.push({ date: key, revenue: match?.revenue || 0, orders: match?.orders || 0 });
    }
  }

  return ok(res, { range, series });
});

export const getMembershipGrowth = catchAsync(async (req, res) => {
  const range = req.query.range || '30d';
  const days = range === '7d' ? 7 : range === '12m' ? 365 : 30;
  const since = new Date(Date.now() - days * MS_PER_DAY);

  const data = await MembershipTransaction.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.PAID,
        paidAt: { $gte: since },
        type: { $in: ['new', 'renewal', 'addon'] },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          type: '$type',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * MS_PER_DAY);
    const key = d.toISOString().slice(0, 10);
    const newCount = data.find((x) => x._id.date === key && x._id.type === 'new')?.count || 0;
    const renewals = data.find((x) => x._id.date === key && x._id.type === 'renewal')?.count || 0;
    series.push({ date: key, new: newCount, renewals });
  }
  return ok(res, { range, series });
});

export const getRecentActivity = catchAsync(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const [orders, members, requests, txs] = await Promise.all([
    Order.find({}).sort({ createdAt: -1 }).limit(limit).populate('user', 'firstName lastName email').lean(),
    User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(limit).select('firstName lastName email createdAt membership').lean(),
    SpecialRequest.find({}).sort({ createdAt: -1 }).limit(limit).populate('user', 'firstName lastName email').lean(),
    MembershipTransaction.find({ status: PAYMENT_STATUS.PAID }).sort({ paidAt: -1 }).limit(limit).populate('user', 'firstName lastName email').lean(),
  ]);

  const events = [
    ...orders.map((o) => ({
      type: 'order',
      at: o.createdAt,
      title: `New order ${o.orderNumber}`,
      subtitle: `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim(),
      amount: o.total,
      link: `/admin/orders/${o._id}`,
    })),
    ...members.map((m) => ({
      type: 'member',
      at: m.createdAt,
      title: `${m.firstName} ${m.lastName} joined`,
      subtitle: m.email,
      link: `/admin/members/${m._id}`,
    })),
    ...requests.map((r) => ({
      type: 'request',
      at: r.createdAt,
      title: `New request ${r.requestNumber}`,
      subtitle: r.title,
      link: `/admin/requests/${r._id}`,
    })),
    ...txs.map((t) => ({
      type: 'membership',
      at: t.paidAt,
      title: `Membership ${t.type} — ${t.user?.firstName || ''} ${t.user?.lastName || ''}`.trim(),
      subtitle: t.user?.email,
      amount: t.amount,
      link: `/admin/members/${t.user?._id}`,
    })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);

  return ok(res, { events });
});
