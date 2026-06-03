import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/jwt.service.js';
import { User } from '../models/User.js';
import { ROLES } from '@ssg/shared/enums';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Missing access token'));
    }
    const token = header.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return next(ApiError.unauthorized('User not found or inactive'));
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== ROLES.ADMIN) {
    return next(ApiError.forbidden('Admin access required'));
  }
  next();
}

export function requireEmailVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return next(ApiError.forbidden('Email verification required'));
  }
  next();
}

// Stub for Phase 2 — wired here so future routes can use it
export function requireActiveMembership(req, res, next) {
  if (!req.user?.hasActiveMembership()) {
    return next(ApiError.membershipRequired());
  }
  next();
}

export function requireAddon(addon) {
  return (req, res, next) => {
    if (!req.user?.hasAddon(addon)) {
      return next(ApiError.addonRequired(addon));
    }
    next();
  };
}
