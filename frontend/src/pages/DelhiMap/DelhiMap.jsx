/**
 * DelhiMap.jsx — production Delhi flood-monitoring dashboard.
 *
 * Layout:
 *   Left sidebar  — brand header, live stats, ward detail panel
 *   Right area    — full-height MapLibre map
 *
 * Map layers (all toggle-able):
 *   nw-ward-fill      Ward polygons filled by risk band (transparent when no data)
 *   nw-ward-line      Ward boundaries (#30363d, 0.8px)
 *   nw-ward-hover     Highlight fill on hover
 *   nw-ward-selected  Highlight on click
 *   nw-ward-labels    Ward number labels (zoom ≥ 11)
 *   nw-reports-halo   White halo behind report circles
 *   nw-reports-dot    Coloured report circles (SVG custom markers for new/analyzing)
 *   nw-reports-pulse  Animated outer ring for analyzing reports
 *   nw-selected-pt    Cross marker for user-selected coordinate
 *
 * No browser geolocation is requested. No invented data is shown.
 * VITE_DEMO_MODE=true injects clearly-labelled simulated reports.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

import wardsGeoJSON from '../../data/wards_delhi.geojson';
import { GlobeSplash } from '../MapView/GlobeSplash.jsx';
import { useMapData }   from '../../hooks/useMapData.js';
import { boundsToString, wardFromLatLng, markerColor, titleCase,
         RISK_BAND_META, fmtLat, fmtLng } from '../../utils/mapUtils.js';
import { DEMO_REPORTS, DEMO_RISK } from './demoData.js';
import { StatsPanel }       from './StatsPanel.jsx';
import { WardDetailPanel }  from './WardDetailPanel.jsx';
import { LayerControl }     from './LayerControl.jsx';
import { Spinner }          from '../../components/ui/Spinner.jsx';
import { ErrorBanner }      from '../../components/ui/ErrorBanner.jsx';
import { Waves, AlertTriangle, Map, X, Menu, Camera } from 'lucide-react';
import styles from './DelhiMap.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const DELHI_CENTER = [77.209, 28.6139];
const DELHI_ZOOM   = 11;
const IS_DEMO      = import.meta.env.VITE_DEMO_MODE === 'true';

// Map source / layer IDs
const SRC_WARDS    = 'nw-src-wards';
const SRC_REPORTS  = 'nw-src-reports';
const SRC_SELECTED = 'nw-src-selected';
const SRC_RISK_PT  = 'nw-src-risk-pt';

const LY_WARD_FILL  = 'nw-ward-fill';
const LY_WARD_LINE  = 'nw-ward-line';
const LY_WARD_HOVER = 'nw-ward-hover';
const LY_WARD_SEL   = 'nw-ward-selected';
const LY_WARD_LABEL = 'nw-ward-labels';
const LY_RPT_HALO   = 'nw-reports-halo';
const LY_RPT_DOT    = 'nw-reports-dot';
const LY_RPT_PULSE  = 'nw-reports-pulse';
const LY_SEL_PT     = 'nw-selected-pt';

// MapLibre dark style — no credentials needed
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a MapLibre match expression: wardNo → risk fill colour */
function buildRiskFillExpr(riskData) {
  if (!riskData || riskData.length === 0) return 'rgba(0,0,0,0)';
  const cases = riskData.flatMap(r => {
    const meta = RISK_BAND_META[r.band];
    return meta ? [String(r.wardNo ?? r.wardId), meta.fill] : [];
  });
  if (cases.length === 0) return 'rgba(0,0,0,0)';
  return ['match', ['get', 'Ward_No'], ...cases, 'rgba(0,0,0,0)'];
}

/** Convert reports array → GeoJSON FeatureCollection */
function reportsToGeoJSON(reports) {
  return {
    type: 'FeatureCollection',
    features: reports
      .filter(r => r.lat != null && r.lng != null)
      .map(r => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          reportId:   r.reportId,
          passable:   r.assessment?.passable   ?? 'unknown',
          depthClass: r.assessment?.depthClass ?? 'unknown',
          status:     r.status,
          opsStatus:  r.opsStatus,
          createdAt:  r.createdAt,
          wardNo:     String(r.wardNo  ?? r.wardId ?? ''),
          wardName:   r.wardName ?? '',
          isDemo:     r._demo ? 1 : 0,
          color:      markerColor(r.assessment?.passable ?? 'unknown', r.status),
          _raw:       JSON.stringify(r),
        },
      })),
  };
}

