import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

import * as productAdmin from '../../controllers/admin/product.admin.controller.js';
import * as brandAdmin from '../../controllers/admin/brand.admin.controller.js';
import * as categoryAdmin from '../../controllers/admin/category.admin.controller.js';
import * as orderAdmin from '../../controllers/admin/order.admin.controller.js';
import * as requestAdmin from '../../controllers/admin/specialRequest.admin.controller.js';
import * as dashboard from '../../controllers/admin/dashboard.admin.controller.js';
import * as memberAdmin from '../../controllers/admin/member.admin.controller.js';
import * as membershipsAdmin from '../../controllers/admin/memberships.admin.controller.js';
import * as subscribersAdmin from '../../controllers/admin/subscribers.admin.controller.js';
import * as settingsAdmin from '../../controllers/admin/settings.admin.controller.js';
import * as contentAdmin from '../../controllers/admin/content.admin.controller.js';

import {
  createProductSchema,
  updateProductSchema,
  addImagesSchema,
  brandSchema,
  categorySchema,
} from '../../validators/product.validators.js';
import {
  updateOrderStatusSchema,
  orderNoteSchema,
} from '../../validators/order.validators.js';
import {
  assessSchema,
  adminUpdateStatusSchema,
  requestNoteSchema,
} from '../../validators/specialRequest.validators.js';
import {
  suspendMemberSchema,
  overrideMembershipSchema,
  directEmailSchema,
  articleSchema,
  articleUpdateSchema,
  faqSchema,
  faqUpdateSchema,
  settingsUpdateSchema,
  subscriberTagsSchema,
  membershipSettingsSchema,
} from '../../validators/admin.validators.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

// Dashboard
adminRouter.get('/dashboard/stats', dashboard.getStats);
adminRouter.get('/dashboard/revenue-chart', dashboard.getRevenueChart);
adminRouter.get('/dashboard/membership-growth', dashboard.getMembershipGrowth);
adminRouter.get('/dashboard/recent-activity', dashboard.getRecentActivity);

// Cloudinary signed upload params
adminRouter.get('/products/upload-signature', productAdmin.adminUploadSignature);

// Products
adminRouter.get('/products', productAdmin.adminListProducts);
adminRouter.post('/products', validate(createProductSchema), productAdmin.adminCreateProduct);
adminRouter.get('/products/:id', productAdmin.adminGetProduct);
adminRouter.put('/products/:id', validate(updateProductSchema), productAdmin.adminUpdateProduct);
adminRouter.delete('/products/:id', productAdmin.adminDeleteProduct);
adminRouter.post('/products/:id/images', validate(addImagesSchema), productAdmin.adminAddImages);
adminRouter.delete('/products/:id/images/:imageId', productAdmin.adminRemoveImage);
adminRouter.patch('/products/:id/images/:imageId/primary', productAdmin.adminSetPrimaryImage);
adminRouter.patch('/products/:id/publish', productAdmin.adminPublish);
adminRouter.patch('/products/:id/feature', productAdmin.adminFeature);

// Brands
adminRouter.get('/brands', brandAdmin.listBrands);
adminRouter.post('/brands', validate(brandSchema), brandAdmin.createBrand);
adminRouter.put('/brands/:id', validate(brandSchema.fork(['name'], (s) => s.optional())), brandAdmin.updateBrand);
adminRouter.delete('/brands/:id', brandAdmin.deleteBrand);

// Categories
adminRouter.get('/categories', categoryAdmin.listCategories);
adminRouter.post('/categories', validate(categorySchema), categoryAdmin.createCategory);
adminRouter.put('/categories/:id', validate(categorySchema.fork(['name'], (s) => s.optional())), categoryAdmin.updateCategory);
adminRouter.delete('/categories/:id', categoryAdmin.deleteCategory);

// Orders
adminRouter.get('/orders', orderAdmin.adminListOrders);
adminRouter.get('/orders/:id', orderAdmin.adminGetOrder);
adminRouter.patch('/orders/:id/status', validate(updateOrderStatusSchema), orderAdmin.adminUpdateOrderStatus);
adminRouter.post('/orders/:id/note', validate(orderNoteSchema), orderAdmin.adminAddOrderNote);

// Special Requests
adminRouter.get('/special-requests', requestAdmin.adminListRequests);
adminRouter.get('/special-requests/:id', requestAdmin.adminGetRequest);
adminRouter.patch('/special-requests/:id/assess', validate(assessSchema), requestAdmin.adminAssess);
adminRouter.patch('/special-requests/:id/status', validate(adminUpdateStatusSchema), requestAdmin.adminUpdateStatus);
adminRouter.post('/special-requests/:id/note', validate(requestNoteSchema), requestAdmin.adminAddRequestNote);

// Members
adminRouter.get('/members', memberAdmin.adminListMembers);
adminRouter.get('/members/:id', memberAdmin.adminGetMember);
adminRouter.patch('/members/:id/suspend', validate(suspendMemberSchema), memberAdmin.adminSuspendMember);
adminRouter.patch('/members/:id/membership', validate(overrideMembershipSchema), memberAdmin.adminUpdateMembership);
adminRouter.post('/members/:id/email', validate(directEmailSchema), memberAdmin.adminSendDirectEmail);
adminRouter.delete('/members/:id', memberAdmin.adminDeleteMember);

// Memberships
adminRouter.get('/memberships/subscriptions', membershipsAdmin.listSubscriptions);
adminRouter.get('/memberships/transactions', membershipsAdmin.listAllTransactions);
adminRouter.get('/memberships/settings', membershipsAdmin.getMembershipSettings);
adminRouter.patch('/memberships/settings', validate(membershipSettingsSchema), membershipsAdmin.updateMembershipSettings);

// Subscribers (admin; public subscribe lands in Phase 7)
adminRouter.get('/subscribers', subscribersAdmin.listSubscribers);
adminRouter.get('/subscribers/export', subscribersAdmin.exportSubscribersCSV);
adminRouter.patch('/subscribers/:id/tags', validate(subscriberTagsSchema), subscribersAdmin.updateSubscriberTags);
adminRouter.delete('/subscribers/:id', subscribersAdmin.deleteSubscriber);

// Settings
adminRouter.get('/settings', settingsAdmin.listSettings);
adminRouter.patch('/settings', validate(settingsUpdateSchema), settingsAdmin.updateSettings);

// Content: Articles
adminRouter.get('/content/articles', contentAdmin.listArticles);
adminRouter.post('/content/articles', validate(articleSchema), contentAdmin.createArticle);
adminRouter.get('/content/articles/:id', contentAdmin.getArticle);
adminRouter.put('/content/articles/:id', validate(articleUpdateSchema), contentAdmin.updateArticle);
adminRouter.delete('/content/articles/:id', contentAdmin.deleteArticle);

// Content: FAQ
adminRouter.get('/content/faq', contentAdmin.listFAQ);
adminRouter.post('/content/faq', validate(faqSchema), contentAdmin.createFAQ);
adminRouter.put('/content/faq/:id', validate(faqUpdateSchema), contentAdmin.updateFAQ);
adminRouter.delete('/content/faq/:id', contentAdmin.deleteFAQ);
