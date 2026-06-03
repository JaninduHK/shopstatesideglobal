import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Idempotency log for Paystack webhooks. We dedupe by Paystack's event id
// (or, as a fallback, the transaction reference + event type).
const ProcessedWebhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: String,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL — drop after 30 days
ProcessedWebhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ProcessedWebhookEvent = model('ProcessedWebhookEvent', ProcessedWebhookEventSchema);
