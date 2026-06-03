import { jest } from '@jest/globals';
import request from 'supertest';
import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ensureDefaults } from '../services/siteSettings.service.js';
import { paystack } from '../services/paystack.service.js';
import {
  MEMBERSHIP_STATUS,
  ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PRODUCT_CATEGORY,
  PRODUCT_CONDITION,
  ADDON_GATE,
} from '@ssg/shared/enums';

let app;

async function registerActiveMember({ admin = false, addOns = [] } = {}) {
  const email = `${admin ? 'a' : 'u'}${Math.random().toString(36).slice(2, 7)}@e.com`;
  const password = 'StrongPass1';
  await request(app).post('/api/v1/auth/register').send({
    firstName: 'Test', lastName: 'User', email, password,
  });
  await User.findOneAndUpdate({ email }, {
    emailVerified: true,
    ...(admin ? { role: ROLES.ADMIN } : {}),
    ...(admin ? {} : {
      membership: {
        status: MEMBERSHIP_STATUS.ACTIVE,
        plan: addOns.length === 2 ? 'full' : addOns.length === 1 ? `basic_${addOns[0]}` : 'basic',
        addOns,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 3600_000),
        autoRenew: true,
      },
    }),
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken, user: login.body.data.user };
}

async function seedProduct(overrides = {}) {
  const brand = await Brand.create({ name: `B${Math.random().toString(36).slice(2, 6)}`, slug: `b-${Math.random().toString(36).slice(2, 6)}` });
  const slug = `p-${Math.random().toString(36).slice(2, 8)}`;
  return Product.create({
    title: `Sample ${slug}`,
    slug,
    sku: `SKU-${slug.toUpperCase()}`,
    category: PRODUCT_CATEGORY.HANDBAGS,
    brand: brand._id,
    price: 2_000_000,
    condition: PRODUCT_CONDITION.EXCELLENT,
    isPublished: true,
    images: [{ url: 'https://example.com/a.jpg', publicId: 'a', isPrimary: true }],
    ...overrides,
  });
}

function mockInit() {
  return jest.spyOn(paystack, 'initializeTransaction').mockImplementation(async ({ reference }) => ({
    reference, authorization_url: 'https://x', access_code: 'AC',
  }));
}

const validAddress = {
  fullName: 'Ada Lovelace',
  phone: '+2348000000000',
  line1: '12 Marina',
  city: 'Lagos',
  state: 'Lagos',
  country: 'Nigeria',
};

beforeAll(async () => {
  await startTestDB();
  app = createApp();
  await ensureDefaults();
}, 60_000);
afterAll(async () => { await stopTestDB(); }, 30_000);
afterEach(async () => { await clearTestDB(); await ensureDefaults(); jest.restoreAllMocks(); });

describe('POST /orders', () => {
  it('creates a pending order with snapshots + Paystack ref', async () => {
    const product = await seedProduct({ price: 1_500_000 });
    const { token } = await registerActiveMember();
    mockInit();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product._id, quantity: 1 }],
        shippingAddress: validAddress,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.orderNumber).toMatch(/^LUX-\d{4}-\d{6}$/);
    expect(res.body.data.reference).toMatch(/^ord_/);

    const order = await Order.findById(res.body.data.order.id);
    expect(order.items[0].price).toBe(1_500_000);     // snapshot
    expect(order.items[0].title).toBe(product.title); // snapshot
    expect(order.status).toBe(ORDER_STATUS.PENDING_PAYMENT);
    expect(order.subtotal).toBe(1_500_000);
    expect(order.total).toBe(order.subtotal + order.shippingFee + order.tax);
  });

  it('rejects sold items', async () => {
    const product = await seedProduct({ sold: true });
    const { token } = await registerActiveMember();
    mockInit();
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });
    expect(res.status).toBe(409);
  });

  it('rejects addon-gated product without addon', async () => {
    const product = await seedProduct({ requiresAddon: ADDON_GATE.ADDON1 });
    const { token } = await registerActiveMember();
    mockInit();
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('ADDON_REQUIRED');
  });
});

describe('POST /orders/verify-payment', () => {
  it('confirms order, marks items sold, sends email', async () => {
    const product = await seedProduct();
    const { token } = await registerActiveMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });
    const reference = create.body.data.reference;

    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 2_000_000, paid_at: new Date().toISOString(), id: 1,
    });

    const verify = await request(app)
      .post('/api/v1/orders/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ reference });
    expect(verify.status).toBe(200);
    expect(verify.body.data.order.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(verify.body.data.order.payment.status).toBe(PAYMENT_STATUS.PAID);

    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.sold).toBe(true);
  });

  it('is idempotent', async () => {
    const product = await seedProduct();
    const { token } = await registerActiveMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });
    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 2_000_000, paid_at: new Date().toISOString(), id: 1,
    });
    const ref = create.body.data.reference;
    await request(app).post('/api/v1/orders/verify-payment').set('Authorization', `Bearer ${token}`).send({ reference: ref });
    const second = await request(app).post('/api/v1/orders/verify-payment').set('Authorization', `Bearer ${token}`).send({ reference: ref });
    expect(second.body.data.alreadyVerified).toBe(true);
  });
});

describe('Order cancel', () => {
  it('cancels pending order, un-marks products', async () => {
    const product = await seedProduct();
    const { token } = await registerActiveMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });
    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 2_000_000, paid_at: new Date().toISOString(), id: 1,
    });
    const refundSpy = jest.spyOn(paystack, 'refundTransaction').mockResolvedValue({ status: 'pending' });
    await request(app).post('/api/v1/orders/verify-payment').set('Authorization', `Bearer ${token}`).send({ reference: create.body.data.reference });

    const cancel = await request(app)
      .post(`/api/v1/orders/${create.body.data.order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.order.status).toBe(ORDER_STATUS.CANCELLED);
    expect(refundSpy).toHaveBeenCalled();

    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.sold).toBe(false);
  });
});

describe('Admin orders', () => {
  it('admin lists all orders', async () => {
    const product = await seedProduct();
    const { token: memberToken } = await registerActiveMember();
    mockInit();
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });

    const { token: adminToken } = await registerActiveMember({ admin: true });
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toHaveLength(1);
  });

  it('admin updates status with tracking', async () => {
    const product = await seedProduct();
    const { token: memberToken } = await registerActiveMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ items: [{ productId: product._id }], shippingAddress: validAddress });
    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 2_000_000, paid_at: new Date().toISOString(), id: 1,
    });
    await request(app).post('/api/v1/orders/verify-payment').set('Authorization', `Bearer ${memberToken}`).send({ reference: create.body.data.reference });

    const { token: adminToken } = await registerActiveMember({ admin: true });
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${create.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.SHIPPED, trackingNumber: 'TRK-123', courierService: 'GIG' });
    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe(ORDER_STATUS.SHIPPED);
    expect(res.body.data.order.trackingNumber).toBe('TRK-123');
  });
});
