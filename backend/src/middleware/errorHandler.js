/**
 * errorHandler.js — central error handler middleware.
 * All thrown/next(err) errors end up here and are formatted as the
 * standard error envelope defined in section 6.4 of the master doc.
 *
 * Shape: { "error": { "code": "...", "message": "...", "details": [] } }
 */

import { ZodError } from 'zod';
import logger from '../logger.js';

// Named application error class so routes can throw typed errors
export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Convenience factories matching section 6.4 error codes
export const Errors = {
  validation: (message, details = []) =>
    new AppError(400, 'VALIDATION_ERROR', message, details),
  unauthorized: (message = 'Authentication required') =>
    new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Insufficient permissions') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Resource not found') =>
    new AppError(404, 'NOT_FOUND', message),
  rateLimited: (message = 'Too many requests') =>
    new AppError(429, 'RATE_LIMITED', message),
  upstreamError: (message = 'Upstream service error') =>
    new AppError(502, 'UPSTREAM_ERROR', message),
  upstreamTimeout: (message = 'Upstream service timed out') =>
    new AppError(504, 'UPSTREAM_TIMEOUT', message),
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Zod validation errors (thrown from validate middleware)
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Unknown / unexpected errors
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: [],
    },
  });
}
