/**
 * hooks.js — canonical React hooks for all PARVAT backend interactions.
 *
 * Requirements:
 *   • Screens MUST only use these hooks.
 *   • Auto-normalizes all backend data shapes through normalize.js.
 *   • Exposes loading, empty, and error states on every hook.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest, putToS3 } from './client.js';
import {
  normalizeHotspot,
  normalizeReport,
  normalizeSubscription,
} from './normalize.js';

/**
 * useHotspots — fetch and normalize risk hotspots list.
 *
 * @param {object} [params]
 * @param {string} [params.district]
 * @param {string} [params.bbox] - "minLng,minLat,maxLng,maxLat"
 * @param {'LOW'|'MEDIUM'|'HIGH'} [params.riskBand]
 * @param {number} [params.limit=20]
 * @param {string} [params.token] - Optional Ward officer token
 */
export function useHotspots(params = {}) {
  const [hotspots, setHotspots] = useState([]);
  const [total, setTotal] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const fetchHotspots = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // If token provided, use ward endpoint, else public endpoint
      const path = params.token ? '/api/v1/ward/hotspots' : '/api/v1/hotspots';
      const data = await apiRequest(path, {
        method: 'GET',
        query: {
          district: params.district,
          bbox: params.bbox,
          riskBand: params.riskBand,
          limit: params.limit,
          wardId: params.wardId,
        },
        token: params.token,
        signal: controller.signal,
      });

      // Handle envelope vs array
      const rawList = Array.isArray(data) ? data : (data?.hotspots ?? []);
      const normalizedList = rawList.map(normalizeHotspot).filter(Boolean);

      setHotspots(normalizedList);
      setTotal(data?.total ?? normalizedList.length);
      setUpdatedAt(data?.updatedAt ?? new Date().toISOString());
      setError(null);
    } catch (err) {
      if (err.code === 'ABORTED') return;
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params.district, params.bbox, params.riskBand, params.limit, params.wardId, params.token]);

  useEffect(() => {
    fetchHotspots();

    if (params.refreshIntervalMs && params.refreshIntervalMs > 0) {
      const timer = setInterval(fetchHotspots, params.refreshIntervalMs);
      return () => {
        clearInterval(timer);
        abortRef.current?.abort();
      };
    }

    return () => abortRef.current?.abort();
  }, [fetchHotspots, params.refreshIntervalMs]);

  return {
    hotspots,
    total,
    updatedAt,
    loading,
    error,
    refetch: fetchHotspots,
  };
}

/**
 * useHotspot — fetch a single hotspot by hotspotId.
 *
 * @param {string} hotspotId
 * @param {object} [options]
 */
