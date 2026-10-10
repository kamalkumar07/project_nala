/**
 * StepLocation.jsx — Step 2: Acquire hazard coordinates.
 *
 * Implements:
 *   • Device browser geolocation (with timeout & retry)
 *   • Tap/click point on an interactive MapLibre GL map
 *   • Himachal Pradesh boundary check ([75.6, 30.4] to [79.0, 33.2])
 *   • Warning banner & explicit confirmation if outside Himachal Pradesh
 *   • Graceful failure handling: permission denied, position unavailable, timeout
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

import { Crosshair, Loader2, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useReportStore } from './useReportStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StepIndicator } from '../../components/ui/StepIndicator.jsx';
import styles from './ReportFlow.module.css';

import { isInsideHimachal } from '../../utils/geoUtils.js';

const HP_CENTER = [77.2, 31.8]; // [lng, lat]

function accuracyLabel(metres) {
  if (!metres) return '';
  if (metres <= 15) return `±${Math.round(metres)} m (high accuracy)`;
  if (metres <= 50) return `±${Math.round(metres)} m (good accuracy)`;
  return `±${Math.round(metres)} m (approximate)`;
}

export function StepLocation() {
  const navigate = useNavigate();
  const {
    lat,
    lng,
    locationLabel,
    outsideHpConfirmed,
    setLocation,
    setOutsideHpConfirmed,
  } = useReportStore();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [outsideHp, setOutsideHp] = useState(false);

  // Initialize boundary check
  useEffect(() => {
    if (lat !== null && lng !== null) {
      setOutsideHp(!isInsideHimachal(lat, lng));
    }
  }, [lat, lng]);

  // Initialize MapLibre GL map for interactive tap selection
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    setWorkerUrl(workerUrl);

    const initialCenter = lat !== null && lng !== null ? [lng, lat] : HP_CENTER;
    const initialZoom = lat !== null && lng !== null ? 10 : 7.2;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-raster-source': {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-raster-layer',
            type: 'raster',
            source: 'osm-raster-source',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      // If coordinates already selected, place marker
      if (lat !== null && lng !== null) {
        markerRef.current = new maplibregl.Marker({ color: '#1688A8' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    });

    // Tap/Click anywhere on map to drop or move pin
    map.on('click', (e) => {
      const { lng: clickedLng, lat: clickedLat } = e.lngLat;
      const roundedLat = Number(clickedLat.toFixed(5));
      const roundedLng = Number(clickedLng.toFixed(5));

      // Update or create marker
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({ color: '#1688A8' })
          .setLngLat([roundedLng, roundedLat])
          .addTo(map);
      } else {
        markerRef.current.setLngLat([roundedLng, roundedLat]);
      }

      setLocation(roundedLat, roundedLng, 'Selected on map');
      setGeoError('');
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng, setLocation]);

  // Request browser geolocation
  function handleDetectGps() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please tap the map instead.');
      return;
    }

    setLocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const roundedLat = Number(latitude.toFixed(5));
        const roundedLng = Number(longitude.toFixed(5));

        setLocation(roundedLat, roundedLng, accuracyLabel(accuracy));
        setLocating(false);

        // Move map and marker
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [roundedLng, roundedLat], zoom: 12 });
          if (!markerRef.current) {
            markerRef.current = new maplibregl.Marker({ color: '#1688A8' })
              .setLngLat([roundedLng, roundedLat])
              .addTo(mapRef.current);
          } else {
            markerRef.current.setLngLat([roundedLng, roundedLat]);
          }
        }
      },
      (err) => {
        setLocating(false);
        const messages = {
          1: 'Location permission was denied. Tap any point on the map below to place a pin.',
          2: 'GPS position unavailable. Try moving to an open area or tap the map directly.',
          3: 'Location acquisition timed out. Please retry or tap the map.',
        };
        setGeoError(messages[err.code] || 'Could not detect device location. Please tap the map.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const hasCoords = lat !== null && lng !== null;
  const canProceed = hasCoords && (!outsideHp || outsideHpConfirmed);

  return (
    <div className={styles.flow}>
      <PageHeader title="Report a hazard" onBack={() => navigate('/report')} />
      <StepIndicator total={3} current={2} />

      <main className={styles.body}>
        <h2 className={styles.heading}>Pin the incident location</h2>
        <p className={styles.sub}>
          Use device GPS or tap directly on the map to set the exact hazard location.
        </p>

        {/* Action Button: Detect GPS */}
        <div className={styles.locationActionRow}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDetectGps}
            disabled={locating}
            className={styles.gpsBtn}
          >
            {locating ? (
              <>
                <Loader2 size={16} aria-hidden="true" style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} />
                <span>Acquiring GPS position…</span>
              </>
            ) : (
              <>
                <Crosshair size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
                <span>Use my current location</span>
              </>
            )}
          </Button>
          <span className={styles.orText}>or tap on the map</span>
        </div>

        {/* Error notification */}
        {geoError && (
          <ErrorBanner message={geoError} />
        )}

        {/* ── Interactive Map Picker Canvas ─────────────────────────────────── */}
        <div className={styles.mapPickerWrapper}>
          <div ref={mapContainerRef} className={styles.smallMapCanvas} />
          <div className={styles.mapInstructionChip}>
            <MapPin size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            Tap anywhere to place marker
          </div>
        </div>

        {/* Selected Coordinates Readout */}
        {hasCoords && (
          <div className={styles.selectedCoordsCard}>
            <div className={styles.coordsHeader}>
              <span className={styles.coordsIcon} aria-hidden="true">
                <MapPin size={18} />
              </span>
              <div>
                <p className={styles.coordsText}>
                  {lat}°N, {lng}°E
                </p>
                {locationLabel && (
                  <p className={styles.coordsAccuracy}>{locationLabel}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Outside Himachal Pradesh Warning & Confirm ───────────────────── */}
        {hasCoords && outsideHp && (
          <div className={styles.outsideHpAlert} role="alert">
            <div className={styles.outsideHpContent}>
              <span className={styles.outsideHpIcon} aria-hidden="true">
                <AlertTriangle size={20} />
              </span>
              <div>
                <strong className={styles.outsideHpHeading}>Location outside Himachal Pradesh</strong>
                <p className={styles.outsideHpDesc}>
                  Detected coordinates ({lat}°N, {lng}°E) appear outside the Himachal Pradesh regional boundary.
                  PARVAT prioritizes monsoon emergency hazards in Himachal Pradesh.
                </p>
              </div>
            </div>

            <div className={styles.outsideHpActionRow}>
              <button
                type="button"
                className={`${styles.outsideHpBtn} ${outsideHpConfirmed ? styles.outsideHpBtnConfirmed : ''}`}
                onClick={() => setOutsideHpConfirmed(!outsideHpConfirmed)}
                aria-pressed={outsideHpConfirmed}
              >
                {outsideHpConfirmed ? (
                  <>
                    <CheckCircle2 size={16} aria-hidden="true" style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                    <span>Location confirmed outside HP</span>
                  </>
                ) : (
                  'Confirm and report this location anyway'
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canProceed}
          onClick={() => navigate('/report/review')}
        >
          Next — Hazard details & review →
        </Button>
      </footer>
    </div>
  );
}
