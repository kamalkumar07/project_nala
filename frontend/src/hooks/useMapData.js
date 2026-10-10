/**
 * useMapData — fetches report pins and risk segments for the current map
 * bounding box, then automatically refreshes every 10 seconds.
 *
 * @param {string|null} bbox  "minLng,minLat,maxLng,maxLat" or null to skip
 *
 * Returns:
 *   reports   — array of report pin objects (section 7 shape)
 *   risk      — array of risk segment objects
 *   loading   — true on the very first fetch (no data yet)
 *   error     — last ApiError | Error | null
 *   refresh() — manual trigger (resets the 10 s timer)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { listReports, getRisk } from '../services/api.js';

const REFRESH_INTERVAL_MS = 10_000;

export function useMapData(bbox) {
  const [reports, setReports] = useState([]);
  const [risk,    setRisk]    = useState([]);
  const [loading, setLoading] = useState(true);   // true only until first success
  const [error,   setError]   = useState(null);

  const abortRef  = useRef(null);
  const timerRef  = useRef(null);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    if (!bbox) return;

    // Cancel any in-flight pair of requests
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fire both in parallel
      const [reportData, riskData] = await Promise.all([
        listReports({ bbox }, controller.signal),
        getRisk({ bbox }, controller.signal),
      ]);

      if (!mountedRef.current) return;
      setReports(reportData ?? []);
      setRisk(riskData ?? []);
      setError(null);
    } catch (err) {
      if (!mountedRef.current || err.name === 'AbortError') return;
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [bbox]);

  // Schedule the 10-second repeating refresh
  const scheduleNext = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetchAll();
      if (mountedRef.current) scheduleNext();
    }, REFRESH_INTERVAL_MS);
  }, [fetchAll]);

  // Exposed manual refresh: fetch immediately then reschedule timer
  const refresh = useCallback(async () => {
    clearTimeout(timerRef.current);
    await fetchAll();
    if (mountedRef.current) scheduleNext();
  }, [fetchAll, scheduleNext]);

  // Run when bbox changes
  useEffect(() => {
    mountedRef.current = true;
    if (!bbox) {
      setLoading(false);
      return;
    }
    setLoading((prev) => (prev ? true : false)); // keep false if already loaded once
    fetchAll().then(() => { if (mountedRef.current) scheduleNext(); });

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [bbox, fetchAll, scheduleNext]);

  return { reports, risk, loading, error, refresh };
}
