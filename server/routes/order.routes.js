import { Router } from 'express';
import * as ctrl from '../controllers/order.controller.js';
import { authenticate, requireActiveMembership } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createOrderSchema, verifyOrderPaymentSchema } from '../validators/order.validators.js';

export const orderRouter = Router();

orderRouter.use(authenticate, requireActiveMembership);

orderRouter.post('/', validate(createOrderSchema), ctrl.createOrder);
orderRouter.post('/verify-payment', validate(verifyOrderPaymentSchema), ctrl.verifyOrderPayment);
orderRouter.get('/', ctrl.listOrders);
orderRouter.get('/:id', ctrl.getOrder);
orderRouter.post('/:id/cancel', ctrl.cancelOrder);
