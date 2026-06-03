import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

const addressSchema = Joi.object({
  fullName: Joi.string().trim().min(1).max(120).required(),
  phone: Joi.string().trim().allow('').max(30),
  line1: Joi.string().trim().min(1).max(200).required(),
  line2: Joi.string().trim().allow('').max(200),
  city: Joi.string().trim().min(1).max(100).required(),
  state: Joi.string().trim().min(1).max(100).required(),
  country: Joi.string().trim().min(1).max(100).default('Nigeria'),
  postalCode: Joi.string().trim().allow('').max(20),
});

export const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: objectId.required(),
      quantity: Joi.number().integer().min(1).max(10).default(1),
    }),
  ).min(1).required(),
  shippingAddress: addressSchema.required(),
  customerNote: Joi.string().allow('').max(500),
});

export const verifyOrderPaymentSchema = Joi.object({
  reference: Joi.string().min(8).max(100).required(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
    .required(),
  trackingNumber: Joi.string().allow('').max(100),
  courierService: Joi.string().allow('').max(100),
  note: Joi.string().allow('').max(500),
  notifyCustomer: Joi.boolean().default(true),
});

export const orderNoteSchema = Joi.object({
  note: Joi.string().min(1).max(2000).required(),
});
