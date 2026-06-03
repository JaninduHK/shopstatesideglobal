import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
  resetTokenParamsSchema,
} from '../validators/auth.validators.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), ctrl.register);
authRouter.post('/verify-email/:token', validate(verifyEmailParamsSchema, 'params'), ctrl.verifyEmail);
authRouter.post('/login', authLimiter, validate(loginSchema), ctrl.login);
authRouter.post('/refresh-token', ctrl.refresh);
authRouter.post('/logout', ctrl.logout);
authRouter.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
authRouter.post(
  '/reset-password/:token',
  passwordResetLimiter,
  validate(resetTokenParamsSchema, 'params'),
  validate(resetPasswordSchema),
  ctrl.resetPassword,
);
authRouter.get('/me', authenticate, ctrl.me);
