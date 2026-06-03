import { jest } from '@jest/globals';
import request from 'supertest';
import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { SpecialRequest } from '../models/SpecialRequest.js';
import { ensureDefaults } from '../services/siteSettings.service.js';
import { paystack } from '../services/paystack.service.js';
import {
  MEMBERSHIP_STATUS, ROLES, SPECIAL_REQUEST_STATUS, PAYMENT_STATUS,
} from '@ssg/shared/enums';

let app;

async function makeMember({ admin = false } = {}) {
  const email = `${admin ? 'a' : 'u'}${Math.random().toString(36).slice(2, 7)}@e.com`;
  const password = 'StrongPass1';
  await request(app).post('/api/v1/auth/register').send({ firstName: 'T', lastName: 'U', email, password });
  await User.findOneAndUpdate({ email }, {
    emailVerified: true,
    ...(admin ? { role: ROLES.ADMIN } : {}),
    ...(admin ? {} : {
      membership: {
        status: MEMBERSHIP_STATUS.ACTIVE, plan: 'basic', addOns: [],
        startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 3600_000), autoRenew: true,
      },
    }),
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken, user: login.body.data.user };
}

function mockInit() {
  return jest.spyOn(paystack, 'initializeTransaction').mockImplementation(async ({ reference }) => ({
    reference, authorization_url: '', access_code: 'AC',
  }));
}

beforeAll(async () => {
  await startTestDB();
  app = createApp();
  await ensureDefaults();
}, 60_000);
afterAll(async () => { await stopTestDB(); }, 30_000);
afterEach(async () => { await clearTestDB(); await ensureDefaults(); jest.restoreAllMocks(); });

describe('POST /special-requests', () => {
  it('creates a pending-payment request with submission fee', async () => {
    const { token } = await makeMember();
    mockInit();
    const res = await request(app)
      .post('/api/v1/special-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Hermès Birkin 30 Etoupe',
        description: 'Looking for an excellent condition Birkin 30 in Etoupe Togo leather.',
        budget: 50_000_000_00,
        category: 'handbags',
        brand: 'Hermès',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(3_000_000); // ₦30,000 in kobo
    expect(res.body.data.request.requestNumber).toMatch(/^SPR-\d{4}-\d{6}$/);

    const dbReq = await SpecialRequest.findById(res.body.data.request.id);
    expect(dbReq.status).toBe(SPECIAL_REQUEST_STATUS.PENDING_PAYMENT);
    expect(dbReq.submissionFee).toBe(3_000_000);
  });

  it('rejects unverified email', async () => {
    const { token } = await makeMember();
    await User.updateOne({ email: /e\.com$/ }, { emailVerified: false });
    mockInit();
    const res = await request(app)
      .post('/api/v1/special-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'X', description: 'Long enough description here.', budget: 100 });
    expect(res.status).toBe(403);
  });
});

describe('Submission payment + admin flow', () => {
  it('verifies submission, admin accepts with cost, member pays additional', async () => {
    const { token: memberToken, user } = await makeMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/special-requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'A piece', description: 'Long enough description here.', budget: 100,
      });
    const reference = create.body.data.reference;

    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 3_000_000, paid_at: new Date().toISOString(), id: 1,
    });
    const verify = await request(app)
      .post('/api/v1/special-requests/verify-payment')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reference });
    expect(verify.body.data.request.status).toBe(SPECIAL_REQUEST_STATUS.SUBMITTED);

    // Admin assesses
    const { token: adminToken } = await makeMember({ admin: true });
    const assess = await request(app)
      .patch(`/api/v1/admin/special-requests/${create.body.data.request.id}/assess`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ additionalCostAssessed: 30_000_000, additionalCostNote: 'Sourcing fee + import' });
    expect(assess.status).toBe(200);
    expect(assess.body.data.request.status).toBe(SPECIAL_REQUEST_STATUS.AWAITING_ADDITIONAL_PAYMENT);
    expect(assess.body.data.request.additionalCostAssessed).toBe(30_000_000);

    // Member initiates additional payment
    const payInit = await request(app)
      .post(`/api/v1/special-requests/${create.body.data.request.id}/pay-additional`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(payInit.status).toBe(200);
    expect(payInit.body.data.reference).toMatch(/^sprx_/);

    // Verify additional payment
    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 30_000_000, paid_at: new Date().toISOString(), id: 2,
    });
    const verifyAdditional = await request(app)
      .post(`/api/v1/special-requests/${create.body.data.request.id}/pay-additional/verify`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reference: payInit.body.data.reference });
    expect(verifyAdditional.body.data.request.status).toBe(SPECIAL_REQUEST_STATUS.SOURCING);
  });
});

