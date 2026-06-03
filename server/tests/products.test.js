import request from 'supertest';
import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { ensureDefaults } from '../services/siteSettings.service.js';
import { ROLES, MEMBERSHIP_STATUS, PRODUCT_CATEGORY, PRODUCT_CONDITION, ADDON_GATE } from '@ssg/shared/enums';

let app;

const newUser = (overrides = {}) => ({
  firstName: 'Test', lastName: 'User', email: `t${Date.now()}@e.com`, password: 'StrongPass1', ...overrides,
});

async function registerLoginAndActivate({ admin = false, addOns = [] } = {}) {
  const u = newUser({ email: `${admin ? 'admin' : 'user'}${Math.random().toString(36).slice(2, 7)}@e.com` });
  await request(app).post('/api/v1/auth/register').send(u);
  const updates = { emailVerified: true };
  if (admin) updates.role = ROLES.ADMIN;
  if (!admin) {
    updates.membership = {
      status: MEMBERSHIP_STATUS.ACTIVE,
      plan: addOns.length === 2 ? 'full' : addOns.length === 1 ? `basic_${addOns[0]}` : 'basic',
      addOns,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 3600_000),
      autoRenew: true,
    };
  }
  await User.findOneAndUpdate({ email: u.email }, updates);
  const loginRes = await request(app).post('/api/v1/auth/login').send({ email: u.email, password: u.password });
  return { token: loginRes.body.data.accessToken, user: loginRes.body.data.user };
}

async function seedProduct(overrides = {}) {
  const brand = await Brand.create({ name: `B${Math.random().toString(36).slice(2, 7)}`, slug: `b-${Math.random().toString(36).slice(2, 7)}` });
  const slug = `p-${Math.random().toString(36).slice(2, 8)}`;
  return Product.create({
    title: `Sample ${slug}`,
    slug,
    sku: `SKU-${slug.toUpperCase()}`,
    category: PRODUCT_CATEGORY.HANDBAGS,
    brand: brand._id,
    price: 1_000_000,
    condition: PRODUCT_CONDITION.EXCELLENT,
    isPublished: true,
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

describe('GET /products (member-facing)', () => {
  it('blocks non-members with 402', async () => {
    const u = newUser({ email: 'nomem@example.com' });
    await request(app).post('/api/v1/auth/register').send(u);
    await User.findOneAndUpdate({ email: u.email }, { emailVerified: true });
    const login = await request(app).post('/api/v1/auth/login').send({ email: u.email, password: u.password });
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(402);
  });

  it('returns only published, non-deleted, addon-allowed products', async () => {
    await seedProduct();
    await seedProduct({ isPublished: false });                       // hidden draft
    await seedProduct({ requiresAddon: ADDON_GATE.ADDON1 });          // hidden, user has no addon
    const { token } = await registerLoginAndActivate();
    const res = await request(app).get('/api/v1/products').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
  });

  it('shows addon-gated products to members who own the addon', async () => {
    await seedProduct({ requiresAddon: ADDON_GATE.ADDON1 });
    const { token } = await registerLoginAndActivate({ addOns: ['addon1'] });
    const res = await request(app).get('/api/v1/products').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.products).toHaveLength(1);
  });

  it('filters by category', async () => {
    await seedProduct({ category: PRODUCT_CATEGORY.HANDBAGS });
    await seedProduct({ category: PRODUCT_CATEGORY.WATCHES });
    const { token } = await registerLoginAndActivate();
    const res = await request(app).get('/api/v1/products?category=watches').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0].category).toBe('watches');
  });

  it('paginates', async () => {
    for (let i = 0; i < 5; i++) await seedProduct();
    const { token } = await registerLoginAndActivate();
    const res = await request(app).get('/api/v1/products?page=1&limit=2').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.meta.total).toBe(5);
    expect(res.body.meta.pages).toBe(3);
  });
});

describe('GET /products/:slug', () => {
  it('returns product + related', async () => {
    const product = await seedProduct();
    await seedProduct({ category: product.category }); // related
    const { token } = await registerLoginAndActivate();
    const res = await request(app)
      .get(`/api/v1/products/${product.slug}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.slug).toBe(product.slug);
    expect(res.body.data.related.length).toBeGreaterThan(0);
  });

  it('returns 402 ADDON_REQUIRED when product needs addon user lacks', async () => {
    const product = await seedProduct({ requiresAddon: ADDON_GATE.ADDON2 });
    const { token } = await registerLoginAndActivate();
    const res = await request(app)
      .get(`/api/v1/products/${product.slug}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('ADDON_REQUIRED');
  });
});

describe('Wishlist', () => {
  it('add/list/remove flow', async () => {
    const product = await seedProduct();
    const { token } = await registerLoginAndActivate();

    const add = await request(app)
      .post(`/api/v1/wishlist/${product._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(add.status).toBe(200);

    const list = await request(app).get('/api/v1/wishlist').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.products).toHaveLength(1);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.wishlistCount).toBe(1);

    const remove = await request(app)
      .delete(`/api/v1/wishlist/${product._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);

    const afterRemove = await Product.findById(product._id);
    expect(afterRemove.wishlistCount).toBe(0);
  });

  it('rejects addon-gated product when user lacks addon', async () => {
    const product = await seedProduct({ requiresAddon: ADDON_GATE.ADDON1 });
    const { token } = await registerLoginAndActivate();
    const add = await request(app)
      .post(`/api/v1/wishlist/${product._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(add.status).toBe(402);
  });
});

describe('Admin product CRUD', () => {
  it('rejects non-admin', async () => {
    const { token } = await registerLoginAndActivate();
    const res = await request(app).get('/api/v1/admin/products').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('creates and lists products as admin', async () => {
    const { token } = await registerLoginAndActivate({ admin: true });
    const brand = await Brand.create({ name: 'TestBrand', slug: 'testbrand' });

    const create = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Test Product',
        category: 'handbags',
        brand: brand._id.toString(),
        price: 2_000_000,
        condition: 'excellent',
      });
    expect(create.status).toBe(201);
    expect(create.body.data.product.slug).toBe('new-test-product');
    expect(create.body.data.product.sku).toMatch(/^[A-Z]+-[A-F0-9]+$/);

    const list = await request(app).get('/api/v1/admin/products').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.products).toHaveLength(1);
  });

  it('soft-deletes a product', async () => {
    const { token } = await registerLoginAndActivate({ admin: true });
    const product = await seedProduct();
    const del = await request(app)
      .delete(`/api/v1/admin/products/${product._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const dbProduct = await Product.findById(product._id);
    expect(dbProduct.deletedAt).toBeTruthy();
    expect(dbProduct.isPublished).toBe(false);
  });
});