function selectedGeoJSON(lngLat) {
  if (!lngLat) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
      properties: {},
    }],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DelhiMap() {
  const navigate        = useNavigate();
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const tooltipRef      = useRef(null);   // MapLibre Popup for hover tooltip
  const hoveredIdRef    = useRef(null);

  const [bbox,       setBbox]       = useState(null);
  const [mapReady,   setMapReady]   = useState(false);
  const [mapError,   setMapError]   = useState(null);
  const [showSplash, setShowSplash] = useState(true);   // Three.js globe intro
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selected ward + coordinate
  const [selectedWard,   setSelectedWard]   = useState(null);   // GeoJSON feature properties
  const [selectedLatLng, setSelectedLatLng] = useState(null);   // { lat, lng }

  // Cursor lat/lng readout (updated on mousemove, not stored to state to avoid re-renders)
  const cursorReadoutRef = useRef(null);

  // Layer visibility
  const [layers, setLayers] = useState({
    wards:    true,
    reports:  true,
    risk:     false,
    selected: true,
  });

  const { reports: apiReports, risk: apiRisk, loading, error, refresh } = useMapData(bbox);

  // Merge demo data when VITE_DEMO_MODE=true
  const reports = useMemo(() => IS_DEMO ? [...apiReports, ...DEMO_REPORTS] : apiReports, [apiReports]);
  const risk    = useMemo(() => IS_DEMO ? [...apiRisk,    ...DEMO_RISK]    : apiRisk,    [apiRisk]);

  // ── Init map ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setWorkerUrl(workerUrl);

    let map;
    try {
      map = new maplibregl.Map({
        container:          containerRef.current,
        style:              DARK_STYLE,
        center:             DELHI_CENTER,
        zoom:               DELHI_ZOOM,
        attributionControl: { compact: true },
        logoPosition:       'bottom-right',
      });
    } catch (e) {
      setMapError('Map failed to initialise: ' + e.message);
      return;
    }

    mapRef.current = map;

    // Navigation controls — zoom +/−, compass (no geolocate per spec)
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    // Hover tooltip popup
    tooltipRef.current = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'nw-ward-tooltip',
      offset:       10,
      maxWidth:     '200px',
    });

    map.on('load', () => {
      // ── Ward source (bundled GeoJSON, loaded once) ────────────────────────
      map.addSource(SRC_WARDS, { type: 'geojson', data: wardsGeoJSON,
        generateId: true });   // generateId enables hover state

      // Risk fill — transparent by default, updated when risk data arrives
      map.addLayer({
        id: LY_WARD_FILL, type: 'fill', source: SRC_WARDS,
        layout: { visibility: 'visible' },
        paint: {
          'fill-color':   'rgba(0,0,0,0)',
          'fill-opacity': 0.85,
        },
      });

      // Ward boundaries
      map.addLayer({
        id: LY_WARD_LINE, type: 'line', source: SRC_WARDS,
        layout: { visibility: 'visible' },
        paint: {
          'line-color': '#30363d',
          'line-width': 0.7,
        },
      });

      // Hover highlight
      map.addLayer({
        id: LY_WARD_HOVER, type: 'fill', source: SRC_WARDS,
        layout: { visibility: 'visible' },
        paint: {
          'fill-color':   '#58a6ff',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hovered'], false], 0.15,
            0,
          ],
        },
      });

      // Selected highlight
      map.addLayer({
        id: LY_WARD_SEL, type: 'line', source: SRC_WARDS,
        layout: { visibility: 'visible' },
        paint: {
          'line-color': '#58a6ff',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.5,
            0,
          ],
        },
      });

      // Ward number labels (zoom ≥ 11)
      map.addLayer({
        id: LY_WARD_LABEL, type: 'symbol', source: SRC_WARDS,
        minzoom: 11,
        layout: {
          'text-field':       ['get', 'Ward_No'],
          'text-font':        ['Open Sans Semibold', 'Arial Unicode MS Regular'],
          'text-size':        10,
          'text-allow-overlap': false,
          visibility: 'visible',
        },
        paint: {
          'text-color':      '#8b949e',
          'text-halo-color': '#0d1117',
          'text-halo-width': 1,
        },
      });

      // ── Report source ───────────────────────────────────────────────────
      map.addSource(SRC_REPORTS, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Outer pulse ring for analyzing reports
      map.addLayer({
        id: LY_RPT_PULSE, type: 'circle', source: SRC_REPORTS,
        filter: ['==', ['get', 'status'], 'analyzing'],
        paint: {
          'circle-radius':       18,
          'circle-color':        'rgba(0,0,0,0)',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#9ca3af',
          'circle-stroke-opacity': 0.5,
          'circle-opacity':       0,
        },
      });

      // White halo for contrast
      map.addLayer({
        id: LY_RPT_HALO, type: 'circle', source: SRC_REPORTS,
        paint: {
          'circle-radius':        13,
          'circle-color':         '#161b22',
          'circle-stroke-width':  1.5,
          'circle-stroke-color':  '#21262d',
        },
      });

      // Coloured dot — colour driven by passable value via feature property
      map.addLayer({
        id: LY_RPT_DOT, type: 'circle', source: SRC_REPORTS,
        paint: {
          'circle-radius':        9,
          'circle-color':         ['get', 'color'],
          'circle-stroke-width':  2,
          'circle-stroke-color':  '#ffffff22',
          'circle-opacity': [
            'case',
            ['==', ['get', 'status'], 'analyzing'], 0.6,
            1,
          ],
        },
      });

      // ── Selected location point ─────────────────────────────────────────
      map.addSource(SRC_SELECTED, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: LY_SEL_PT, type: 'circle', source: SRC_SELECTED,
        paint: {
          'circle-radius':       6,
          'circle-color':        '#f0883e',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#161b22',
        },
      });

      setMapReady(true);
      setBbox(boundsToString(map.getBounds()));
    }); // map.on('load')

    // Re-fetch on pan/zoom
    map.on('moveend', () => {
      if (mapRef.current) setBbox(boundsToString(mapRef.current.getBounds()));
    });

    // ── Ward hover ──────────────────────────────────────────────────────────
    map.on('mousemove', LY_WARD_FILL, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features?.[0];
      if (!feat) return;

      if (hoveredIdRef.current !== null && hoveredIdRef.current !== feat.id) {
        map.setFeatureState({ source: SRC_WARDS, id: hoveredIdRef.current }, { hovered: false });
      }
      hoveredIdRef.current = feat.id;
      map.setFeatureState({ source: SRC_WARDS, id: feat.id }, { hovered: true });

      tooltipRef.current
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>Ward ${feat.properties.Ward_No}</strong><br>` +
          `${titleCase(feat.properties.Ward_Name)}`
        )
        .addTo(map);
    });

    map.on('mouseleave', LY_WARD_FILL, () => {
      map.getCanvas().style.cursor = '';
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: SRC_WARDS, id: hoveredIdRef.current }, { hovered: false });
        hoveredIdRef.current = null;
      }
      tooltipRef.current.remove();
    });

    // ── Ward click ──────────────────────────────────────────────────────────
    map.on('click', LY_WARD_FILL, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      // Clear previous selected state
      if (mapRef._selectedFeatId != null) {
        map.setFeatureState({ source: SRC_WARDS, id: mapRef._selectedFeatId }, { selected: false });
      }
      mapRef._selectedFeatId = feat.id;
      map.setFeatureState({ source: SRC_WARDS, id: feat.id }, { selected: true });

      setSelectedWard(feat.properties);
      setSelectedLatLng({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // ── Report pin click ────────────────────────────────────────────────────
    map.on('click', LY_RPT_DOT, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      e.stopPropagation?.();    // prevent ward click also firing
      try {
        const report = JSON.parse(feat.properties._raw);
        setSelectedLatLng({ lat: report.lat, lng: report.lng });
        // Resolve ward from GeoJSON
        const wardFeat = wardFromLatLng(report.lng, report.lat, wardsGeoJSON.features);
        setSelectedWard(wardFeat?.properties ?? null);
        // Highlight ward
        if (wardFeat && mapRef._selectedFeatId !== wardFeat.id) {
          if (mapRef._selectedFeatId != null) {
            map.setFeatureState({ source: SRC_WARDS, id: mapRef._selectedFeatId }, { selected: false });
          }
          mapRef._selectedFeatId = wardFeat.id;
          map.setFeatureState({ source: SRC_WARDS, id: wardFeat.id }, { selected: true });
        }
      } catch { /* ignore */ }
    });

    // ── Map click (empty area — lat/lng readout + ward lookup) ──────────────
    map.on('click', (e) => {
      // Ignore if a layer click was handled
      const featuresAtPoint = map.queryRenderedFeatures(e.point, {
        layers: [LY_RPT_DOT, LY_WARD_FILL],
      });
      if (featuresAtPoint.length > 0) return;

      const { lng, lat } = e.lngLat;
      setSelectedLatLng({ lat, lng });

      const wardFeat = wardFromLatLng(lng, lat, wardsGeoJSON.features);
      setSelectedWard(wardFeat?.properties ?? null);

      if (wardFeat) {
        if (mapRef._selectedFeatId != null) {
          map.setFeatureState({ source: SRC_WARDS, id: mapRef._selectedFeatId }, { selected: false });
        }
        mapRef._selectedFeatId = wardFeat.id;
        map.setFeatureState({ source: SRC_WARDS, id: wardFeat.id }, { selected: true });
      }
    });

    // ── Pointer cursor on report dots ───────────────────────────────────────
    map.on('mouseenter', LY_RPT_DOT, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', LY_RPT_DOT, () => { map.getCanvas().style.cursor = ''; });

    // ── Mousemove → cursor coord readout ────────────────────────────────────
    map.on('mousemove', (e) => {
      if (cursorReadoutRef.current) {
        cursorReadoutRef.current.textContent =
          `${fmtLat(e.lngLat.lat)}  ·  ${fmtLng(e.lngLat.lng)}`;
      }
    });

    map.on('error', (e) => {
      const msg = e.error?.message ?? '';
      if (msg.includes('nw-')) console.warn('[DelhiMap] layer error:', msg);
    });

    return () => {
      tooltipRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []); // run once

  // ── Update report source ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource(SRC_REPORTS);
    if (src) src.setData(reportsToGeoJSON(reports));
  }, [reports, mapReady]);

  // ── Update ward risk fill ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!map.getLayer(LY_WARD_FILL)) return;
    const expr = buildRiskFillExpr(risk);
    map.setPaintProperty(LY_WARD_FILL, 'fill-color', expr);
  }, [risk, mapReady]);

  // ── Update selected-point source ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource(SRC_SELECTED);
    if (src) src.setData(selectedGeoJSON(selectedLatLng));
  }, [selectedLatLng, mapReady]);

  // ── Layer visibility toggles ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = (on) => on ? 'visible' : 'none';
    const setVis = (id, on) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis(on)); };

    setVis(LY_WARD_FILL,  layers.wards);
    setVis(LY_WARD_LINE,  layers.wards);
    setVis(LY_WARD_HOVER, layers.wards);
    setVis(LY_WARD_SEL,   layers.wards);
    setVis(LY_WARD_LABEL, layers.wards);

    setVis(LY_RPT_HALO,  layers.reports);
    setVis(LY_RPT_DOT,   layers.reports);
    setVis(LY_RPT_PULSE, layers.reports);

    // Risk fill — only show when both 'risk' layer is on AND ward fill is on
    setVis(LY_WARD_FILL, layers.wards && layers.risk);

    setVis(LY_SEL_PT, layers.selected);
  }, [layers, mapReady]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLayerChange = useCallback((key, val) => {
    setLayers(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.flyTo({ center: DELHI_CENTER, zoom: DELHI_ZOOM, duration: 900 });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedWard(null);
    setSelectedLatLng(null);
    if (mapRef.current && mapRef._selectedFeatId != null) {
      mapRef.current.setFeatureState(
        { source: SRC_WARDS, id: mapRef._selectedFeatId },
        { selected: false },
      );
      mapRef._selectedFeatId = null;
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>

        {/* Brand */}
        <div className={styles.sidebarHeader}>
          <div className={styles.brandRow}>
            <span className={styles.brandLogo} aria-hidden="true">
              <Waves size={20} color="var(--color-primary)" />
            </span>
            <div>
              <span className={styles.brandName}>PARVAT</span>
              <span className={styles.brandSub}>Predictive Analytics for Risk, Vulnerability and Terrain</span>
            </div>
          </div>
        </div>

        {/* Demo banner */}
        {IS_DEMO && (
          <div className={styles.demoBanner} role="status">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>Demo mode — simulated data only</span>
          </div>
        )}

        {/* Stats */}
        <StatsPanel
          reports={reports}
          risk={risk}
          loading={loading}
          isDemoMode={IS_DEMO}
        />

        {/* Ward / location detail panel */}
        {(selectedWard || selectedLatLng) ? (
          <WardDetailPanel
            ward={selectedWard}
            clickLatLng={selectedLatLng}
            reports={reports}
            risk={risk}
            onClose={handleCloseDetail}
            isDemoMode={IS_DEMO}
          />
        ) : (
          <div className={styles.emptyDetail}>
            <span className={styles.emptyDetailIcon}>
              <Map size={24} aria-hidden="true" />
            </span>
            <p className={styles.emptyDetailText}>
              Click any ward or flood report to see details
            </p>
          </div>
        )}
      </aside>

      {/* ── Map area ────────────────────────────────────────────────────── */}
      <div className={styles.mapWrap}>

        {/* Mobile sidebar toggle */}
        <button
          className={styles.mobileSidebarBtn}
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Close panel' : 'Open panel'}
        >
          {sidebarOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        {/* Map top bar */}
        <div className={styles.mapHeader} aria-hidden="true">
          <span className={styles.mapHeaderTitle}>
            Delhi Ward Map · {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
          <div className={styles.mapHeaderBtns}>
            <button className={styles.mapHeaderBtn} onClick={refresh} disabled={loading}
              title="Refresh data" aria-label="Refresh">
              {loading ? <Spinner size={12} color="#8b949e" /> : '↻'}
              {!loading && ' Refresh'}
            </button>
            <button className={styles.mapHeaderBtn} onClick={handleResetView}
              title="Reset to Delhi" aria-label="Reset view">
              ⊙ Reset
            </button>
          </div>
        </div>

        {/* Error */}
        {(error || mapError) && (
          <div className={styles.errorWrap}>
            <ErrorBanner
              message={(mapError ?? error?.message) ?? 'Could not load map data'}
              onRetry={mapError ? undefined : refresh}
              onDismiss={mapError ? () => setMapError(null) : undefined}
            />
          </div>
        )}

        {/* Map canvas */}
        <div
          ref={containerRef}
          className={styles.mapContainer}
          role="application"
          aria-label="Delhi flood monitoring map"
        />

        {/* Layer control */}
        {mapReady && (
          <LayerControl
            layers={layers}
            onChange={handleLayerChange}
            riskCount={risk.length}
            reportCount={reports.length}
          />
        )}

        {/* Report FAB */}
        <button
          className={styles.fab}
          onClick={() => navigate('/report')}
          aria-label="Submit a flood report"
        >
          <Camera size={18} aria-hidden="true" />
          <span>Report flood</span>
        </button>

        {/* Cursor coordinate readout */}
        <div ref={cursorReadoutRef} className={styles.coordReadout} aria-hidden="true">
          Move cursor to see coordinates
        </div>

      </div>{/* mapWrap */}

      {/* ── Three.js globe splash — full-screen entry experience ──────────── */}
      {showSplash && (
        <GlobeSplash onDismiss={() => setShowSplash(false)} />
      )}
    </div>
  );
}
