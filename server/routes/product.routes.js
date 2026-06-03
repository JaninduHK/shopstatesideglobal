import { Router } from 'express';
import * as ctrl from '../controllers/product.controller.js';
import { authenticate, requireActiveMembership } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { listProductsSchema } from '../validators/product.validators.js';

export const productRouter = Router();

productRouter.use(authenticate, requireActiveMembership);

productRouter.get('/', validate(listProductsSchema, 'query'), ctrl.listProducts);
productRouter.get('/featured', ctrl.getFeatured);
productRouter.get('/new-arrivals', ctrl.getNewArrivals);
productRouter.get('/flash-sale', ctrl.getFlashSale);
productRouter.get('/:slug', ctrl.getProductBySlug);
