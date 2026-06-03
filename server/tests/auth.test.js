import request from 'supertest';
import { startTestDB, stopTestDB, clearTestDB } from './setup.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { randomToken, hashToken } from '../utils/random.js';

let app;

beforeAll(async () => {
  await startTestDB();
  app = createApp();
}, 60_000);
afterAll(async () => {
  await stopTestDB();
}, 30_000);
afterEach(async () => {
  await clearTestDB();
});

const validUser = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'StrongPass1',
};

describe('POST /api/v1/auth/register', () => {
  it('creates a user and 201s', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);

    const dbUser = await User.findOne({ email: validUser.email });
    expect(dbUser).toBeTruthy();
    expect(dbUser.emailVerified).toBe(false);
    expect(dbUser.emailVerifyTokenHash).toBeTruthy();
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/verify-email/:token', () => {
  it('verifies a valid token', async () => {
    const token = randomToken();
    await User.create({
      ...validUser,
      emailVerifyTokenHash: hashToken(token),
      emailVerifyExpires: new Date(Date.now() + 60_000),
    });

    const res = await request(app).post(`/api/v1/auth/verify-email/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.verified).toBe(true);

    const dbUser = await User.findOne({ email: validUser.email });
    expect(dbUser.emailVerified).toBe(true);
    expect(dbUser.emailVerifyTokenHash).toBeUndefined();
  });

  it('rejects invalid token', async () => {
    const res = await request(app).post(`/api/v1/auth/verify-email/${'a'.repeat(64)}`);
    expect(res.status).toBe(400);
  });

  it('rejects expired token', async () => {
    const token = randomToken();
    await User.create({
      ...validUser,
      emailVerifyTokenHash: hashToken(token),
      emailVerifyExpires: new Date(Date.now() - 60_000),
    });
    const res = await request(app).post(`/api/v1/auth/verify-email/${token}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
  });

  it('returns accessToken + sets refresh cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.headers['set-cookie']?.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nope@example.com', password: validUser.password });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user with valid token', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });
});

describe('POST /api/v1/auth/refresh-token', () => {
  it('rotates refresh and returns new access', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    const cookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();

    // Using same old cookie should now fail (rotation)
    const reuse = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('401s with no cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh-token');
    expect(res.status).toBe(401);
  });
});

describe('Forgot + Reset password', () => {
  it('forgot returns success even for unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });

  it('forgot writes reset token hash for existing user', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    await request(app).post('/api/v1/auth/forgot-password').send({ email: validUser.email });
    const dbUser = await User.findOne({ email: validUser.email });
    expect(dbUser.passwordResetTokenHash).toBeTruthy();
    expect(dbUser.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
  });

  it('reset succeeds with valid token and lets user log in with new password', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    // Manually plant a reset token
    const resetToken = randomToken();
    await User.findOneAndUpdate(
      { email: validUser.email },
      {
        passwordResetTokenHash: hashToken(resetToken),
        passwordResetExpires: new Date(Date.now() + 60_000),
      },
    );

    const newPassword = 'NewStrongPass1';
    const res = await request(app)
      .post(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: newPassword });
    expect(res.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: newPassword });
    expect(loginRes.status).toBe(200);
  });

  it('reset rejects expired token', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const resetToken = randomToken();
    await User.findOneAndUpdate(
      { email: validUser.email },
      {
        passwordResetTokenHash: hashToken(resetToken),
        passwordResetExpires: new Date(Date.now() - 60_000),
      },
    );
    const res = await request(app)
      .post(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: 'NewStrongPass1' });
    expect(res.status).toBe(400);
  });
});

describe('Logout', () => {
  it('clears refresh cookie and revokes token', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    const cookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);

    // Old cookie should no longer refresh
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', cookie);
    expect(refreshRes.status).toBe(401);
  });
});
