import Joi from 'joi';
import { MEMBERSHIP_STATUS, ADDON } from '@ssg/shared/enums';

export const suspendMemberSchema = Joi.object({
  suspended: Joi.boolean().required(),
  reason: Joi.string().allow('').max(500),
});

export const overrideMembershipSchema = Joi.object({
  plan: Joi.string(),
  addOns: Joi.array().items(Joi.string().valid(...Object.values(ADDON))),
  endDate: Joi.date(),
  status: Joi.string().valid(...Object.values(MEMBERSHIP_STATUS)),
}).or('plan', 'addOns', 'endDate', 'status');

export const directEmailSchema = Joi.object({
  subject: Joi.string().trim().min(1).max(200).required(),
  body: Joi.string().trim().min(1).max(20000).required(),
});

export const articleSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  excerpt: Joi.string().allow('').max(280),
  body: Joi.string().allow('').max(100000),
  coverImage: Joi.object({ url: Joi.string().uri(), publicId: Joi.string() }).allow(null),
  tags: Joi.array().items(Joi.string()),
  isPublished: Joi.boolean(),
});

export const articleUpdateSchema = articleSchema.fork(['title'], (s) => s.optional());

export const faqSchema = Joi.object({
  question: Joi.string().trim().min(1).max(300).required(),
  answer: Joi.string().trim().min(1).max(4000).required(),
  section: Joi.string().trim().max(60).default('general'),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
});

export const faqUpdateSchema = faqSchema.fork(['question', 'answer'], (s) => s.optional());

export const settingsUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({ key: Joi.string().required(), value: Joi.any() }),
  ).required(),
});

export const subscriberTagsSchema = Joi.object({
  tags: Joi.array().items(Joi.string()).required(),
});

export const membershipSettingsSchema = Joi.object({
  pricingBasic: Joi.number().integer().min(0),
  pricingAddon1: Joi.number().integer().min(0),
  pricingAddon2: Joi.number().integer().min(0),
  pricingRequestFee: Joi.number().integer().min(0),
  addon1Name: Joi.string(),
  addon2Name: Joi.string(),
  basicBenefits: Joi.array().items(Joi.string()),
  addon1Benefits: Joi.array().items(Joi.string()),
  addon2Benefits: Joi.array().items(Joi.string()),
}).min(1);
