/**
 * env.js — load and validate all environment variables at startup.
 * Uses zod so the server refuses to start with a bad/missing config.
 */

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(8080),

  // Mock mode — set true until Handoff 4 delivers the real Cloud API
  USE_MOCK: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Cloud API (required when USE_MOCK=false or any REAL_* flag is true)
  CLOUD_API_BASE_URL: z.string().url().optional(),
  CLOUD_API_KEY: z.string().optional(),
  CLOUD_API_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  // ── Per-feature flags ────────────────────────────────────────────────────
  // Each flag independently routes that function to the real Cloud API
  // regardless of USE_MOCK. Allows real and mock to coexist during rollout.
  //
  //   REAL_PRESIGN   — POST /cloud/uploads/presign
  //   REAL_REPORTS   — POST/GET /cloud/reports (create, get, list)
  //   REAL_CONFIRM   — PATCH /cloud/reports/{id} (citizen confirm/correct)
  //
  // All default to false so existing USE_MOCK behaviour is unchanged when
  // these vars are absent from .env.
  REAL_PRESIGN:  z.string().transform((v) => v === 'true').default('false'),
  REAL_REPORTS:  z.string().transform((v) => v === 'true').default('false'),
  REAL_CONFIRM:  z.string().transform((v) => v === 'true').default('false'),

  // AWS / Cognito
  AWS_REGION: z.string().default('ap-south-1'),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),

  // CORS — comma-separated list of allowed origins
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((s) => s.trim())),

  // Upload size limit in bytes (default 5 MB)
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5242880),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error(
    '[env] Invalid environment configuration:\n',
    result.error.format(),
  );
  process.exit(1);
}

const env = result.data;

// Extra cross-field validation: Cloud API vars must be set when any real
// endpoint flag is active (USE_MOCK=false or any REAL_* flag is true).
const needsCloudApi =
  !env.USE_MOCK || env.REAL_PRESIGN || env.REAL_REPORTS || env.REAL_CONFIRM;

if (needsCloudApi) {
  if (!env.CLOUD_API_BASE_URL || !env.CLOUD_API_KEY) {
    console.error(
      '[env] CLOUD_API_BASE_URL and CLOUD_API_KEY are required when ' +
      'USE_MOCK=false or any REAL_* flag is true',
    );
    process.exit(1);
  }
}

export default env;