export function useHotspot(hotspotId, options = {}) {
  const [hotspot, setHotspot] = useState(null);
  const [loading, setLoading] = useState(Boolean(hotspotId));
  const [error, setError] = useState(null);

  const fetchHotspot = useCallback(async () => {
    if (!hotspotId) {
      setHotspot(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find from hotspots list
      const data = await apiRequest('/api/v1/hotspots', {
        method: 'GET',
        query: { limit: 100 },
        token: options.token,
      });
      const list = Array.isArray(data) ? data : (data?.hotspots ?? []);
      const found = list.find((h) => (h.hotspotId ?? h.id ?? h.segmentId) === hotspotId);

      if (found) {
        setHotspot(normalizeHotspot(found));
        setError(null);
      } else {
        setHotspot(null);
        setError(new Error(`Hotspot ${hotspotId} not found`));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [hotspotId, options.token]);

  useEffect(() => {
    fetchHotspot();
  }, [fetchHotspot]);

  return {
    hotspot,
    loading,
    error,
    refetch: fetchHotspot,
  };
}

/**
 * useReports — fetch hazard reports for the map or feed.
 *
 * @param {object} [params]
 * @param {string} [params.bbox] - "minLng,minLat,maxLng,maxLat"
 * @param {string} [params.since] - ISO datetime
 * @param {number} [params.limit=200]
 * @param {number} [params.refreshIntervalMs=0] - optional auto-refresh
 */
export function useReports(params = {}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const fetchReports = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading((prev) => (reports.length === 0 ? true : prev));
    setError(null);

    try {
      const data = await apiRequest('/api/v1/reports', {
        method: 'GET',
        query: {
          bbox: params.bbox,
          since: params.since,
          limit: params.limit ?? 200,
        },
        signal: controller.signal,
      });

      const list = Array.isArray(data) ? data : (data?.items ?? []);
      const normalizedList = list.map(normalizeReport).filter(Boolean);

      setReports(normalizedList);
      setError(null);
    } catch (err) {
      if (err.code === 'ABORTED') return;
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params.bbox, params.since, params.limit, reports.length]);

  useEffect(() => {
    fetchReports();

    if (params.refreshIntervalMs && params.refreshIntervalMs > 0) {
      const timer = setInterval(fetchReports, params.refreshIntervalMs);
      return () => {
        clearInterval(timer);
        abortRef.current?.abort();
      };
    }

    return () => abortRef.current?.abort();
  }, [fetchReports, params.refreshIntervalMs]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  };
}

/**
 * useCreateReport — multi-step hazard report creation hook.
 *
 * Coordinates:
 *   1. POST /api/v1/uploads/presign
 *   2. Direct S3 PUT
 *   3. POST /api/v1/reports
 */
export function useCreateReport() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'presigning' | 'uploading' | 'submitting' | 'done' | 'error'
  const [progress, setProgress] = useState(0);   // 0 to 100
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const abortRef = useRef(null);

  const submitReport = useCallback(async ({ file, lat, lng, hazardType = 'flood', note }) => {
    if (!file) {
      throw new Error('A photo file is required.');
    }
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      throw new Error('Valid latitude and longitude coordinates are required.');
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('presigning');
    setProgress(15);
    setError(null);

    try {
      // Step 1: Request presigned URL
      const presignData = await apiRequest('/api/v1/uploads/presign', {
        method: 'POST',
        body: {
          contentType: file.type || 'image/jpeg',
          sizeBytes: file.size,
        },
        signal: controller.signal,
      });

      const { photoKey, uploadUrl } = presignData;
      if (!uploadUrl || !photoKey) {
        throw new Error('Invalid presign response from server.');
      }

      // Step 2: Direct browser PUT to S3
      setStatus('uploading');
      setProgress(50);
      await putToS3(uploadUrl, file, controller.signal);

      // Step 3: Create report record
      setStatus('submitting');
      setProgress(85);
      const reportResponse = await apiRequest('/api/v1/reports', {
        method: 'POST',
        body: {
          photoKey,
          lat: Number(lat),
          lng: Number(lng),
          hazardType,
          note: note ? String(note).slice(0, 500) : undefined,
          clientTimestamp: new Date().toISOString(),
        },
        signal: controller.signal,
      });

      setStatus('done');
      setProgress(100);
      setResult(reportResponse);
      return reportResponse;
    } catch (err) {
      if (err.code === 'ABORTED') return null;
      setStatus('error');
      setError(err);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    submitReport,
    status,
    progress,
    error,
    result,
    reset,
  };
}

/**
 * useAlerts — manage citizen emergency alert subscriptions.
 */
export function useAlerts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subscribe = useCallback(async ({ channel, contact, lat, lng, radiusM = 1000 }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/v1/alerts/subscriptions', {
        method: 'POST',
        body: {
          channel,
          contact,
          lat: Number(lat),
          lng: Number(lng),
          radiusM: Number(radiusM),
        },
      });
      return normalizeSubscription(data);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async (subscriptionId) => {
    if (!subscriptionId) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/v1/alerts/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subscribe,
    unsubscribe,
    loading,
    error,
  };
}
