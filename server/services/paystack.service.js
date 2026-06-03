import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://api.paystack.co';

function authHeader() {
  if (!env.paystack.secretKey) {
    throw ApiError.internal('Paystack not configured (PAYSTACK_SECRET_KEY missing)');
  }
  return { Authorization: `Bearer ${env.paystack.secretKey}` };
}

async function paystackFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    logger.error(`Paystack ${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
    throw ApiError.badRequest(json.message || 'Paystack request failed', { paystack: json });
  }
  return json.data;
}

/**
 * Exposed as a mutable object so tests can replace methods (jest.spyOn doesn't work
 * on ESM named exports). Production code calls paystack.initializeTransaction(...).
 */
export const paystack = {
  async initializeTransaction({ email, amount, reference, metadata, callbackUrl }) {
    return paystackFetch('/transaction/initialize', {
      method: 'POST',
      body: {
        email,
        amount,
        reference,
        currency: 'NGN',
        callback_url: callbackUrl,
        metadata,
      },
    });
  },

  async verifyTransaction(reference) {
    return paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  },

  async chargeAuthorization({ email, amount, authorizationCode, reference, metadata }) {
    return paystackFetch('/transaction/charge_authorization', {
      method: 'POST',
      body: {
        email,
        amount,
        authorization_code: authorizationCode,
        reference,
        currency: 'NGN',
        metadata,
      },
    });
  },

  async refundTransaction({ reference, amount, customerNote, merchantNote }) {
    return paystackFetch('/refund', {
      method: 'POST',
      body: {
        transaction: reference,
        amount,
        customer_note: customerNote,
        merchant_note: merchantNote,
      },
    });
  },
};

/**
 * HMAC-SHA512 signature verification for incoming webhooks.
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!env.paystack.secretKey || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha512', env.paystack.secretKey)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