describe('Admin rejection triggers refund', () => {
  it('rejects accepted request, calls Paystack refund, marks refunded', async () => {
    const { token: memberToken } = await makeMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/special-requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'X', description: 'Long enough description here.', budget: 100 });
    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 3_000_000, paid_at: new Date().toISOString(), id: 1,
    });
    await request(app)
      .post('/api/v1/special-requests/verify-payment')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reference: create.body.data.reference });

    const refundSpy = jest.spyOn(paystack, 'refundTransaction').mockResolvedValue({ transaction: { reference: 'RF_1' } });

    const { token: adminToken } = await makeMember({ admin: true });
    const reject = await request(app)
      .patch(`/api/v1/admin/special-requests/${create.body.data.request.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: SPECIAL_REQUEST_STATUS.REJECTED, note: 'Cannot source' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.request.status).toBe(SPECIAL_REQUEST_STATUS.REJECTED);
    expect(refundSpy).toHaveBeenCalledWith(expect.objectContaining({
      reference: create.body.data.reference,
      amount: 3_000_000,
    }));
    expect(reject.body.data.request.submissionPayment.status).toBe(PAYMENT_STATUS.REFUNDED);
  });

  it('admin can advance sourcing → ready → completed', async () => {
    const { token: memberToken } = await makeMember();
    mockInit();
    const create = await request(app)
      .post('/api/v1/special-requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'X', description: 'Long enough description here.', budget: 100 });
    jest.spyOn(paystack, 'verifyTransaction').mockResolvedValue({
      status: 'success', amount: 3_000_000, paid_at: new Date().toISOString(), id: 1,
    });
    await request(app).post('/api/v1/special-requests/verify-payment').set('Authorization', `Bearer ${memberToken}`).send({ reference: create.body.data.reference });

    const { token: adminToken } = await makeMember({ admin: true });
    // assess to put it in awaiting_additional_payment, then bypass via DB to sourcing
    await SpecialRequest.findByIdAndUpdate(create.body.data.request.id, { status: SPECIAL_REQUEST_STATUS.SOURCING });

    const ready = await request(app)
      .patch(`/api/v1/admin/special-requests/${create.body.data.request.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: SPECIAL_REQUEST_STATUS.READY });
    expect(ready.status).toBe(200);

    const completed = await request(app)
      .patch(`/api/v1/admin/special-requests/${create.body.data.request.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: SPECIAL_REQUEST_STATUS.COMPLETED });
    expect(completed.status).toBe(200);
    expect(completed.body.data.request.status).toBe(SPECIAL_REQUEST_STATUS.COMPLETED);
  });
});

describe('Authorization', () => {
  it('members cannot access /admin/special-requests', async () => {
    const { token } = await makeMember();
    const res = await request(app)
      .get('/api/v1/admin/special-requests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('members only see their own requests', async () => {
    const { token: t1 } = await makeMember();
    mockInit();
    await request(app)
      .post('/api/v1/special-requests')
      .set('Authorization', `Bearer ${t1}`)
      .send({ title: 'A', description: 'Long enough description here.', budget: 100 });

    const { token: t2 } = await makeMember();
    const res = await request(app).get('/api/v1/special-requests').set('Authorization', `Bearer ${t2}`);
    expect(res.body.data.requests).toHaveLength(0);
  });
});
