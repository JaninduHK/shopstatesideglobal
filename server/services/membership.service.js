import { MEMBERSHIP_STATUS, MEMBERSHIP_PLAN, ADDON } from '@ssg/shared/enums';
import { getPricing } from './siteSettings.service.js';
import { ApiError } from '../utils/ApiError.js';

const MS_PER_DAY = 24 * 3600_000;
const BILLING_CYCLE_DAYS = 30;

export function planCodeFor(addOns) {
  const sorted = Array.from(new Set(addOns || [])).sort();
  if (sorted.length === 0) return MEMBERSHIP_PLAN.BASIC;
  if (sorted.length === 2) return MEMBERSHIP_PLAN.FULL;
  if (sorted[0] === ADDON.ADDON1) return MEMBERSHIP_PLAN.BASIC_ADDON1;
  if (sorted[0] === ADDON.ADDON2) return MEMBERSHIP_PLAN.BASIC_ADDON2;
  return MEMBERSHIP_PLAN.BASIC;
}

export async function calculateAmount({ includeBasic = true, addOns = [] }) {
  const pricing = await getPricing();
  let total = includeBasic ? pricing.basic : 0;
  for (const a of new Set(addOns)) {
    if (a === ADDON.ADDON1) total += pricing.addon1;
    if (a === ADDON.ADDON2) total += pricing.addon2;
  }
  return total;
}

/**
 * Activate or renew a membership.
 * - On first activation: start = now, end = now + 30d, addOns = passed in.
 * - On renewal: extend endDate from current end (or now if already lapsed).
 * - On add-on purchase mid-cycle: merge new addOns into existing, keep endDate.
 */
export function applyActivation(
  user,
  { type, addOns = [], includeBasic = true, addonOnly = false },
) {
  const now = new Date();
  const m = user.membership || {};

  if (addonOnly) {
    // Adding add-ons to an active basic; endDate untouched
    const merged = Array.from(new Set([...(m.addOns || []), ...addOns]));
    m.addOns = merged;
  } else {
    const startFrom = m.endDate && m.endDate > now ? m.endDate : now;
    if (type === 'new' || !m.startDate) m.startDate = now;
    m.endDate = new Date(startFrom.getTime() + BILLING_CYCLE_DAYS * MS_PER_DAY);
    if (includeBasic) {
      // Replace add-ons on a new/renewal purchase to reflect what user just paid for
      m.addOns = Array.from(new Set(addOns));
    }
  }

  m.status = MEMBERSHIP_STATUS.ACTIVE;
  m.plan = planCodeFor(m.addOns);
  m.autoRenew = m.autoRenew ?? true;
  user.membership = m;
}

export function applyCancellation(user) {
  if (!user.membership) throw ApiError.notFound('No membership');
  user.membership.autoRenew = false;
  // Keep status active until endDate; status flips to expired on cron sweep
}

export function applyExpired(user) {
  if (!user.membership) return;
  user.membership.status = MEMBERSHIP_STATUS.EXPIRED;
}

export function daysUntilExpiry(user) {
  if (!user.membership?.endDate) return null;
  const diff = user.membership.endDate.getTime() - Date.now();
  return Math.ceil(diff / MS_PER_DAY);
}

export function validateAddonsArg(addOns) {
  const validValues = Object.values(ADDON);
  for (const a of addOns || []) {
    if (!validValues.includes(a)) {
      throw ApiError.badRequest(`Unknown add-on: ${a}`);
    }
  }
}
