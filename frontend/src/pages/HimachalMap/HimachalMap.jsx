/**
 * HimachalMap.jsx — Production Himachal Pradesh Hazard Monitoring Map.
 *
 * Implements:
 *   • Full-bleed map with floating GlassPanels (compact top bar, left desktop panel, mobile sheet).
 *   • Starts zoomed to fit all of Himachal Pradesh [75.6-79.0, 30.4-33.2].
 *   • Basemap: Amazon Location style when env vars set; otherwise OSM raster tiles muted
 *     with raster-saturation -0.85 and slightly reduced contrast so risk colors pop.
 *   • District outlines from /data/hp-districts.geojson with 18% risk-tinted fills,
 *     subtle outlines, medium-zoom labels, hover details and click-to-zoom.
 *   • Band-colored hotspot icons, low-zoom clusters, selected rings and HIGH/SEVERE pulses.
 *   • Compact MapLibre attribution at bottom-left; floating "Report a hazard" button kept clear of it.
 *   • Resilience: caches last successful hotspots; on failure keeps showing them with a chip
 *     "Updated 3 min ago · Retry"; on first-load failure shows a small inline retry card in the panel,
 *     never a map-covering overlay; never shows HTTP codes to users; never shows "no hotspots"
 *     when the request failed.
 *   • Dev notices only under import.meta.env.DEV.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Play,
  RotateCcw,
  Crosshair,
  Camera,
  MapPin,
  Loader2,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  ChevronDown,
  Layers,
  ArrowLeft,
  X,
  ShieldAlert,
} from 'lucide-react';

import { useHotspots, useReports } from '../../api/index.js';
import {
  Button,
  GlassPanel,
  useToast,
} from '../../components/ui/index.js';
import { HotspotDetailPanel } from './HotspotDetailPanel.jsx';
import { PriorityList } from './PriorityList.jsx';
import { DemoAnalysisMoment } from './DemoAnalysisMoment.jsx';
import { AlertCenter } from '../AlertCenter/AlertCenter.jsx';
import {
  HP_SAMPLE_REPORTS,
  DEMO_STORY_DATA,
  getFreshHpSampleHotspots,
} from '../../data/hpSampleData.js';
import styles from './HimachalMap.module.css';

// ── Geographic Constants ──────────────────────────────────────────────────────
const HP_BOUNDS = [
  [75.6, 30.4], // southwest [lng, lat]
  [79.0, 33.2], // northeast [lng, lat]
];

function isInsideHP(lat, lng) {
  return (
    lng >= HP_BOUNDS[0][0] && lng <= HP_BOUNDS[1][0] &&
    lat >= HP_BOUNDS[0][1] && lat <= HP_BOUNDS[1][1]
  );
}

const HP_MAX_BOUNDS = [
  [74.5, 29.5],
  [80.2, 34.2],
];

const HP_CENTER = [77.2, 31.8]; // [lng, lat]
const HP_DEFAULT_ZOOM = 7.6;

// 12 Himachal Pradesh Districts
const HP_DISTRICTS = [
  { id: 'all', name: 'All districts', center: HP_CENTER, zoom: 7.6 },
  { id: 'Bilaspur', name: 'Bilaspur', center: [76.75, 31.33], zoom: 9.8 },
  { id: 'Chamba', name: 'Chamba', center: [76.12, 32.55], zoom: 9.2 },
  { id: 'Hamirpur', name: 'Hamirpur', center: [76.52, 31.68], zoom: 10.2 },
  { id: 'Kangra', name: 'Kangra', center: [76.27, 32.10], zoom: 9.2 },
  { id: 'Kinnaur', name: 'Kinnaur', center: [78.35, 31.65], zoom: 8.8 },
  { id: 'Kullu', name: 'Kullu', center: [77.10, 31.96], zoom: 9.2 },
  { id: 'Lahaul & Spiti', name: 'Lahaul & Spiti', center: [77.40, 32.50], zoom: 8.4 },
  { id: 'Mandi', name: 'Mandi', center: [76.93, 31.58], zoom: 9.2 },
  { id: 'Shimla', name: 'Shimla', center: [77.17, 31.10], zoom: 9.2 },
  { id: 'Sirmaur', name: 'Sirmaur', center: [77.30, 30.60], zoom: 9.8 },
  { id: 'Solan', name: 'Solan', center: [77.10, 30.90], zoom: 9.8 },
  { id: 'Una', name: 'Una', center: [76.27, 31.47], zoom: 9.8 },
];

const BAND_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'SEVERE', label: 'Severe', Icon: AlertOctagon },
  { id: 'HIGH', label: 'High', Icon: AlertTriangle },
  { id: 'MODERATE', label: 'Moderate', Icon: AlertCircle },
  { id: 'LOW', label: 'Low', Icon: CheckCircle2 },
];

const BAND_COLORS = {
  SEVERE: '#D64545',
  HIGH: '#E5742B',
  MODERATE: '#E8A317',
  LOW: '#2E9E5B',
  UNKNOWN: '#8A99A6',
};

// ── Vector SVGs for Hotspot MapLibre Markers ───────────────────────────────────
const MARKER_SVGS = {
  'marker-severe': `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#D64545" stroke="#FFFFFF" stroke-width="2.5"/><polygon points="12.5,8 23.5,8 28,12.5 28,23.5 23.5,28 12.5,28 8,23.5 8,12.5" fill="none" stroke="#FFFFFF" stroke-width="2"/><line x1="18" y1="13" x2="18" y2="19" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="18" cy="23" r="1.25" fill="#FFFFFF"/></svg>`,
  'marker-high': `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#E5742B" stroke="#FFFFFF" stroke-width="2.5"/><path d="M18 9 L28 26 L8 26 Z" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/><line x1="18" y1="15" x2="18" y2="20" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/><circle cx="18" cy="23" r="1.2" fill="#FFFFFF"/></svg>`,
  'marker-moderate': `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#E8A317" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="18" cy="18" r="9" fill="none" stroke="#FFFFFF" stroke-width="2"/><line x1="18" y1="14" x2="18" y2="19" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/><circle cx="18" cy="22" r="1.2" fill="#FFFFFF"/></svg>`,
  'marker-low': `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#2E9E5B" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="18" cy="18" r="9" fill="none" stroke="#FFFFFF" stroke-width="2"/><polyline points="13,18 16.5,21.5 23,15" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'marker-unknown': `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#8A99A6" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="18" cy="18" r="9" fill="none" stroke="#FFFFFF" stroke-width="2"/><text x="18" y="22" font-size="12" font-family="sans-serif" font-weight="bold" fill="#FFFFFF" text-anchor="middle">?</text></svg>`,
};

// ── Basemap Style Resolver ────────────────────────────────────────────────────
function resolveMapStyle() {
  const mapName = import.meta.env.VITE_LOCATION_MAP_NAME;
  const apiKey = import.meta.env.VITE_LOCATION_API_KEY;
  const region = import.meta.env.VITE_AWS_REGION ?? 'ap-south-1';

  // Amazon Location Service style if keys set
  if (mapName && apiKey) {
    return `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`;
  }

  // OpenStreetMap raster tiles muted with saturation -0.85 and reduced contrast
  return {
    version: 8,
    sources: {
      'osm-raster-source': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'osm-raster-layer',
        type: 'raster',
        source: 'osm-raster-source',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-saturation': -0.85,
          'raster-contrast': -0.1,
          'raster-opacity': 0.95,
        },
      },
    ],
  };
}

// ── Sanitize Error Messages (never show HTTP codes to users) ───────────────────
function sanitizeErrorMessage(err) {
  if (!err) return 'Unable to load hazard hotspots right now.';
  const raw = typeof err === 'string' ? err : err.message || '';
  if (/500|502|503|504|400|401|403|404|ECONNREFUSED|status\s*code|Internal\s*Server/i.test(raw)) {
    return 'Unable to connect to the hazard monitoring service. Please check your internet connection.';
  }
  if (/timeout|abort/i.test(raw)) {
    return 'The connection timed out. Please check your network and retry.';
  }
  return raw || 'Unable to load hazard hotspots right now.';
}

export function HimachalMap() {
  const navigate = useNavigate();
  const toast = useToast();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const pulseAnimRef = useRef(null);
  const rawDistrictsRef = useRef(null);
  const hotspotPopupRef = useRef(null);
  const selectedHotspotIdRef = useRef(null);
  const storyTimersRef = useRef([]);
  const storyMarkerRef = useRef(null);
  const demoToastIdRef = useRef(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Filter states
  const [selectedBand, setSelectedBand] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // Active Tab in Panel ('priority' | 'alerts')
  const [panelTab, setPanelTab] = useState('priority');

  // Mobile sheet expand state
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // User detected coordinates { lat, lng }
  const [userCoords, setUserCoords] = useState(null);

  // Hotspots hook: auto-refreshes every 30 seconds
  const {
    hotspots = [],
    updatedAt,
    loading: hotspotsLoading,
    error: hotspotsError,
    refetch,
  } = useHotspots({
    refreshIntervalMs: 30000,
  });

  // Recent hazard reports hook
  const { reports = [] } = useReports({
    refreshIntervalMs: 30000,
  });

  // ── Resilience: Cache last successful hotspots ──────────────────────────────
  const [cachedData, setCachedData] = useState(() => {
    try {
      const saved = localStorage.getItem('nalawatch_cached_hotspots_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage access issues
    }
    return { data: [], timestamp: null };
  });

  // Update persistent cache whenever fresh hotspots arrive
  useEffect(() => {
    if (hotspots && hotspots.length > 0) {
      const entry = {
        data: hotspots,
        timestamp: updatedAt ? new Date(updatedAt).getTime() : Date.now(),
      };
      setCachedData(entry);
      try {
        localStorage.setItem('nalawatch_cached_hotspots_v1', JSON.stringify(entry));
      } catch {
        // storage quota ignore
      }
    }
  }, [hotspots, updatedAt]);

  // ── Demo Mode (?demo=1 or VITE_DEMO_MODE=true) ─────────────────────────────
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === '1' || import.meta.env.VITE_DEMO_MODE === 'true';

  const [simulatedHotspots, setSimulatedHotspots] = useState([]);
  const [simulatedReports, setSimulatedReports] = useState([]);
  const [demoSampleHotspots] = useState(() => getFreshHpSampleHotspots());
  const [demoStoryStep, setDemoStoryStep] = useState('idle');
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const isDemoStoryRunning = demoStoryStep !== 'idle' && demoStoryStep !== 'complete';

  // Base hotspots respecting cache and demo mode; filter live data to HP bounds
  const baseHotspots = useMemo(() => {
    if (isDemoMode) return demoSampleHotspots;
    const live = hotspots && hotspots.length > 0 ? hotspots : cachedData.data;
    return live.filter((h) => h.lat !== null && h.lng !== null && isInsideHP(h.lat, h.lng));
  }, [hotspots, cachedData.data, isDemoMode, demoSampleHotspots]);

  const effectiveHotspots = useMemo(() => {
    if (isDemoMode) {
      const existingIds = new Set(baseHotspots.map((h) => h.hotspotId));
      const additional = demoSampleHotspots.filter((h) => !existingIds.has(h.hotspotId));
      return [...simulatedHotspots, ...baseHotspots, ...additional];
    }
    return baseHotspots;
  }, [isDemoMode, baseHotspots, simulatedHotspots, demoSampleHotspots]);

  const effectiveReports = useMemo(() => {
    if (isDemoMode) {
      const base = reports.length > 0 ? reports : HP_SAMPLE_REPORTS;
      return [...simulatedReports, ...base];
    }
    return reports;
  }, [isDemoMode, reports, simulatedReports]);

  // Advisory popover state
  const [advisoryOpen, setAdvisoryOpen] = useState(false);
  const advisoryRef = useRef(null);

  // Close advisory popover on outside click
  useEffect(() => {
    if (!advisoryOpen) return;
    function handleClick(e) {
      if (advisoryRef.current && !advisoryRef.current.contains(e.target)) {
        setAdvisoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [advisoryOpen]);

  // UI state
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [districtsNotice, setDistrictsNotice] = useState(false);
  const [locating, setLocating] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState('just now');

  // Relative time ticker
  useEffect(() => {
    const updateTime = () => {
      const demoUpdatedAt = simulatedHotspots[0]?.lastUpdated || demoSampleHotspots[0]?.lastUpdated;
      const ts = isDemoMode
        ? Date.parse(demoUpdatedAt)
        : cachedData.timestamp || (updatedAt ? new Date(updatedAt).getTime() : Date.now());
      const diffMs = Date.now() - ts;
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      if (mins < 1) {
        setTimeAgoStr('just now');
      } else {
        setTimeAgoStr(`${mins} min ago`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, [cachedData.timestamp, updatedAt, isDemoMode, simulatedHotspots, demoSampleHotspots]);

  const handleDemoAnalysisComplete = useCallback(() => {
    setAnalysisVisible(false);
    setDemoStoryStep('flying');
    setPanelTab('priority');

    const hotspot = {
      ...DEMO_STORY_DATA.hotspot,
      lastUpdated: new Date().toISOString(),
    };
    setSimulatedHotspots((current) => [
      hotspot,
      ...current.filter((item) => item.hotspotId !== hotspot.hotspotId),
    ]);
    setSelectedHotspot(hotspot);
    setSheetExpanded(true);

    const map = mapRef.current;
    if (map) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const camera = {
        center: [hotspot.lng, hotspot.lat],
        zoom: 12.5,
        essential: !reducedMotion,
      };
      if (reducedMotion) map.jumpTo(camera);
      else map.flyTo({ ...camera, duration: 1300 });

      storyMarkerRef.current?.remove();
      const markerElement = document.createElement('div');
      markerElement.className = `${styles.simulatedRipplePin} ${styles.demoStoryPin}`;
      markerElement.innerHTML = `
        <div class="${styles.rippleWave}"></div>
        <div class="${styles.rippleWave}" style="animation-delay: 0.6s"></div>
        <div class="${styles.rippleCore}" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2"/></svg></div>
      `;
      storyMarkerRef.current = new maplibregl.Marker({ element: markerElement })
        .setLngLat([hotspot.lng, hotspot.lat])
        .addTo(map);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    storyTimersRef.current.push(setTimeout(() => {
      setSelectedHotspot(null);
      setSheetExpanded(false);
      setDemoStoryStep('reranking');
    }, reducedMotion ? 0 : 1350));
    storyTimersRef.current.push(setTimeout(() => {
      demoToastIdRef.current = toastRef.current.warn('New high-risk alert near Dharamshala');
      setDemoStoryStep('complete');
    }, reducedMotion ? 150 : 1700));
  }, []);

  const runDemoStory = useCallback(() => {
    if (!isDemoMode) return;
    storyTimersRef.current.forEach(clearTimeout);
    storyTimersRef.current = [];
    if (demoToastIdRef.current) {
      toastRef.current.dismiss(demoToastIdRef.current);
      demoToastIdRef.current = null;
    }
    storyMarkerRef.current?.remove();
    storyMarkerRef.current = null;
    setSelectedBand('ALL');
    setSelectedDistrict('all');
    setPanelTab('priority');
    setSelectedHotspot(null);
    setSheetExpanded(false);
    setAnalysisVisible(false);

    const submittedAt = new Date().toISOString();
    const report = { ...DEMO_STORY_DATA.report, createdAt: submittedAt };
    setSimulatedReports((current) => [
      report,
      ...current.filter((item) => item.reportId !== report.reportId),
    ]);
    setDemoStoryStep('submitting');
    storyTimersRef.current.push(setTimeout(() => {
      setDemoStoryStep('analyzing');
      setAnalysisVisible(true);
    }, 350));
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) return undefined;
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      )) return;

      if (event.key.toLowerCase() === 'd' || event.key.toLowerCase() === 'r') {
        event.preventDefault();
        runDemoStory();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDemoMode, runDemoStory]);

  useEffect(() => () => {
    storyTimersRef.current.forEach(clearTimeout);
    storyMarkerRef.current?.remove();
    if (demoToastIdRef.current) toastRef.current.dismiss(demoToastIdRef.current);
  }, []);

  // Attempt silent GPS geolocation on mount
  useEffect(() => {
    if (navigator.geolocation && !userCoords) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5)),
          });
        },
        () => {},
        { timeout: 6000, maximumAge: 60000 },
      );
    }
  }, [userCoords]);

  // Filter hotspots by selected risk band and selected district
  const filteredHotspots = useMemo(() => {
    return effectiveHotspots.filter((h) => {
      if (selectedBand !== 'ALL' && h.riskBand !== selectedBand) return false;
      if (selectedDistrict !== 'all') {
        const dName = (h.district || '').toLowerCase();
        const selName = selectedDistrict.toLowerCase();
        if (dName !== selName && !dName.includes(selName)) return false;
      }
      return true;
    });
  }, [effectiveHotspots, selectedBand, selectedDistrict]);

  // Keep ref up to date for map event handlers
  const filteredHotspotsRef = useRef(filteredHotspots);
  useEffect(() => {
    filteredHotspotsRef.current = filteredHotspots;
  }, [filteredHotspots]);

  // Convert filtered hotspots to GeoJSON for clustering
  const hotspotsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: filteredHotspots
        .filter((h) => h.lat !== null && h.lng !== null)
        .map((h) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [h.lng, h.lat],
          },
          properties: {
            hotspotId: h.hotspotId,
            district: h.district || '',
            wardName: h.wardName || '',
            riskBand: h.riskBand || 'UNKNOWN',
            riskScore: h.riskScore ?? null,
            activeReports: h.activeReports ?? 0,
            reportCount: h.reportCount ?? 0,
            lastUpdated: h.lastUpdated || '',
          },
        })),
    };
  }, [filteredHotspots]);

  // Enrich district outlines with risk stats
  const enrichDistrictsGeoJSON = (geoData, hotspotsList, selectedDist) => {
    if (!geoData || !geoData.features) return geoData;
    const districtRiskMap = new Map();

    hotspotsList.forEach((h) => {
      const dName = (h.district || '').toLowerCase();
      if (!dName) return;
      const current = districtRiskMap.get(dName) || {
        severe: 0,
        high: 0,
        moderate: 0,
        low: 0,
        count: 0,
      };
      current.count += 1;
      const band = (h.riskBand || 'UNKNOWN').toUpperCase();
      if (band === 'SEVERE') current.severe += 1;
      else if (band === 'HIGH') current.high += 1;
      else if (band === 'MODERATE') current.moderate += 1;
      else if (band === 'LOW') current.low += 1;
      const riskScore = Number(h.riskScore);
      if (h.riskScore !== null && h.riskScore !== undefined && Number.isFinite(riskScore)) {
        current.maxScore = Math.max(current.maxScore ?? riskScore, riskScore);
      }
      districtRiskMap.set(dName, current);
    });

    return {
      ...geoData,
      features: geoData.features.map((f) => {
        const distName = f.properties.district || f.properties.name || '';
        const stats = districtRiskMap.get(distName.toLowerCase()) || { count: 0, maxScore: null };
        const maxBand = stats.severe > 0 ? 'SEVERE'
          : stats.high > 0 ? 'HIGH'
            : stats.moderate > 0 ? 'MODERATE'
              : stats.low > 0 ? 'LOW'
                : 'NONE';
        const maxColor = BAND_COLORS[maxBand] || '#8A99A6';

        const isSelected =
          selectedDist !== 'all' &&
          (distName.toLowerCase() === selectedDist.toLowerCase() ||
            f.properties.id === selectedDist);

        return {
          ...f,
          properties: {
            ...f.properties,
            name: distName,
            maxRiskBand: maxBand,
            maxRiskColor: maxColor,
            maxRiskScore: stats.maxScore ?? null,
            hotspotCount: stats.count,
            fillOpacity: maxBand === 'NONE' ? 0 : 0.18,
            isSelected,
          },
        };
      }),
    };
  };

  // ── Initialize MapLibre GL Map ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    setWorkerUrl(workerUrl);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: resolveMapStyle(),
      center: HP_CENTER,
      zoom: HP_DEFAULT_ZOOM,
      minZoom: 6.5,
      maxZoom: 18,
      maxBounds: HP_MAX_BOUNDS,
      attributionControl: false, // compact attribution added manually at bottom-left
    });

    mapRef.current = map;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let motionChangeHandler = null;

    // Add compact attribution control at bottom-left
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', async () => {
      // 1. Fit map to visible hotspots on first load, falling back to HP bounds
      const initialHotspots = filteredHotspotsRef.current;
      if (initialHotspots.length > 0) {
        const lngs = initialHotspots.map((h) => h.lng).filter(Boolean);
        const lats = initialHotspots.map((h) => h.lat).filter(Boolean);
        const sw = [Math.min(...lngs), Math.min(...lats)];
        const ne = [Math.max(...lngs), Math.max(...lats)];
        map.fitBounds([sw, ne], {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 10,
          duration: 0,
        });
      } else {
        map.fitBounds(HP_BOUNDS, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 0,
        });
      }

      // 2. Register custom vector SVG marker icons with MapLibre
      await Promise.all(
        Object.entries(MARKER_SVGS).map(([id, svg]) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (!map.hasImage(id)) {
                map.addImage(id, img);
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          });
        }),
      );

      // 3. Add Hotspots GeoJSON Source with Clustering enabled
      map.addSource('hotspots-source', {
        type: 'geojson',
        data: hotspotsGeoJSON,
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 38,
      });

      // ── Cluster Layer ──────────────────────────────────────────────────────
      map.addLayer({
        id: 'clusters-layer',
        type: 'circle',
        source: 'hotspots-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#1688A8',
            4,
            '#E5742B',
            10,
            '#D64545',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            4,
            24,
            10,
            30,
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.92,
        },
      });

      // Cluster count text
      map.addLayer({
        id: 'cluster-count-layer',
        type: 'symbol',
        source: 'hotspots-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#FFFFFF',
        },
      });

      // Click cluster to zoom
      map.on('click', 'clusters-layer', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters-layer'],
        });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        map.getSource('hotspots-source').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom,
          });
        });
      });

      // ── Ripple Pulse Ring Layer for HIGH and SEVERE Hotspots ───────────────
      map.addLayer({
        id: 'hotspot-pulse-layer',
        type: 'circle',
        source: 'hotspots-source',
        filter: motionQuery.matches
          ? ['==', ['get', 'hotspotId'], '__no_animated_hotspots__']
          : [
              'all',
              ['!', ['has', 'point_count']],
              ['in', ['get', 'riskBand'], ['literal', ['HIGH', 'SEVERE']]],
            ],
        paint: {
          'circle-radius': 18,
          'circle-color': [
            'match',
            ['get', 'riskBand'],
            'SEVERE', '#D64545',
            '#E5742B',
          ],
          'circle-opacity': 0.25,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': [
            'match',
            ['get', 'riskBand'],
            'SEVERE', '#D64545',
            '#E5742B',
          ],
          'circle-stroke-opacity': 0.6,
        },
      });

      let startPulseAnimation = null;
      motionChangeHandler = (event) => {
        if (!map.getLayer('hotspot-pulse-layer')) return;
        map.setFilter('hotspot-pulse-layer', event.matches
          ? ['==', ['get', 'hotspotId'], '__no_animated_hotspots__']
          : [
              'all',
              ['!', ['has', 'point_count']],
              ['in', ['get', 'riskBand'], ['literal', ['HIGH', 'SEVERE']]],
            ]);
        if (event.matches && pulseAnimRef.current) {
          cancelAnimationFrame(pulseAnimRef.current);
          pulseAnimRef.current = null;
        } else if (!event.matches && startPulseAnimation) {
          startPulseAnimation();
        }
      };
      motionQuery.addEventListener('change', motionChangeHandler);

      // ── Unclustered Points Symbol Layer (Vector SVG Badges) ────────────────
      map.addLayer({
        id: 'unclustered-icon-layer',
        type: 'symbol',
        source: 'hotspots-source',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'match',
            ['get', 'riskBand'],
            'SEVERE', 'marker-severe',
            'HIGH', 'marker-high',
            'MODERATE', 'marker-moderate',
            'LOW', 'marker-low',
            'marker-unknown',
          ],
          'icon-size': 0.85,
          'icon-allow-overlap': true,
        },
      });

      map.addLayer({
        id: 'selected-hotspot-outer-ring',
        type: 'circle',
        source: 'hotspots-source',
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'hotspotId'], selectedHotspotIdRef.current || '__no_selected_hotspot__'],
        ],
        paint: {
          'circle-radius': 23,
          'circle-color': '#FFFFFF',
          'circle-opacity': 0,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
          'circle-stroke-opacity': 1,
        },
      });

      map.addLayer({
        id: 'selected-hotspot-risk-ring',
        type: 'circle',
        source: 'hotspots-source',
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'hotspotId'], selectedHotspotIdRef.current || '__no_selected_hotspot__'],
        ],
        paint: {
          'circle-radius': 19,
          'circle-color': '#FFFFFF',
          'circle-opacity': 0,
          'circle-stroke-color': [
            'match',
            ['get', 'riskBand'],
            'SEVERE', BAND_COLORS.SEVERE,
            'HIGH', BAND_COLORS.HIGH,
            'MODERATE', BAND_COLORS.MODERATE,
            'LOW', BAND_COLORS.LOW,
            BAND_COLORS.UNKNOWN,
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-opacity': 1,
        },
      });

      const popupContent = document.createElement('div');
      popupContent.className = styles.hotspotPopupContent;
      const popupName = document.createElement('strong');
      const popupSummary = document.createElement('span');
      popupContent.append(popupName, popupSummary);
      hotspotPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 22,
        maxWidth: '240px',
        className: styles.hotspotPopup,
      }).setDOMContent(popupContent);

      map.on('mousemove', 'unclustered-icon-layer', (event) => {
        const feature = event.features?.[0];
        if (!feature || !hotspotPopupRef.current) return;
        const properties = feature.properties;
        popupName.textContent = properties.wardName || properties.district || 'Hazard hotspot';
        const riskBand = String(properties.riskBand || 'UNKNOWN').toLowerCase();
        const riskScore = Number(properties.riskScore);
        popupSummary.textContent = `${riskBand[0].toUpperCase()}${riskBand.slice(1)} risk · Score ${
          properties.riskScore !== null && Number.isFinite(riskScore) ? riskScore : '—'
        }/100`;
        hotspotPopupRef.current
          .setLngLat(feature.geometry.coordinates)
          .addTo(map);
      });
      map.on('mouseleave', 'unclustered-icon-layer', () => {
        hotspotPopupRef.current?.remove();
      });

      // Click on unclustered hotspot marker
      map.on('click', 'unclustered-icon-layer', (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties;
        const found = filteredHotspotsRef.current.find((h) => h.hotspotId === props.hotspotId);
        if (found) {
          setSelectedHotspot(found);
          setSheetExpanded(true);
          map.easeTo({
            center: [found.lng, found.lat],
            zoom: 12.5,
          });
        }
      });

      // Pointer cursors
      map.on('mouseenter', 'clusters-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters-layer', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'unclustered-icon-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'unclustered-icon-layer', () => { map.getCanvas().style.cursor = ''; });

      // Animate ripple pulse (respecting prefers-reduced-motion)
      startPulseAnimation = () => {
        const animatePulse = () => {
          if (!mapRef.current || !mapRef.current.getLayer('hotspot-pulse-layer')) return;
          const cycle = (Date.now() % 1800) / 1800;
          const radius = 16 + cycle * 14;
          const opacity = Math.max(0, 0.65 * (1 - cycle));
          try {
            mapRef.current.setPaintProperty('hotspot-pulse-layer', 'circle-radius', radius);
            mapRef.current.setPaintProperty('hotspot-pulse-layer', 'circle-stroke-opacity', opacity);
            mapRef.current.setPaintProperty('hotspot-pulse-layer', 'circle-opacity', opacity * 0.4);
          } catch {
            // style unloaded
          }
          pulseAnimRef.current = requestAnimationFrame(animatePulse);
        };
        pulseAnimRef.current = requestAnimationFrame(animatePulse);
      };
      if (!motionQuery.matches) {
        startPulseAnimation();
      }

      // ── 4. Load District Outlines from /data/hp-districts.geojson ───────────
      try {
        const res = await fetch('/data/hp-districts.geojson');
        if (!res.ok) {
          setDistrictsNotice(true);
        } else {
          const rawDistricts = await res.json();
          if (rawDistricts && rawDistricts.type === 'FeatureCollection') {
            rawDistrictsRef.current = rawDistricts;
            const enriched = enrichDistrictsGeoJSON(rawDistricts, effectiveHotspots, selectedDistrict);

            map.addSource('hp-districts-source', {
              type: 'geojson',
              data: enriched,
            });

            // Soft risk-tinted district fills
            map.addLayer(
              {
                id: 'hp-districts-fill',
                type: 'fill',
                source: 'hp-districts-source',
                paint: {
                  'fill-color': ['get', 'maxRiskColor'],
                  'fill-opacity': ['get', 'fillOpacity'],
                },
              },
              'clusters-layer', // place behind clusters
            );

            // Subtle outlines keep the risk fills legible without dominating the basemap.
            map.addLayer(
              {
                id: 'hp-districts-line',
                type: 'line',
                source: 'hp-districts-source',
                paint: {
                  'line-color': '#536779',
                  'line-width': ['case', ['get', 'isSelected'], 1.5, 0.75],
                  'line-opacity': ['case', ['get', 'isSelected'], 0.72, 0.38],
                },
              },
              'clusters-layer',
            );

            map.addLayer(
              {
                id: 'hp-districts-labels',
                type: 'symbol',
                source: 'hp-districts-source',
                minzoom: 8.5,
                maxzoom: 12,
                layout: {
                  'text-field': ['get', 'name'],
                  'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
                  'text-size': 13,
                  'text-max-width': 10,
                  'text-allow-overlap': false,
                },
                paint: {
                  'text-color': '#34495A',
                  'text-halo-color': 'rgba(243, 248, 250, 0.9)',
                  'text-halo-width': 1.5,
                },
              },
              'clusters-layer',
            );

            // Hover label on district
            map.on('mousemove', 'hp-districts-fill', (ev) => {
              if (ev.features?.length) {
                const props = ev.features[0].properties;
                setHoveredDistrict({
                  name: props.name || props.district,
                  riskBand: props.maxRiskBand,
                  color: props.maxRiskColor,
                  count: props.hotspotCount || 0,
                  score: props.maxRiskScore,
                });
              }
            });

            map.on('mouseleave', 'hp-districts-fill', () => {
              setHoveredDistrict(null);
            });

            // Click to zoom into district
            map.on('click', 'hp-districts-fill', (ev) => {
              if (!ev.features?.length) return;
              const props = ev.features[0].properties;
              const dName = props.name || props.district;
              handleDistrictSelect(dName);
            });
          }
        }
      } catch {
        setDistrictsNotice(true);
      }
    });

    return () => {
      if (pulseAnimRef.current) {
        cancelAnimationFrame(pulseAnimRef.current);
      }
      if (motionChangeHandler) {
        motionQuery.removeEventListener('change', motionChangeHandler);
      }
      hotspotPopupRef.current?.remove();
      hotspotPopupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedHotspotIdRef.current = selectedHotspot?.hotspotId || null;
    const map = mapRef.current;
    if (!map) return;
    for (const layerId of ['selected-hotspot-outer-ring', 'selected-hotspot-risk-ring']) {
      if (map.getLayer(layerId)) {
        map.setFilter(layerId, [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'hotspotId'], selectedHotspotIdRef.current || '__no_selected_hotspot__'],
        ]);
      }
    }
  }, [selectedHotspot?.hotspotId]);

  // Sync Hotspots GeoJSON source data
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.isStyleLoaded() && map.getSource('hotspots-source')) {
      map.getSource('hotspots-source').setData(hotspotsGeoJSON);
    }
  }, [hotspotsGeoJSON]);

  // Sync Districts GeoJSON source data with risk colors & selection
  useEffect(() => {
    if (!mapRef.current || !rawDistrictsRef.current) return;
    const map = mapRef.current;
    if (map.isStyleLoaded() && map.getSource('hp-districts-source')) {
      const enriched = enrichDistrictsGeoJSON(
        rawDistrictsRef.current,
        effectiveHotspots,
        selectedDistrict,
      );
      map.getSource('hp-districts-source').setData(enriched);
    }
  }, [effectiveHotspots, selectedDistrict]);

  // Handle District Select and Zoom
  function handleDistrictSelect(distId) {
    setSelectedDistrict(distId);
    const dist = HP_DISTRICTS.find(
      (d) =>
        d.id.toLowerCase() === distId.toLowerCase() ||
        d.name.toLowerCase() === distId.toLowerCase(),
    );
    if (dist && mapRef.current) {
      mapRef.current.flyTo({
        center: dist.center,
        zoom: dist.zoom,
        essential: true,
      });
    }
  }

  // Handle My Location button
  function handleMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { longitude, latitude } = pos.coords;
        setUserCoords({
          lat: Number(latitude.toFixed(5)),
          lng: Number(longitude.toFixed(5)),
        });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 12.5,
            essential: true,
          });

          // Temporary pulsing marker
          const el = document.createElement('div');
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#1688A8';
          el.style.border = '3px solid #FFFFFF';
          el.style.boxShadow = '0 0 12px rgba(22, 136, 168, 0.8)';

          const locMarker = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);

          setTimeout(() => locMarker.remove(), 12000);
        }

        toast.success('Centered on your detected location.');
      },
      () => {
        setLocating(false);
        toast.error('Could not acquire your location. Please check browser permissions.');
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  // Match reports for selected hotspot
  const matchingReports = useMemo(() => {
    if (!selectedHotspot || !effectiveReports?.length) return [];
    return effectiveReports.filter((r) => {
      if (selectedHotspot.wardId && r.wardId && selectedHotspot.wardId === r.wardId) return true;
      if (selectedHotspot.wardNo && r.wardNo && selectedHotspot.wardNo === r.wardNo) return true;
      if (r.lat && r.lng && selectedHotspot.lat && selectedHotspot.lng) {
        const dLat = Math.abs(r.lat - selectedHotspot.lat);
        const dLng = Math.abs(r.lng - selectedHotspot.lng);
        return dLat < 0.04 && dLng < 0.04;
      }
      return false;
    });
  }, [selectedHotspot, effectiveReports]);

  function handleFocusHotspot(hotspot) {
    setSelectedHotspot(hotspot);
    setSheetExpanded(true);
    if (!mapRef.current || !hotspot.lat || !hotspot.lng) return;
    if (!isInsideHP(hotspot.lat, hotspot.lng)) {
      toast.error(`${hotspot.wardName || hotspot.district || 'This hotspot'} is outside the Himachal Pradesh map area.`);
      return;
    }
    mapRef.current.flyTo({
      center: [hotspot.lng, hotspot.lat],
      zoom: 10,
      essential: true,
    });
  }

  // Count of critical hotspots
  const criticalCount = useMemo(() => {
    return effectiveHotspots.filter(
      (h) => h.riskBand === 'SEVERE' || h.riskBand === 'HIGH',
    ).length;
  }, [effectiveHotspots]);

  // First-load error check (error occurred and no hotspots in memory or cache)
  const isFirstLoadError = Boolean(hotspotsError && effectiveHotspots.length === 0);
  const sanitizedErrorMsg = sanitizeErrorMessage(hotspotsError);

  return (
    <div className={`${styles.mapPageShell} ${selectedHotspot ? styles.mapWithSelection : ''}`}>
      {/* ── Full-Bleed Map Canvas ────────────────────────────────────────────── */}
      <div className={styles.mapViewport}>
        <div ref={mapContainerRef} className={styles.mapCanvas} />

        {/* Hovered District Badge on Map */}
        {hoveredDistrict && (
          <div className={styles.hoverDistrictBadge} role="status">
            <span
              className={styles.hoverDistrictDot}
              style={{ background: hoveredDistrict.color || '#1688A8' }}
              aria-hidden="true"
            />
            <span>
              <strong>{hoveredDistrict.name}</strong>
              {hoveredDistrict.riskBand !== 'NONE'
                ? ` · ${hoveredDistrict.riskBand.toLowerCase()} risk`
                : ''}
              {hoveredDistrict.count > 0 ? ` (${hoveredDistrict.count} active)` : ''}
              {hoveredDistrict.score !== null &&
              hoveredDistrict.score !== undefined &&
              Number.isFinite(Number(hoveredDistrict.score))
                ? ` · Highest score ${hoveredDistrict.score}/100`
                : ''}
            </span>
          </div>
        )}
      </div>

      <div className={styles.mapLegend} role="group" aria-label="Map risk legend">
        {[
          ['LOW', 'Low risk'],
          ['MODERATE', 'Moderate risk'],
          ['HIGH', 'High risk'],
          ['SEVERE', 'Severe risk'],
        ].map(([band, label]) => (
          <span key={band} className={styles.mapLegendItem}>
            <span
              className={styles.mapLegendSwatch}
              style={{ backgroundColor: BAND_COLORS[band] }}
              aria-hidden="true"
            />
            {label}
          </span>
        ))}
      </div>

      {/* ── Floating Compact Top Control Bar (GlassPanel) ────────────────────── */}
      <header className={styles.floatingTopBar}>
        <GlassPanel variant="elevated" padding="none" className={styles.topBarGlass}>
          {/* Brand & District Select */}
          <div className={styles.topBarLeft}>
            <button
              type="button"
              className={styles.brandLink}
              onClick={() => navigate('/')}
              aria-label="Go to PARVAT homepage"
            >
              <div className={styles.brandLogoMark} aria-hidden="true">
                <ShieldAlert size={16} />
              </div>
              <span className={styles.brandText}>
                <span>PARVAT</span>
                <span className={styles.brandTagline}>
                  Predictive Analytics for Risk, Vulnerability and Terrain
                </span>
              </span>
            </button>

            {/* District Select Dropdown */}
            <div className={styles.districtSelectWrapper}>
              <MapPin size={14} className={styles.districtSelectIcon} aria-hidden="true" />
              <select
                className={styles.districtSelect}
                value={selectedDistrict}
                onChange={(e) => handleDistrictSelect(e.target.value)}
                aria-label="Filter hotspots by district"
              >
                {HP_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Band Filter Chips */}
          <div className={styles.topBarCenter}>
            <div className={styles.chipGroup} role="group" aria-label="Filter hotspots by risk band">
              {BAND_FILTERS.map((bf) => {
                const isActive = selectedBand === bf.id;
                const Icon = bf.Icon;
                return (
                  <button
                    key={bf.id}
                    type="button"
                    className={`${styles.bandFilterBtn} ${isActive ? styles.bandFilterBtnActive : ''}`}
                    onClick={() => setSelectedBand(bf.id)}
                    aria-pressed={isActive}
                  >
                    {Icon && <Icon size={13} aria-hidden="true" />}
                    <span>{bf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Freshness Chip, Advisory, GPS & Demo Actions */}
          <div className={styles.topBarRight}>
            {/* Stale / Error Freshness Chip with Retry */}
            {hotspotsError ? (
              <button
                type="button"
                className={styles.freshnessRetryChip}
                onClick={() => refetch?.()}
                aria-label={`Data updated ${timeAgoStr}. Click to retry.`}
              >
                <RotateCcw size={12} aria-hidden="true" />
                <span>Updated {timeAgoStr} · Retry</span>
              </button>
            ) : (
              <span className={styles.freshnessChip}>
                <Clock size={12} aria-hidden="true" />
                <span>Updated {timeAgoStr}</span>
              </span>
            )}

            {/* Advisory chip + popover — replaces the orange banner strip */}
            <div ref={advisoryRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={styles.advisoryChip}
                onClick={() => setAdvisoryOpen((o) => !o)}
                aria-expanded={advisoryOpen}
                aria-haspopup="dialog"
              >
                <Info size={13} aria-hidden="true" />
                <span>Advisory</span>
              </button>
              {advisoryOpen && (
                <div
                  className={styles.advisoryPopover}
                  role="dialog"
                  aria-label="Data advisory"
                >
                  <strong>Data advisory</strong>
                  Community-submitted and AI-assessed. Advisory only. In an emergency call 112.
                </div>
              )}
            </div>

            {/* My Location GPS Button */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleMyLocation}
              disabled={locating}
              aria-label="Center map on my location"
            >
              {locating ? (
                <Loader2
                  size={14}
                  aria-hidden="true"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              ) : (
                <Crosshair size={14} aria-hidden="true" />
              )}
            </button>

            {/* Clearly marked sample data and guided demo */}
            {isDemoMode && (
              <>
                <span className={styles.demoSampleChip}>
                  <span className={styles.sampleDataDot} aria-hidden="true" />
                  Sample data
                </span>
                <button
                  type="button"
                  className={styles.runDemoStoryBtn}
                  onClick={runDemoStory}
                  disabled={isDemoStoryRunning}
                  aria-label="Run demo story. Press D to start or R to replay."
                  title="Run demo story [D] · Replay [R]"
                >
                  {isDemoStoryRunning
                    ? <Loader2 size={14} aria-hidden="true" className={styles.spinIcon} />
                    : <Play size={14} aria-hidden="true" />}
                  <span>{isDemoStoryRunning ? 'Story running' : 'Run demo story'}</span>
                  <span className={styles.demoShortcutKeys} aria-hidden="true">
                    <kbd className={styles.demoShortcutKey}>D</kbd>
                    <kbd className={styles.demoShortcutKey}>R</kbd>
                  </span>
                </button>
              </>
            )}
          </div>
        </GlassPanel>

        {/* Boundary Missing Dev Notice (Only under import.meta.env.DEV) */}
        {districtsNotice && import.meta.env.DEV && !isDemoMode && (
          <div className={styles.devNoticeBanner} role="note">
            <Info size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
            <span>
              <strong>Dev notice:</strong> Boundary outline file missing. Operating with live
              coordinates and no invented boundaries.
            </span>
          </div>
        )}
      </header>

      {analysisVisible && (
        <DemoAnalysisMoment
          onComplete={handleDemoAnalysisComplete}
          scenario={DEMO_STORY_DATA}
        />
      )}

      {/* ── Floating Desktop Left Panel (>= 768px) — Priority list + Alerts ── */}
      <aside className={styles.desktopLeftPanel} aria-label="Hazard monitoring feed">
        <GlassPanel variant="elevated" padding="none" className={styles.sideGlassCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === 'priority'}
                className={`${styles.panelTabBtn} ${panelTab === 'priority' ? styles.panelTabBtnActive : ''}`}
                onClick={() => setPanelTab('priority')}
              >
                <span>Priority zones</span>
                <span className={styles.tabBadge}>{effectiveHotspots.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === 'alerts'}
                className={`${styles.panelTabBtn} ${panelTab === 'alerts' ? styles.panelTabBtnActive : ''}`}
                onClick={() => setPanelTab('alerts')}
              >
                <span>Alerts</span>
                {criticalCount > 0 && (
                  <span className={styles.tabBadge} style={{ background: '#FFF1F0', color: '#B52B2B' }}>
                    {criticalCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            {isFirstLoadError ? (
              <div className={styles.inlineRetryCard} role="alert">
                <div className={styles.retryIconWrap} aria-hidden="true"><AlertCircle size={22} /></div>
                <h3 className={styles.retryTitle}>Unable to load hazard data</h3>
                <p className={styles.retryMessage}>{sanitizedErrorMsg}</p>
                <Button variant="primary" size="sm" onClick={() => refetch?.()}>
                  <RotateCcw size={14} style={{ marginRight: '6px' }} aria-hidden="true" />
                  Retry loading
                </Button>
              </div>
            ) : panelTab === 'priority' ? (
              <PriorityList
                hotspots={filteredHotspots}
                loading={hotspotsLoading && effectiveHotspots.length === 0}
                error={sanitizedErrorMsg && effectiveHotspots.length === 0 ? new Error(sanitizedErrorMsg) : null}
                selectedHotspotId={selectedHotspot?.hotspotId}
                onSelectHotspot={handleFocusHotspot}
                onRefresh={refetch}
              />
            ) : (
              <AlertCenter
                hotspots={filteredHotspots}
                loading={hotspotsLoading && effectiveHotspots.length === 0}
                error={sanitizedErrorMsg && effectiveHotspots.length === 0 ? new Error(sanitizedErrorMsg) : null}
                userLocation={userCoords}
                onFocusHotspot={handleFocusHotspot}
                supportsSubscriptions={false}
              />
            )}
          </div>
        </GlassPanel>
      </aside>

      {/* ── Right Detail Panel (>= 1024px) — hotspot detail only ─────────────── */}
      {selectedHotspot && (
        <aside className={styles.desktopRightPanel} aria-label="Hotspot detail">
          <GlassPanel variant="elevated" padding="none" className={styles.sideGlassCard}>
            <div className={styles.panelHeader}>
              <div className={styles.selectedHotspotHeader}>
                <button
                  type="button"
                  className={styles.backToListBtn}
                  onClick={() => setSelectedHotspot(null)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Back to list</span>
                </button>
                <button
                  type="button"
                  className={styles.panelCloseBtn}
                  onClick={() => setSelectedHotspot(null)}
                  aria-label="Close hotspot detail"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className={styles.panelBody}>
              <HotspotDetailPanel
                hotspot={selectedHotspot}
                matchingReports={matchingReports}
                onNavigateToOfficer={() => navigate('/ward/login')}
              />
            </div>
          </GlassPanel>
        </aside>
      )}

      {/* ── Mobile Bottom Sheet (< 768px) ────────────────────────────────────── */}
      <div className={styles.mobileSheetDock}>
        <div
          className={`${styles.mobileSheetGlass} ${
            sheetExpanded ? styles.mobileSheetExpanded : styles.mobileSheetPeek
          }`}
        >
          {/* Handle bar to toggle peek / expand */}
          <div
            className={styles.sheetHandleBar}
            onClick={() => setSheetExpanded((prev) => !prev)}
            role="button"
            aria-expanded={sheetExpanded}
            aria-label={sheetExpanded ? 'Collapse hazard list' : 'Expand hazard list'}
          >
            <div className={styles.sheetHandlePill} aria-hidden="true" />
          </div>

          {/* Peek Summary Bar */}
          {!sheetExpanded && (
            <div
              className={styles.sheetPeekSummary}
              onClick={() => setSheetExpanded(true)}
              role="button"
            >
              <span>
                {selectedHotspot
                  ? selectedHotspot.wardName || selectedHotspot.district || 'Hotspot selected'
                  : `${effectiveHotspots.length} active hazard zones`}
              </span>
              <span style={{ color: 'var(--color-water)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>View details</span>
                <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
              </span>
            </div>
          )}

          {/* Expanded Sheet Content */}
          {sheetExpanded && (
            <>
              <div className={styles.panelHeader}>
                {selectedHotspot ? (
                  <div className={styles.selectedHotspotHeader}>
                    <button
                      type="button"
                      className={styles.backToListBtn}
                      onClick={() => setSelectedHotspot(null)}
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      <span>Back to list</span>
                    </button>
                    <button
                      type="button"
                      className={styles.panelCloseBtn}
                      onClick={() => setSheetExpanded(false)}
                      aria-label="Collapse sheet"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.panelHeaderTabs} role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={panelTab === 'priority'}
                      className={`${styles.panelTabBtn} ${panelTab === 'priority' ? styles.panelTabBtnActive : ''}`}
                      onClick={() => setPanelTab('priority')}
                    >
                      <span>Priority ({effectiveHotspots.length})</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={panelTab === 'alerts'}
                      className={`${styles.panelTabBtn} ${panelTab === 'alerts' ? styles.panelTabBtnActive : ''}`}
                      onClick={() => setPanelTab('alerts')}
                    >
                      <span>Alerts ({criticalCount})</span>
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.panelBody}>
                {selectedHotspot ? (
                  <HotspotDetailPanel
                    hotspot={selectedHotspot}
                    matchingReports={matchingReports}
                    onNavigateToOfficer={() => navigate('/ward/login')}
                  />
                ) : isFirstLoadError ? (
                  <div className={styles.inlineRetryCard} role="alert">
                    <div className={styles.retryIconWrap} aria-hidden="true">
                      <AlertCircle size={22} />
                    </div>
                    <h3 className={styles.retryTitle}>Unable to load hazard data</h3>
                    <p className={styles.retryMessage}>{sanitizedErrorMsg}</p>
                    <Button variant="primary" size="sm" onClick={() => refetch?.()}>
                      <RotateCcw size={14} style={{ marginRight: '6px' }} aria-hidden="true" />
                      Retry loading
                    </Button>
                  </div>
                ) : panelTab === 'priority' ? (
                  <PriorityList
                    hotspots={filteredHotspots}
                    loading={hotspotsLoading && effectiveHotspots.length === 0}
                    error={sanitizedErrorMsg && effectiveHotspots.length === 0 ? new Error(sanitizedErrorMsg) : null}
                    selectedHotspotId={selectedHotspot?.hotspotId}
                    onSelectHotspot={handleFocusHotspot}
                    onRefresh={refetch}
                  />
                ) : (
                  <AlertCenter
                    hotspots={filteredHotspots}
                    loading={hotspotsLoading && effectiveHotspots.length === 0}
                    error={sanitizedErrorMsg && effectiveHotspots.length === 0 ? new Error(sanitizedErrorMsg) : null}
                    userLocation={userCoords}
                    onFocusHotspot={handleFocusHotspot}
                    supportsSubscriptions={false}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Floating "Report a Hazard" FAB (Bottom-Right, clear of attribution) ─ */}
      <div className={styles.fabContainer}>
        <Button
          variant="primary"
          size="lg"
          className={styles.fabBtn}
          onClick={() => navigate('/app/report')}
        >
          <Camera size={18} aria-hidden="true" style={{ marginRight: '8px' }} />
          Report a hazard
        </Button>
      </div>
    </div>
  );
}
