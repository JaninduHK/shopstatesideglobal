import { Router } from 'express';
import * as ctrl from '../controllers/wishlist.controller.js';
import { authenticate, requireActiveMembership } from '../middleware/auth.middleware.js';

export const wishlistRouter = Router();

wishlistRouter.use(authenticate, requireActiveMembership);

wishlistRouter.get('/', ctrl.getWishlist);
wishlistRouter.post('/:productId', ctrl.addToWishlist);
wishlistRouter.delete('/:productId', ctrl.removeFromWishlist);
