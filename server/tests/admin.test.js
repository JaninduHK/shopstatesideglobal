import request from 'supertest';
import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Brand } from '../models/Brand.js';
import { EmailSubscriber } from '../models/EmailSubscriber.js';
import { ensureDefaults, getSetting, SETTINGS_KEYS } from '../services/siteSettings.service.js';
import {
  ROLES, MEMBERSHIP_STATUS, PRODUCT_CATEGORY, PRODUCT_CONDITION, PAYMENT_STATUS, ORDER_STATUS,
} from '@ssg/shared/enums';

let app;

async function makeUser({ admin = false, member = false } = {}) {
  const email = `${admin ? 'a' : member ? 'm' : 'u'}${Math.random().toString(36).slice(2, 7)}@e.com`;
  const password = 'StrongPass1';
  await request(app).post('/api/v1/auth/register').send({ firstName: 'T', lastName: 'U', email, password });
  await User.findOneAndUpdate({ email }, {
    emailVerified: true,
    ...(admin ? { role: ROLES.ADMIN } : {}),
    ...(member ? {
      membership: {
        status: MEMBERSHIP_STATUS.ACTIVE, plan: 'basic', addOns: [],
        startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 3600_000), autoRenew: true,
      },
    } : {}),
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken, user: login.body.data.user };
}

async function seedProduct(overrides = {}) {
  const brand = await Brand.create({ name: `B${Math.random().toString(36).slice(2, 6)}`, slug: `b-${Math.random().toString(36).slice(2, 6)}` });
  const slug = `p-${Math.random().toString(36).slice(2, 8)}`;
  return Product.create({
    title: `P ${slug}`, slug, sku: `SKU-${slug.toUpperCase()}`,
    category: PRODUCT_CATEGORY.HANDBAGS, brand: brand._id, price: 1_000_000,
    condition: PRODUCT_CONDITION.EXCELLENT, isPublished: true,
    images: [{ url: 'https://example.com/a.jpg', publicId: 'a', isPrimary: true }],
    ...overrides,
  });
}

beforeAll(async () => {
  await startTestDB();
  app = createApp();
  await ensureDefaults();
}, 60_000);
afterAll(async () => { await stopTestDB(); }, 30_000);
afterEach(async () => { await clearTestDB(); await ensureDefaults(); });

