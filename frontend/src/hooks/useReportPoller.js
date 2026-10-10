/**
 * useReportPoller — polls GET /api/v1/reports/:id every 2 s until the
 * report reaches a terminal status ("assessed" | "failed") or the
 * component unmounts.
 *
 * Returns:
 *   { report, error, polling }
 *
 *   report  — the latest report object (null until first successful fetch)
 *   error   — ApiError | Error | null
 *   polling — true while actively waiting for a non-terminal status
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getReport } from '../services/api.js';

const TERMINAL = new Set(['assessed', 'failed']);
const POLL_INTERVAL_MS = 2000;

export function useReportPoller(reportId) {
  const [report, setReport]   = useState(null);
  const [error,  setError]    = useState(null);
  const [polling, setPolling] = useState(false);

  // Keep a ref to the timeout so we can clear it on unmount
  const timerRef    = useRef(null);
  const abortRef    = useRef(null);
  const mountedRef  = useRef(true);

  const poll = useCallback(async () => {
    if (!reportId || !mountedRef.current) return;

    // Cancel any in-flight request from a previous cycle
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPolling(true);
    try {
      const data = await getReport(reportId, controller.signal);
      if (!mountedRef.current) return;

      setReport(data);
      setError(null);

      if (!TERMINAL.has(data.status)) {
        // Schedule next poll
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        setPolling(false);
      }
    } catch (err) {
      if (!mountedRef.current || err.name === 'AbortError') return;
      setError(err);
      setPolling(false);
    }
  }, [reportId]);

  useEffect(() => {
    mountedRef.current = true;
    if (reportId) poll();

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [reportId, poll]);

  return { report, error, polling };
}
