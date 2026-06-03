import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { randomToken, hashToken } from '../utils/random.js';
import {
  issueTokens,
  verifyRefreshToken,
  isRefreshTokenRevoked,
  revokeRefreshToken,
  refreshCookieOptions,
} from '../services/jwt.service.js';
import { sendEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { TOKEN_TTL } from '@ssg/shared/constants';

const REFRESH_COOKIE = 'refreshToken';

async function setRefreshCookie(res, user) {
  const { accessToken, refreshToken } = issueTokens(user);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

export const register = catchAsync(async (req, res) => {
  const { firstName, lastName, email, password, phone, subscribeEmail } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  const verifyToken = randomToken();
  const verifyExpires = new Date(Date.now() + TOKEN_TTL.EMAIL_VERIFY_HOURS * 3600_000);

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    emailVerifyTokenHash: hashToken(verifyToken),
    emailVerifyExpires: verifyExpires,
    emailList: subscribeEmail
      ? { subscribed: false, confirmToken: randomToken() }
      : { subscribed: false },
  });

  await sendEmail({
    to: user.email,
    subject: 'Verify your email — State Side Global',
    template: 'verify-email',
    vars: {
      firstName: user.firstName,
      verifyUrl: `${env.clientUrl}/auth/verify-email/${verifyToken}`,
    },
  });

  return created(res, {
    user: { id: user._id, email: user.email, firstName: user.firstName },
    message: 'Verification email sent',
  });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    emailVerifyTokenHash: hashToken(token),
    emailVerifyExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest('Invalid or expired verification token');

  user.emailVerified = true;
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Welcome to State Side Global',
    template: 'welcome',
    vars: {
      firstName: user.firstName,
      membershipUrl: `${env.clientUrl}/membership/plans`,
    },
  });

  return ok(res, { verified: true });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  const valid = await user.comparePassword(password);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  const accessToken = await setRefreshCookie(res, user);
  return ok(res, { user: user.toJSON(), accessToken });
});

export const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token');

  if (await isRefreshTokenRevoked(token)) {
    throw ApiError.unauthorized('Refresh token revoked');
  }

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found');

  // Rotate: revoke old, issue new
  await revokeRefreshToken(token, user._id);
  const accessToken = await setRefreshCookie(res, user);

  return ok(res, { accessToken });
});

export const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await revokeRefreshToken(token, payload.sub);
    } catch {
      // ignore invalid tokens on logout
    }
  }
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: 0 });
  return ok(res, { success: true });
});

export const me = catchAsync(async (req, res) => {
  return ok(res, { user: req.user.toJSON() });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success — no enumeration
  if (user && user.isActive) {
    const resetToken = randomToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + TOKEN_TTL.PASSWORD_RESET_HOURS * 3600_000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Reset your password — State Side Global',
      template: 'password-reset',
      vars: {
        firstName: user.firstName,
        resetUrl: `${env.clientUrl}/auth/reset-password/${resetToken}`,
      },
    });
  }

  return ok(res, { success: true });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+password');
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return ok(res, { success: true });
});