describe('Authorization', () => {
  it('blocks members from all admin routes', async () => {
    const { token } = await makeUser({ member: true });
    const endpoints = [
      '/api/v1/admin/dashboard/stats',
      '/api/v1/admin/members',
      '/api/v1/admin/memberships/subscriptions',
      '/api/v1/admin/subscribers',
      '/api/v1/admin/settings',
    ];
    for (const ep of endpoints) {
      const res = await request(app).get(ep).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('Dashboard stats', () => {
  it('returns KPI counts including paid revenue', async () => {
    await makeUser({ member: true });
    await makeUser({ member: true });
    const product = await seedProduct();

    // Paid order
    await Order.create({
      orderNumber: 'LUX-2026-000001',
      user: (await makeUser({ member: true })).user.id,
      items: [{ product: product._id, title: 't', price: 1_000_000, quantity: 1 }],
      shippingAddress: { fullName: 'X', line1: 'a', city: 'L', state: 'L', country: 'NG' },
      subtotal: 1_000_000, shippingFee: 0, tax: 0, total: 1_000_000,
      payment: { status: PAYMENT_STATUS.PAID, paidAt: new Date(), paystackReference: 'r1' },
      status: ORDER_STATUS.CONFIRMED,
    });

    const { token } = await makeUser({ admin: true });
    const res = await request(app).get('/api/v1/admin/dashboard/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.activeMembers).toBeGreaterThanOrEqual(3);
    expect(res.body.data.revenue.allTime).toBe(1_000_000);
    expect(res.body.data.productsListed).toBe(1);
    expect(res.body.data.pendingOrders).toBe(1);
  });

  it('revenue chart pads missing days with zero', async () => {
    const { token } = await makeUser({ admin: true });
    const res = await request(app).get('/api/v1/admin/dashboard/revenue-chart?range=7d').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.series).toHaveLength(7);
    expect(res.body.data.series.every((p) => p.revenue === 0)).toBe(true);
  });
});

describe('Member management', () => {
  it('lists members with totalSpent', async () => {
    await makeUser({ member: true });
    await makeUser({ member: true });
    const { token } = await makeUser({ admin: true });
    const res = await request(app).get('/api/v1/admin/members').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.members.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.members[0]).toHaveProperty('totalSpent');
  });

  it('suspends a member', async () => {
    const { user: member } = await makeUser({ member: true });
    const { token: adminToken } = await makeUser({ admin: true });
    const res = await request(app)
      .patch(`/api/v1/admin/members/${member.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ suspended: true, reason: 'Test' });
    expect(res.status).toBe(200);
    const db = await User.findById(member.id);
    expect(db.isActive).toBe(false);
    expect(db.suspendReason).toBe('Test');
  });

  it('overrides membership manually', async () => {
    const { user: member } = await makeUser({ member: true });
    const { token: adminToken } = await makeUser({ admin: true });
    const newEnd = new Date(Date.now() + 90 * 24 * 3600_000);
    const res = await request(app)
      .patch(`/api/v1/admin/members/${member.id}/membership`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ addOns: ['addon1', 'addon2'], endDate: newEnd.toISOString() });
    expect(res.status).toBe(200);
    const db = await User.findById(member.id);
    expect(db.membership.addOns).toEqual(expect.arrayContaining(['addon1', 'addon2']));
    expect(db.membership.plan).toBe('full');
  });
});

describe('Settings + memberships settings', () => {
  it('updates pricing and reads back updated value', async () => {
    const { token } = await makeUser({ admin: true });
    const update = await request(app)
      .patch('/api/v1/admin/memberships/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ pricingBasic: 2_500_000 });
    expect(update.status).toBe(200);
    const fresh = await getSetting(SETTINGS_KEYS.PRICING_BASIC);
    expect(fresh).toBe(2_500_000);
  });

  it('lists and patches generic settings', async () => {
    const { token } = await makeUser({ admin: true });
    const list = await request(app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.settings).toBeDefined();

    const patch = await request(app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ updates: [{ key: SETTINGS_KEYS.SITE_NAME, value: 'New Name' }] });
    expect(patch.status).toBe(200);
    const fresh = await getSetting(SETTINGS_KEYS.SITE_NAME);
    expect(fresh).toBe('New Name');
  });
});

describe('Subscribers + content', () => {
  it('lists subscribers, tags them, exports CSV', async () => {
    await EmailSubscriber.create({
      email: 'test@x.com', firstName: 'T', source: 'footer_form', isActive: true, tags: [],
    });
    const { token } = await makeUser({ admin: true });
    const list = await request(app).get('/api/v1/admin/subscribers').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.subscribers).toHaveLength(1);

    const sub = list.body.data.subscribers[0];
    const tag = await request(app)
      .patch(`/api/v1/admin/subscribers/${sub._id}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tags: ['vip', 'inner-circle'] });
    expect(tag.body.data.subscriber.tags).toEqual(['vip', 'inner-circle']);

    const csv = await request(app).get('/api/v1/admin/subscribers/export').set('Authorization', `Bearer ${token}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/csv/);
    expect(csv.text).toContain('test@x.com');
  });

  it('CRUDs FAQ items', async () => {
    const { token } = await makeUser({ admin: true });
    const create = await request(app)
      .post('/api/v1/admin/content/faq')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'Q?', answer: 'A.', section: 'membership' });
    expect(create.status).toBe(201);

    const list = await request(app).get('/api/v1/admin/content/faq').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.items).toHaveLength(1);
  });

  it('CRUDs articles', async () => {
    const { token } = await makeUser({ admin: true });
    const create = await request(app)
      .post('/api/v1/admin/content/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hello', body: 'World', isPublished: true });
    expect(create.status).toBe(201);
    expect(create.body.data.article.slug).toBe('hello');
    expect(create.body.data.article.publishedAt).toBeTruthy();
  });
});
