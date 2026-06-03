import { Router } from 'express';
import * as ctrl from '../controllers/membership.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyPaystackSignature } from '../middleware/paystackWebhook.middleware.js';
import {
  subscribeSchema,
  addonSchema,
  verifyPaymentSchema,
} from '../validators/membership.validators.js';

export const membershipRouter = Router();

// Public
membershipRouter.get('/plans', ctrl.getPlans);

// Webhook — raw body middleware is registered in app.js for this exact path.
// Here we just verify signature + parse, then handle.
membershipRouter.post('/paystack-webhook', verifyPaystackSignature, ctrl.handleWebhook);

// Auth required
membershipRouter.use(authenticate);

membershipRouter.post('/subscribe', validate(subscribeSchema), ctrl.subscribe);
membershipRouter.post('/verify-payment', validate(verifyPaymentSchema), ctrl.verifyPayment);
membershipRouter.post('/add-on', validate(addonSchema), ctrl.purchaseAddon);
membershipRouter.post('/cancel', ctrl.cancel);
membershipRouter.get('/transactions', ctrl.transactions);
