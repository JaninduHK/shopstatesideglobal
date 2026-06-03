import { Router } from 'express';
import * as ctrl from '../controllers/specialRequest.controller.js';
import { authenticate, requireActiveMembership } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  submitRequestSchema,
  verifyPaymentSchema,
} from '../validators/specialRequest.validators.js';

export const specialRequestRouter = Router();

specialRequestRouter.use(authenticate, requireActiveMembership);

specialRequestRouter.get('/upload-signature', ctrl.uploadSignature);

specialRequestRouter.post('/', validate(submitRequestSchema), ctrl.submitRequest);
specialRequestRouter.post('/verify-payment', validate(verifyPaymentSchema), ctrl.verifySubmissionPayment);
specialRequestRouter.get('/', ctrl.listRequests);
specialRequestRouter.get('/:id', ctrl.getRequest);
specialRequestRouter.post('/:id/pay-additional', ctrl.payAdditional);
specialRequestRouter.post('/:id/pay-additional/verify', validate(verifyPaymentSchema), ctrl.verifyAdditionalPayment);
