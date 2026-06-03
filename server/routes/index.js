import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { membershipRouter } from './membership.routes.js';
import { productRouter } from './product.routes.js';
import { wishlistRouter } from './wishlist.routes.js';
import { catalogRouter } from './catalog.routes.js';
import { orderRouter } from './order.routes.js';
import { specialRequestRouter } from './specialRequest.routes.js';
import { adminRouter } from './admin/index.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/membership', membershipRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/special-requests', specialRequestRouter);
apiRouter.use('/admin', adminRouter);
