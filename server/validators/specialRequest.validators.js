import Joi from 'joi';
import { PRODUCT_CATEGORY, SPECIAL_REQUEST_STATUS } from '@ssg/shared/enums';

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().required(),
  alt: Joi.string().allow('').default(''),
});

export const submitRequestSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(10).max(5000).required(),
  budget: Joi.number().integer().min(0).required(), // kobo
  category: Joi.string().valid(...Object.values(PRODUCT_CATEGORY)),
  brand: Joi.string().trim().allow('').max(120),
  additionalNotes: Joi.string().allow('').max(2000),
  referenceImages: Joi.array().items(imageSchema).max(5).default([]),
});

export const verifyPaymentSchema = Joi.object({
  reference: Joi.string().min(8).max(100).required(),
});

export const assessSchema = Joi.object({
  additionalCostAssessed: Joi.number().integer().min(0).required(),
  additionalCostNote: Joi.string().trim().min(1).max(2000).required(),
});

export const adminUpdateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(SPECIAL_REQUEST_STATUS)).required(),
  note: Joi.string().allow('').max(2000),
});

export const requestNoteSchema = Joi.object({
  note: Joi.string().min(1).max(2000).required(),
});
