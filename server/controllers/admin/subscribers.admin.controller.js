import { EmailSubscriber } from '../../models/EmailSubscriber.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const listSubscribers = catchAsync(async (req, res) => {
  const { q, tag, isActive, source, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (q && q.trim()) {
    const re = new RegExp(q.trim(), 'i');
    filter.$or = [{ email: re }, { firstName: re }];
  }
  if (tag) filter.tags = tag;
  if (source) filter.source = source;
  if (isActive === 'true') filter.isActive = true;
  if (isActive === 'false') filter.isActive = false;

  const total = await EmailSubscriber.countDocuments(filter);
  const subscribers = await EmailSubscriber.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();
  return ok(res, { subscribers }, { page: Number(page), limit: Number(limit), total });
});

export const updateSubscriberTags = catchAsync(async (req, res) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) throw ApiError.badRequest('tags must be an array');
  const sub = await EmailSubscriber.findByIdAndUpdate(
    req.params.id,
    { tags: tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean) },
    { new: true },
  );
  if (!sub) throw ApiError.notFound('Subscriber not found');
  return ok(res, { subscriber: sub });
});

export const deleteSubscriber = catchAsync(async (req, res) => {
  await EmailSubscriber.findByIdAndDelete(req.params.id);
  return ok(res, { deleted: true });
});

export const exportSubscribersCSV = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.isActive === 'true') filter.isActive = true;
  const list = await EmailSubscriber.find(filter).lean();
  const rows = [
    'email,firstName,isActive,source,tags,subscribedAt',
    ...list.map((s) =>
      [
        s.email,
        s.firstName || '',
        s.isActive,
        s.source || '',
        (s.tags || []).join('|'),
        s.confirmedAt?.toISOString() || s.createdAt?.toISOString() || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  return res.send(rows);
});
