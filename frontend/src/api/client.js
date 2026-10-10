/**
 * client.js — network client for the Express backend.
 *
 * Rules:
 *   • Only talks to the Express backend via VITE_API_BASE_URL.
 *   • Configurable timeout with AbortController signal handling.
 *   • Parses error envelopes into typed ApiError objects.
 *   • Includes S3 direct PUT helper for presigned binary uploads.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Perform an HTTP request to the Express backend.
 *
 * @param {string} path - endpoint path (e.g. '/api/v1/reports')
 * @param {object} options
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {object} [options.query]
 * @param {object} [options.body]
 * @param {string} [options.token] - Bearer JWT for ward routes
 * @param {number} [options.timeout=DEFAULT_TIMEOUT_MS]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<any>}
 */
export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    query,
    body,
    token,
    timeout = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  let queryString = '';
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    }
    const qs = params.toString();
    if (qs) queryString = `?${qs}`;
  }

  const url = `${BASE_URL}${path}${queryString}`;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Combine external signal and internal timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('REQUEST_TIMEOUT'));
  }, timeout);

  function handleAbort() {
    timeoutController.abort();
  }
  if (signal) {
    signal.addEventListener('abort', handleAbort);
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: timeoutController.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', handleAbort);

    if (err?.message === 'REQUEST_TIMEOUT' || err?.name === 'AbortError') {
      if (signal?.aborted) {
        throw new ApiError(0, 'ABORTED', 'Request was cancelled.');
      }
      throw new ApiError(504, 'UPSTREAM_TIMEOUT', 'Server request timed out. Please try again.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not connect to the server. Check your network.');
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', handleAbort);
  }

  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      'PARSE_ERROR',
      `Unexpected response from server (${response.status}).`,
    );
  }

  if (!response.ok) {
    const errObj = data?.error ?? {};
    const code = errObj.code ?? 'REQUEST_FAILED';
    const message = errObj.message ?? `Request failed with status ${response.status}.`;
    const details = errObj.details ?? [];
    throw new ApiError(response.status, code, message, details);
  }

  return data;
}

const DEFAULT_UPLOAD_TIMEOUT_MS = 25000;

/**
 * PUT raw photo binary directly to S3 via presigned URL.
 * Never routes image bytes through the Express backend.
 *
 * @param {string} uploadUrl - Presigned S3 PUT URL
 * @param {Blob|File} file - Image file
 * @param {AbortSignal} [signal]
 * @param {number} [timeout=DEFAULT_UPLOAD_TIMEOUT_MS]
 */
export async function putToS3(uploadUrl, file, signal, timeout = DEFAULT_UPLOAD_TIMEOUT_MS) {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error('UPLOAD_TIMEOUT'));
  }, timeout);

  function handleAbort() {
    timeoutController.abort();
  }
  if (signal) {
    signal.addEventListener('abort', handleAbort);
  }

  let response;
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
      signal: timeoutController.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', handleAbort);

    if (err?.message === 'UPLOAD_TIMEOUT' || err?.name === 'AbortError') {
      if (signal?.aborted) {
        throw new ApiError(0, 'ABORTED', 'Upload was cancelled.');
      }
      throw new ApiError(504, 'UPSTREAM_TIMEOUT', 'Photo upload timed out. Please check your connection and retry.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Failed to upload photo to storage. Check your connection.');
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', handleAbort);
  }

  if (!response.ok) {
    throw new ApiError(response.status, 'S3_ERROR', `Photo upload failed (${response.status}).`);
  }
}
