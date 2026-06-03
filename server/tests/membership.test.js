import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import request from 'supertest';
import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { MembershipTransaction } from '../models/MembershipTransaction.js';
import { ensureDefaults } from '../services/siteSettings.service.js';
import { paystack } from '../services/paystack.service.js';
import { MEMBERSHIP_STATUS, PAYMENT_STATUS } from '@ssg/shared/enums';

let app;

async function registerAndLogin(overrides = {}) {
  const user = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'StrongPass1',
    ...overrides,
  };
  await request(app).post('/api/v1/auth/register').send(user);
  await User.findOneAndUpdate({ email: user.email }, { emailVerified: true });
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password });
  return { token: loginRes.body.data.accessToken, user: loginRes.body.data.user };
}

// Mock helper that echoes the controller-generated reference back.
function mockInit() {
  return jest.spyOn(paystack, 'initializeTransaction').mockImplementation(async ({ reference }) => ({
    reference,
    authorization_url: 'https://checkout.paystack.com/x',
    access_code: 'ACCESS_X',
  }));
}

beforeAll(async () => {
  await startTestDB();
  app = createApp();
  await ensureDefaults();
}, 60_000);

afterAll(async () => {
  await stopTestDB();
}, 30_000);

afterEach(async () => {
  await clearTestDB();
  await ensureDefaults();
  jest.restoreAllMocks();
});

describe('GET /api/v1/membership/plans', () => {
  it('returns basic + two add-ons with kobo pricing', async () => {
    const res = await request(app).get('/api/v1/membership/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.plans.basic.monthly).toBe(2_000_000);
    expect(res.body.data.addOns.addon1.monthly).toBe(2_000_000);
    expect(res.body.data.addOns.addon2.monthly).toBe(2_000_000);
    expect(res.body.data.plans.basic.benefits.length).toBeGreaterThan(0);
  });
});

describe('POST /api/v1/membership/subscribe', () => {
  it('rejects when email not verified', async () => {
    await request(app).post('/api/v1/auth/register').send({
      firstName: 'X', lastName: 'Y', email: 'x@y.com', password: 'StrongPass1',
    });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'x@y.com', password: 'StrongPass1' });

    const res = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({ addOns: [] });
    expect(res.status).toBe(403);
  });

  it('initializes Paystack and returns access code', async () => {
    const { token } = await registerAndLogin();
    mockInit();

    const res = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOns: [] });

    expect(res.status).toBe(201);
    expect(res.body.data.accessCode).toBe('ACCESS_X');
    expect(res.body.data.amount).toBe(2_000_000);
    expect(res.body.data.reference).toMatch(/^mem_/);

    const tx = await MembershipTransaction.findOne({ paystackReference: res.body.data.reference });
    expect(tx).not.toBeNull();
    expect(tx.status).toBe(PAYMENT_STATUS.PENDING);
  });

  it('amount includes both add-ons', async () => {
    const { token } = await registerAndLogin();
    mockInit();
    const res = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOns: ['addon1', 'addon2'] });
    expect(res.body.data.amount).toBe(6_000_000);
  });
});

describe('POST /api/v1/membership/verify-payment', () => {
  it('activates membership on success', async () => {
    const { token, user } = await registerAndLogin();
    mockInit();
    const sub = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOns: ['addon1'] });
    const reference = sub.body.data.reference;

    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success',
      amount: 4_000_000,
      paid_at: new Date().toISOString(),
      id: 9999,
      authorization: { authorization_code: 'AUTH_REUSABLE' },
      customer: { customer_code: 'CUS_X' },
    });

    const res = await request(app)
      .post('/api/v1/membership/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ reference });

    expect(res.status).toBe(200);
    expect(res.body.data.membership.status).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(res.body.data.membership.addOns).toContain('addon1');

    const dbUser = await User.findById(user.id);
    expect(dbUser.membership.status).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(dbUser.membership.paystackAuthorizationCode).toBe('AUTH_REUSABLE');
    expect(dbUser.membership.endDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('is idempotent — second call returns alreadyVerified', async () => {
    const { token } = await registerAndLogin();
    mockInit();
    const sub = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOns: [] });
    const reference = sub.body.data.reference;

    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success',
      amount: 2_000_000,
      paid_at: new Date().toISOString(),
      id: 1,
      authorization: { authorization_code: 'AUTH' },
      customer: { customer_code: 'CUS' },
    });
    await request(app)
      .post('/api/v1/membership/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ reference });

    const second = await request(app)
      .post('/api/v1/membership/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ reference });
    expect(second.status).toBe(200);
    expect(second.body.data.alreadyVerified).toBe(true);
  });

  it('marks transaction failed if Paystack reports failure', async () => {
    const { token } = await registerAndLogin();
    mockInit();
    const sub = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOns: [] });
    const reference = sub.body.data.reference;

    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'failed',
      amount: 2_000_000,
      gateway_response: 'Insufficient funds',
    });
    const res = await request(app)
      .post('/api/v1/membership/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ reference });
    expect(res.status).toBe(400);

    const tx = await MembershipTransaction.findOne({ paystackReference: reference });
    expect(tx.status).toBe(PAYMENT_STATUS.FAILED);
  });
});

describe('POST /api/v1/membership/add-on', () => {
  it('rejects without active membership', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post('/api/v1/membership/add-on')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOn: 'addon1' });
    expect(res.status).toBe(402);
  });

  it('rejects if user already has the add-on', async () => {
    const { token, user } = await registerAndLogin();
    await User.findByIdAndUpdate(user.id, {
      membership: {
        status: 'active',
        plan: 'basic_addon1',
        addOns: ['addon1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 3600_000),
        autoRenew: true,
      },
    });
    const res = await request(app)
      .post('/api/v1/membership/add-on')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOn: 'addon1' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/membership/cancel', () => {
  it('flips autoRenew off without ending access immediately', async () => {
    const { token, user } = await registerAndLogin();
    await User.findByIdAndUpdate(user.id, {
      membership: {
        status: 'active',
        plan: 'basic',
        addOns: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 3600_000),
        autoRenew: true,
      },
    });
    const res = await request(app)
      .post('/api/v1/membership/cancel')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.membership.autoRenew).toBe(false);
    expect(res.body.data.membership.status).toBe('active');
  });
});

describe('POST /api/v1/membership/paystack-webhook', () => {
  it('rejects bad signature', async () => {
    const event = { event: 'charge.success', data: { reference: 'x' } };
    const res = await request(app)
      .post('/api/v1/membership/paystack-webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', 'wrong')
      .send(JSON.stringify(event));
    expect(res.status).toBe(401);
  });

  it('accepts valid signature and is idempotent', async () => {
    const { token, user } = await registerAndLogin();
    mockInit();
    const sub = await request(app)
      .post('/api/v1/membership/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ addOns: [] });
    const reference = sub.body.data.reference;

    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 2_000_000, paid_at: new Date().toISOString(),
      id: 555, authorization: { authorization_code: 'AUTH_X' }, customer: { customer_code: 'CUS' },
    });

    const event = {
      event: 'charge.success',
      data: { id: 555, reference },
    };
    const raw = JSON.stringify(event);
    const sig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');

    const res1 = await request(app)
      .post('/api/v1/membership/paystack-webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sig)
      .send(raw);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post('/api/v1/membership/paystack-webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', sig)
      .send(raw);
    expect(res2.body.data.duplicate).toBe(true);

    const dbUser = await User.findById(user.id);
    expect(dbUser.membership.status).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });
});
