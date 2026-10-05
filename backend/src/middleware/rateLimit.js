/**
 * rateLimit.js — express-rate-limit configurations.
 * Rates come from env so they can be tuned without code changes.
 */

import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import { Errors } from './errorHandler.js';

// Standard limiter used on public write endpoints (uploads, reports, subscriptions)
export const standardLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next) => {
    const err = Errors.rateLimited();
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: [] },
    });
  },
});

// Tighter limiter for the presign endpoint to guard S3 URL abuse
export const presignLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.ceil(env.RATE_LIMIT_MAX / 2),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next) => {
    const err = Errors.rateLimited('Presign rate limit exceeded');
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: [] },
    });
  },
});
