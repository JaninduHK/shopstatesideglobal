import { Counter } from '../models/Counter.js';
import { ApiError } from '../utils/ApiError.js';
import { REQUEST_NUMBER_PREFIX } from '@ssg/shared/constants';
import { SPECIAL_REQUEST_STATUS } from '@ssg/shared/enums';
import { getSetting, SETTINGS_KEYS } from './siteSettings.service.js';

export async function nextRequestNumber() {
  const year = new Date().getFullYear();
  const n = await Counter.next(`request:${year}`);
  return `${REQUEST_NUMBER_PREFIX}-${year}-${String(n).padStart(6, '0')}`;
}

export async function currentSubmissionFee() {
  return getSetting(SETTINGS_KEYS.PRICING_REQUEST_FEE);
}

export function appendStatusHistory(req, status, { changedBy, note } = {}) {
  req.statusHistory.push({ status, changedAt: new Date(), changedBy, note });
}

// What admin-initiated transitions are allowed from each state.
const ADMIN_TRANSITIONS = {
  [SPECIAL_REQUEST_STATUS.SUBMITTED]: [
    SPECIAL_REQUEST_STATUS.UNDER_REVIEW,
    SPECIAL_REQUEST_STATUS.ACCEPTED,
    SPECIAL_REQUEST_STATUS.REJECTED,
  ],
  [SPECIAL_REQUEST_STATUS.UNDER_REVIEW]: [
    SPECIAL_REQUEST_STATUS.ACCEPTED,
    SPECIAL_REQUEST_STATUS.REJECTED,
  ],
  [SPECIAL_REQUEST_STATUS.ACCEPTED]: [
    SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT,
    SPECIAL_REQUEST_STATUS.REJECTED,
  ],
  [SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT]: [
    SPECIAL_REQUEST_STATUS.ADDITIONAL_PAID, // server-driven; admin rarely sets
    SPECIAL_REQUEST_STATUS.CANCELLED,
  ],
  [SPECIAL_REQUEST_STATUS.ADDITIONAL_PAID]: [
    SPECIAL_REQUEST_STATUS.SOURCING,
  ],
  [SPECIAL_REQUEST_STATUS.SOURCING]: [
    SPECIAL_REQUEST_STATUS.READY,
    SPECIAL_REQUEST_STATUS.CANCELLED,
  ],
  [SPECIAL_REQUEST_STATUS.READY]: [
    SPECIAL_REQUEST_STATUS.COMPLETED,
  ],
};

export function assertAdminTransition(from, to) {
  const allowed = ADMIN_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict(`Cannot transition from ${from} to ${to}`);
  }
}
