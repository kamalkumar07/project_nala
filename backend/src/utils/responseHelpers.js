/**
 * responseHelpers.js — standard response shape builders.
 *
 * Centralises the JSON envelope formats so every controller
 * sends consistent responses without duplicating structure.
 */

/**
 * Build the standard success envelope for list responses.
 * @param {Array}  items
 * @param {object} [meta]   — optional extra fields (total, updatedAt, cursor …)
 * @returns {object}
 */
export function listResponse(items, meta = {}) {
  return {
    ...meta,
    total: items.length,
    items,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build the standard error response body.
 * Used by errorHandler.js and anywhere a controller needs
 * to construct an error shape manually.
 *
 * @param {string} code     — e.g. 'VALIDATION_ERROR'
 * @param {string} message
 * @param {Array}  [details=[]]
 * @returns {object}
 */
export function errorResponse(code, message, details = []) {
  return { error: { code, message, details } };
}

/**
 * Send a 201 Created response with a Location header.
 * @param {import('express').Response} res
 * @param {object} body
 * @param {string} [locationPath]  — e.g. "/api/v1/reports/rpt_123"
 */
export function created(res, body, locationPath) {
  if (locationPath) res.setHeader('Location', locationPath);
  res.status(201).json(body);
}

/**
 * Send a 204 No Content response.
 * @param {import('express').Response} res
 */
export function noContent(res) {
  res.status(204).end();
}

/**
 * Paginate an array with cursor-based logic.
 * Returns { items, nextCursor } where nextCursor is null when exhausted.
 *
 * @param {Array}  all        — full sorted array
 * @param {number} limit
 * @param {string} [cursor]   — last seen ID from previous page
 * @param {string} [idKey='id']
 */
export function paginate(all, limit, cursor, idKey = 'id') {
  let start = 0;
  if (cursor) {
    const idx = all.findIndex((item) => item[idKey] === cursor);
    start = idx === -1 ? 0 : idx + 1;
  }
  const page = all.slice(start, start + limit);
  const nextCursor = page.length === limit ? page[page.length - 1][idKey] : null;
  return { items: page, nextCursor };
}
