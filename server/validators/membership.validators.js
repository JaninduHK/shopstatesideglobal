import Joi from 'joi';
import { ADDON } from '@ssg/shared/enums';

const addonValues = Object.values(ADDON);

export const subscribeSchema = Joi.object({
  addOns: Joi.array().items(Joi.string().valid(...addonValues)).max(2).default([]),
});

export const addonSchema = Joi.object({
  addOn: Joi.string().valid(...addonValues).required(),
});

export const verifyPaymentSchema = Joi.object({
  reference: Joi.string().min(8).max(100).required(),
});
