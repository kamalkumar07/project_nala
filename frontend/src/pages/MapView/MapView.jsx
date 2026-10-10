/**
 * MapView.jsx — full-screen interactive flood map.
 *
 * Features:
 *  • MapLibre GL JS with Amazon Location Service tiles (falls back to
 *    OpenFreeMap Positron when VITE_LOCATION_* vars are unset).
 *  • Report pins coloured by passable (yes/caution/no/unknown).
 *  • Detail bottom-sheet on pin tap.
 *  • Toggleable risk layer (circle heat markers per segment).
 *  • Data refreshes every 10 s via useMapData.
 *  • FAB to start a new report.
 *  • Offline banner; error + loading states.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMapData }          from '../../hooks/useMapData.js';
import { resolveMapStyle, DEFAULT_CENTER, DEFAULT_ZOOM } from './mapStyle.js';
import {
  reportsToGeoJSON, riskToGeoJSON,
  PASSABLE_COLOR_EXPR, RISK_FILL_EXPR, RISK_STROKE_EXPR,
} from './pinHelpers.js';
import { GlobeSplash }         from './GlobeSplash.jsx';
import { PinLegend }           from './PinLegend.jsx';
import { RiskLayerToggle }     from './RiskLayerToggle.jsx';
import { ReportDetailSheet }   from './ReportDetailSheet.jsx';
import { Spinner }             from '../../components/ui/Spinner.jsx';
import { ErrorBanner }         from '../../components/ui/ErrorBanner.jsx';
import { Waves, RotateCcw, Camera } from 'lucide-react';
import styles from './MapView.module.css';

// ── Layer / source IDs ────────────────────────────────────────────────────────

const SRC_REPORTS     = 'nw-reports';
const SRC_RISK        = 'nw-risk';
const LAYER_PINS      = 'nw-pins';
const LAYER_PINS_HALO = 'nw-pins-halo';
const LAYER_RISK_FILL = 'nw-risk-fill';

// ── bbox helpers ──────────────────────────────────────────────────────────────

function mapToBbox(map) {
  const b = map.getBounds();
  return [
    b.getWest().toFixed(5),
    b.getSouth().toFixed(5),
    b.getEast().toFixed(5),
    b.getNorth().toFixed(5),
  ].join(',');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapView() {
  const navigate    = useNavigate();
  const containerRef = useRef(null);
  const mapRef       = useRef(null);   // MapLibre Map instance

  const [bbox,        setBbox]        = useState(null);
  const [riskVisible, setRiskVisible] = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [mapReady,    setMapReady]    = useState(false);
  const [mapError,    setMapError]    = useState(null);
  const [showSplash,  setShowSplash]  = useState(true);  // Three.js globe intro

  const { reports, risk, loading, error, refresh } = useMapData(bbox);

  // ── Initialise map ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Required for MapLibre v6 + Vite: wire up the web worker explicitly
    setWorkerUrl(workerUrl);

    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style:     resolveMapStyle(),
        center:    DEFAULT_CENTER,
        zoom:      DEFAULT_ZOOM,
        attributionControl: true,
      });
    } catch (err) {
      setMapError('Could not initialise the map: ' + err.message);
      return;
    }

    mapRef.current = map;

    // Add navigation controls (zoom +/−, compass) — top-right
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add geolocate control — top-right below nav
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }),
      'top-right',
    );

    map.on('load', () => {
      // ── Report pins source + layers ───────────────────────────────────────

      map.addSource(SRC_REPORTS, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Outer halo for contrast
      map.addLayer({
        id:   LAYER_PINS_HALO,
        type: 'circle',
        source: SRC_REPORTS,
        paint: {
          'circle-radius':       14,
          'circle-color':        '#ffffff',
          'circle-opacity':      0.65,
          'circle-stroke-width': 0,
        },
      });

      // Coloured pin dot
      map.addLayer({
        id:   LAYER_PINS,
        type: 'circle',
        source: SRC_REPORTS,
        paint: {
          'circle-radius':        10,
          'circle-color':         PASSABLE_COLOR_EXPR,
          'circle-stroke-width':  2,
          'circle-stroke-color':  '#ffffff',
          // Subtle pulse on "analyzing" reports
          'circle-opacity': [
            'case',
            ['==', ['get', 'status'], 'analyzing'], 0.6,
            1,
          ],
        },
      });

      // ── Risk layer source + layer ─────────────────────────────────────────

      map.addSource(SRC_RISK, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id:   LAYER_RISK_FILL,
        type: 'circle',
        source: SRC_RISK,
        layout: { visibility: 'none' },
        paint: {
          'circle-radius':       40,
          'circle-color':        RISK_FILL_EXPR,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': RISK_STROKE_EXPR,
          'circle-blur':         0.6,
          'circle-pitch-scale':  'map',
        },
      });

      setMapReady(true);

      // Set initial bbox so useMapData fires the first fetch
      setBbox(mapToBbox(map));
    });

    // Re-fetch on move end (debounced by the hook's AbortController)
    map.on('moveend', () => {
      if (mapRef.current) setBbox(mapToBbox(mapRef.current));
    });

    // Click on a report pin
    map.on('click', LAYER_PINS, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      try {
        const report = JSON.parse(feat.properties._raw);
        setSelected(report);
      } catch {
        // ignore
      }
    });

    // Click on the risk layer
    map.on('click', LAYER_RISK_FILL, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      // Show a simple popup (no full sheet needed for risk)
      new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>Risk: ${p.band}</strong><br>` +
          `Score: ${(p.score * 100).toFixed(0)}%<br>` +
          `Ward: ${p.wardId}`,
        )
        .addTo(map);
    });

    // Pointer cursor on hover
    map.on('mouseenter', LAYER_PINS,      () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', LAYER_PINS,      () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', LAYER_RISK_FILL, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', LAYER_RISK_FILL, () => { map.getCanvas().style.cursor = ''; });

    map.on('error', (e) => {
      // Only surface errors that come from our own sources/layers.
      // Tile-style filter warnings from the OpenFreeMap style (e.g. highway
      // shield layers expecting a numeric ref) are expected and harmless.
      const msg = e.error?.message ?? '';
      const isOurLayer = msg.includes('nw-');
      if (isOurLayer) {
        console.warn('[MapView] layer error:', msg);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // run once

  // ── Update report pins source when data changes ────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource(SRC_REPORTS);
    if (src) src.setData(reportsToGeoJSON(reports));
  }, [reports, mapReady]);

  // ── Update risk source when data changes ─────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource(SRC_RISK);
    if (src) src.setData(riskToGeoJSON(risk));
  }, [risk, mapReady]);

  // ── Toggle risk layer visibility ──────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer(LAYER_RISK_FILL)) {
      map.setLayoutProperty(
        LAYER_RISK_FILL,
        'visibility',
        riskVisible ? 'visible' : 'none',
      );
    }
  }, [riskVisible, mapReady]);

  // ── Resize map when container dimensions change (e.g. sheet opens) ────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Give the CSS transition a moment to finish
    const t = setTimeout(() => map.resize(), 320);
    return () => clearTimeout(t);
  }, [selected]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleRisk = useCallback(() => setRiskVisible((v) => !v), []);
  const handleCloseSheet = useCallback(() => setSelected(null), []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.mapScreen}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <span className={styles.topBarLogo} aria-hidden="true">
          <Waves size={20} color="var(--color-primary)" />
        </span>
        <div className={styles.topBarBrand}>
          <h1 className={styles.topBarTitle}>PARVAT</h1>
          <span className={styles.topBarTagline}>
            Predictive Analytics for Risk, Vulnerability and Terrain
          </span>
        </div>
        <div className={styles.topBarActions}>
          {/* Manual refresh */}
          <button
            className={styles.topBarBtn}
            onClick={refresh}
            aria-label="Refresh map data"
            disabled={loading}
          >
            {loading
              ? <Spinner size={16} color="var(--color-primary)" />
              : <RotateCcw size={16} aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* ── Error banner (non-fatal) ──────────────────────────────────────── */}
      {(error || mapError) && (
        <div className={styles.errorWrap}>
          <ErrorBanner
            message={(mapError ?? error?.message) ?? 'Could not load map data'}
            onRetry={mapError ? undefined : refresh}
            onDismiss={mapError ? () => setMapError(null) : undefined}
          />
        </div>
      )}

      {/* ── Map container ─────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className={styles.mapContainer}
        aria-label="Flood report map"
        role="application"
      />

      {/* ── Three.js globe splash — shown immediately on first visit ──────── */}
      {showSplash && (
        <GlobeSplash onDismiss={() => setShowSplash(false)} />
      )}

      {/* ── Overlay controls (hidden while splash is active) ──────────────── */}
      {mapReady && !showSplash && (
        <>
          {/* Risk layer toggle — top-left */}
          <div className={styles.topLeftControls}>
            <RiskLayerToggle
              active={riskVisible}
              onToggle={handleToggleRisk}
              count={risk.length}
            />
          </div>

          {/* Pin count chip — bottom-left above legend */}
          {reports.length > 0 && (
            <div className={styles.pinCount} aria-live="polite">
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Legend — bottom-left */}
          <PinLegend />
        </>
      )}

      {/* ── Report FAB — bottom-right (hidden during globe splash) ─────────── */}
      {!showSplash && (
        <button
          className={styles.fab}
          onClick={() => navigate('/report')}
          aria-label="Report flooding"
        >
          <Camera size={18} aria-hidden="true" />
          <span className={styles.fabLabel}>Report</span>
        </button>
      )}

      {/* ── Detail sheet ─────────────────────────────────────────────────── */}
      {selected && (
        <ReportDetailSheet
          report={selected}
          onClose={handleCloseSheet}
        />
      )}
    </div>
  );
}
