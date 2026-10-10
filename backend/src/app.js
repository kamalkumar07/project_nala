/**
 * app.js — Express application factory.
 * Middleware stack, route mounting. Does NOT call listen() — that's server.js.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import env from './config/env.js';
import logger from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import healthRouter   from './routes/health.js';
import uploadsRouter  from './routes/uploads.js';
import reportsRouter  from './routes/reports.js';
import hotspotsRouter from './routes/hotspots.js';
import riskRouter     from './routes/risk.js';
import alertsRouter   from './routes/alerts.js';
import authRouter     from './routes/auth.js';
import wardsRouter    from './routes/wards.js';
import wardRouter     from './routes/ward.js';
import riskAssessmentRouter from './routes/riskAssessment.js';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────

app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ── Request logging (pino-http) ───────────────────────────────────────────────

app.use(pinoHttp({ logger }));

// ── Body parsing ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────

// /health has no /api/v1 prefix
app.use(healthRouter);

// All other routes are under /api/v1
app.use('/api/v1', uploadsRouter);
app.use('/api/v1', reportsRouter);
app.use('/api/v1', hotspotsRouter);
app.use('/api/v1', riskRouter);
app.use('/api/v1', alertsRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', wardsRouter);
app.use('/api/v1', riskAssessmentRouter);
app.use('/api/v1', wardRouter);

// ── 404 for unmatched routes ──────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found', details: [] },
  });
});

// ── Central error handler (must be last) ─────────────────────────────────────

app.use(errorHandler);

export default app;
