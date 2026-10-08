/**
 * reportsController.js — business logic for all /reports routes.
 *
 * Each exported function is called by the corresponding route handler.
 * Routes own: request parsing, zod validation, calling the controller.
 * Controllers own: service calls, response shaping, error forwarding.
 */

import {
  presignUpload,
  createReport,
  getReport,
  listReports,
  confirmReport,
} from '../services/index.js';
import { created } from '../utils/responseHelpers.js';

/**
 * POST /api/v1/uploads/presign
 * Returns a presigned S3 PUT URL.
 */
export async function handlePresign(req, res, next) {
  try {
    const result = await presignUpload(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/reports
 * Submit a new hazard report. Returns reportId + analyzing status immediately.
 */
export async function handleCreateReport(req, res, next) {
  try {
    const result = await createReport(req.body);
    created(res, result, `/api/v1/reports/${result.reportId}`);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/reports/:id
 * Poll a single report for status + AI assessment.
 */
export async function handleGetReport(req, res, next) {
  try {
    const report = await getReport(req.params.id);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/reports
 * List report map pins, optionally filtered by bbox/since/limit.
 */
export async function handleListReports(req, res, next) {
  try {
    const reports = await listReports(req.query);
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/reports/:id/confirm
 * Citizen confirms or corrects the AI depth assessment.
 */
export async function handleConfirmReport(req, res, next) {
  try {
    const report = await confirmReport(req.params.id, req.body);
    res.json(report);
  } catch (err) {
    next(err);
  }
}
