import { ApiError } from '../utils/ApiError.js';
import { verifyWebhookSignature } from '../services/paystack.service.js';
import { env } from '../config/env.js';

/**
 * Mounted after express.raw() for the webhook route. Verifies signature against the raw body,
 * then parses JSON onto req.body for downstream handlers.
 */
export function verifyPaystackSignature(req, res, next) {
  const signature = req.headers['x-paystack-signature'];
  const raw = req.body; // Buffer because route uses express.raw()

  if (!Buffer.isBuffer(raw)) {
    return next(ApiError.badRequest('Webhook requires raw body'));
  }

  // In dev with no webhook secret, log and bypass verification (helpful for local Postman tests).
  if (!env.paystack.secretKey) {
    if (env.isProd) return next(ApiError.unauthorized('Webhook secret not configured'));
  } else if (!verifyWebhookSignature(raw, signature)) {
    return next(ApiError.unauthorized('Invalid webhook signature'));
  }

  try {
    req.body = JSON.parse(raw.toString('utf8'));
    next();
  } catch {
    next(ApiError.badRequest('Invalid webhook JSON'));
  }
}
