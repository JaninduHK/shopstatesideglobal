import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const FAQItemSchema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 4000 },
    section: { type: String, default: 'general', trim: true, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

FAQItemSchema.index({ section: 1, sortOrder: 1 });

export const FAQItem = model('FAQItem', FAQItemSchema);
