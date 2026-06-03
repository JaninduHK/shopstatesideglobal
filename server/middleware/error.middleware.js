import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    error = ApiError.badRequest('Validation failed', details);
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    error = ApiError.conflict(`Duplicate ${field}`);
  } else if (err instanceof jwt.TokenExpiredError) {
    error = ApiError.unauthorized('Token expired');
  } else if (err instanceof jwt.JsonWebTokenError) {
    error = ApiError.unauthorized('Invalid token');
  } else if (!(err instanceof ApiError)) {
    error = ApiError.internal(err.message);
  }

  if (!error.isOperational || error.statusCode >= 500) {
    logger.error(err.stack || err);
  }

  const body = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details) body.error.details = error.details;
  if (!env.isProd && error.statusCode >= 500) body.error.stack = err.stack;

  res.status(error.statusCode || 500).json(body);
}
