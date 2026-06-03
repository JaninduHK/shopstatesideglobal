import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { hashToken } from '../utils/random.js';
import { RevokedToken } from '../models/RevokedToken.js';

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpires },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: 'refresh' },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpires },
  );
}

export function issueTokens(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

export async function isRefreshTokenRevoked(token) {
  const revoked = await RevokedToken.findOne({ tokenHash: hashToken(token) });
  return !!revoked;
}

export async function revokeRefreshToken(token, userId) {
  let exp;
  try {
    const decoded = jwt.decode(token);
    exp = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600_000);
  } catch {
    exp = new Date(Date.now() + 7 * 24 * 3600_000);
  }
  await RevokedToken.create({
    tokenHash: hashToken(token),
    user: userId,
    expiresAt: exp,
  });
}

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure || env.isProd,
  sameSite: 'lax',
  domain: env.cookie.domain,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 3600_000,
});
