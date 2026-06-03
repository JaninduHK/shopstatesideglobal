import { User } from '../../models/User.js';
import { MembershipTransaction } from '../../models/MembershipTransaction.js';
import { ok } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import {
  getSetting,
  setSetting,
  SETTINGS_KEYS,
  clearCache,
} from '../../services/siteSettings.service.js';
import { MEMBERSHIP_STATUS } from '@ssg/shared/enums';

export const listSubscriptions = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const filter = { 'membership.status': status || MEMBERSHIP_STATUS.ACTIVE };

  const total = await User.countDocuments(filter);
  const subs = await User.find(filter)
    .sort({ 'membership.endDate': 1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .select('firstName lastName email membership createdAt')
    .lean();
  return ok(res, { subscriptions: subs }, { page: Number(page), limit: Number(limit), total });
});

export const listAllTransactions = catchAsync(async (req, res) => {
  const { type, status, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  const total = await MembershipTransaction.countDocuments(filter);
  const txs = await MembershipTransaction.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('user', 'firstName lastName email')
    .lean();
  return ok(res, { transactions: txs }, { page: Number(page), limit: Number(limit), total });
});

export const getMembershipSettings = catchAsync(async (req, res) => {
  const [basic, addon1, addon2, requestFee, addon1Name, addon2Name, basicBenefits, addon1Benefits, addon2Benefits] = await Promise.all([
    getSetting(SETTINGS_KEYS.PRICING_BASIC),
    getSetting(SETTINGS_KEYS.PRICING_ADDON1),
    getSetting(SETTINGS_KEYS.PRICING_ADDON2),
    getSetting(SETTINGS_KEYS.PRICING_REQUEST_FEE),
    getSetting(SETTINGS_KEYS.ADDON1_NAME),
    getSetting(SETTINGS_KEYS.ADDON2_NAME),
    getSetting(SETTINGS_KEYS.BASIC_BENEFITS),
    getSetting(SETTINGS_KEYS.ADDON1_BENEFITS),
    getSetting(SETTINGS_KEYS.ADDON2_BENEFITS),
  ]);
  return ok(res, {
    pricing: { basic, addon1, addon2, requestFee },
    addon1: { name: addon1Name, benefits: addon1Benefits },
    addon2: { name: addon2Name, benefits: addon2Benefits },
    basicBenefits,
  });
});

export const updateMembershipSettings = catchAsync(async (req, res) => {
  const updates = req.body || {};
  const map = {
    pricingBasic: SETTINGS_KEYS.PRICING_BASIC,
    pricingAddon1: SETTINGS_KEYS.PRICING_ADDON1,
    pricingAddon2: SETTINGS_KEYS.PRICING_ADDON2,
    pricingRequestFee: SETTINGS_KEYS.PRICING_REQUEST_FEE,
    addon1Name: SETTINGS_KEYS.ADDON1_NAME,
    addon2Name: SETTINGS_KEYS.ADDON2_NAME,
    basicBenefits: SETTINGS_KEYS.BASIC_BENEFITS,
    addon1Benefits: SETTINGS_KEYS.ADDON1_BENEFITS,
    addon2Benefits: SETTINGS_KEYS.ADDON2_BENEFITS,
  };
  for (const [k, settingKey] of Object.entries(map)) {
    if (updates[k] !== undefined) {
      await setSetting(settingKey, updates[k], req.user._id);
    }
  }
  clearCache();
  return ok(res, { saved: true });
});
