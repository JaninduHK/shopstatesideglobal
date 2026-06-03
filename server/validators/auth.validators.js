import Joi from 'joi';

const passwordRule = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[0-9]/, 'number')
  .required()
  .messages({
    'string.pattern.name': 'Password must contain {#name}',
    'string.min': 'Password must be at least 8 characters',
  });

export const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(60).required(),
  lastName: Joi.string().trim().min(1).max(60).required(),
  email: Joi.string().email().lowercase().required(),
  password: passwordRule,
  phone: Joi.string().trim().allow('').max(30),
  subscribeEmail: Joi.boolean().default(true),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

export const resetPasswordSchema = Joi.object({
  password: passwordRule,
});

export const verifyEmailParamsSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
});

export const resetTokenParamsSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
});
