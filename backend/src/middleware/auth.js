/**
 * auth.js — Cognito JWT verification middleware.
 *
 * Exports:
 *   requireAuth        — verifies Bearer token; attaches req.user
 *   requireWardOfficer — same + asserts cognito:groups includes 'ward_officer'
 *
 * ── Mock mode (USE_MOCK=true) ────────────────────────────────────────────────
 * The CognitoJwtVerifier is never instantiated. Any Bearer token value
 * (including the frontend's "mock-ward-officer-token") — or even no token —
 * is accepted. A synthetic identity is injected:
 *
 *   { sub: 'mock-user-001', username: 'demo_officer',
 *     email: 'officer@demo.nalawatch', groups: ['ward_officer'] }
 *
 * This lets the frontend ward dashboard work end-to-end before Cognito
 * is configured. The group check in requireWardOfficer still runs and
 * passes because the mock identity always carries 'ward_officer'.
 *
 * ── Production mode (USE_MOCK=false) ────────────────────────────────────────
 * Requires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in env.
 * CognitoJwtVerifier is created once at module load (caches the JWKS).
 * Verifies the access token signature, expiry, and audience.
 * Extracts { sub, username, email, groups } from the verified payload.
 * requireWardOfficer checks payload['cognito:groups'] for 'ward_officer'.
 * Returns 401 for missing/invalid/expired tokens, 403 for wrong group.
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import env from '../config/env.js';
import { Errors } from './errorHandler.js';
import logger from '../logger.js';

// Verifier is instantiated once at startup (it caches the JWKS)
let verifier = null;

if (!env.USE_MOCK && env.COGNITO_USER_POOL_ID && env.COGNITO_CLIENT_ID) {
  verifier = CognitoJwtVerifier.create({
    userPoolId: env.COGNITO_USER_POOL_ID,
    tokenUse: 'access',
    clientId: env.COGNITO_CLIENT_ID,
  });
}

async function verifyToken(req) {
  // Mock mode: return a synthetic identity
  if (env.USE_MOCK) {
    return {
      sub: 'mock-user-001',
      username: 'demo_officer',
      email: 'officer@demo.nalawatch',
      groups: ['ward_officer'],
    };
  }

  if (!verifier) {
    logger.warn('Auth verifier not initialised — COGNITO vars may be missing');
    throw Errors.unauthorized('Auth service not configured');
  }

  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    throw Errors.unauthorized('Missing Bearer token');
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifier.verify(token);
    return {
      sub: payload.sub,
      username: payload.username ?? payload['cognito:username'],
      email: payload.email,
      groups: payload['cognito:groups'] ?? [],
    };
  } catch (err) {
    logger.warn({ err }, 'JWT verification failed');
    throw Errors.unauthorized('Invalid or expired token');
  }
}

export async function requireAuth(req, res, next) {
  try {
    req.user = await verifyToken(req);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireWardOfficer(req, res, next) {
  try {
    req.user = await verifyToken(req);
    if (!req.user.groups.includes('ward_officer')) {
      throw Errors.forbidden('Ward officer role required');
    }
    next();
  } catch (err) {
    next(err);
  }
}
