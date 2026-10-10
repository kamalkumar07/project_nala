/**
 * ReportMapPreview.jsx — interactive map preview for the report flow.
 *
 * Implements:
 *   • Centers on current [lng, lat] or Himachal Pradesh bounds.
 *   • Displays a prominent pin marker at the selected incident coordinates.
 *   • Allows tapping/clicking anywhere on the map to adjust coordinates.
 *   • Muted OSM raster tiles with raster-saturation -0.85 and reduced contrast.
 *   • Loads district outlines from /data/hp-districts.geojson.
 */

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './ReportFlow.module.css';

const HP_CENTER = [77.17, 31.8]; // [lng, lat]
const HP_BOUNDS = [
  [75.6, 30.4],
  [79.0, 33.2],
];

function getMutedMapStyle() {
  const mapName = import.meta.env.VITE_LOCATION_MAP_NAME;
  const apiKey = import.meta.env.VITE_LOCATION_API_KEY;
  const region = import.meta.env.VITE_AWS_REGION ?? 'ap-south-1';

  if (mapName && apiKey) {
    return `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`;
  }

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
        paint: {
          'raster-saturation': -0.85,
          'raster-contrast': -0.1,
          'raster-opacity': 0.95,
        },
      },
    ],
  };
}

export function ReportMapPreview({
  lat,
  lng,
  onLocationSelect,
  interactive = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl(workerUrl);

    const initialCenter =
      lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)
        ? [lng, lat]
        : HP_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMutedMapStyle(),
      center: initialCenter,
      zoom: lat ? 11 : 7.8,
      minZoom: 6,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', async () => {
      // Load districts outline
      try {
        const res = await fetch('/data/hp-districts.geojson');
        if (res.ok) {
          const data = await res.json();
          if (data && data.type === 'FeatureCollection' && !map.getSource('hp-districts-preview')) {
            map.addSource('hp-districts-preview', { type: 'geojson', data });
            map.addLayer({
              id: 'hp-districts-fill-preview',
              type: 'fill',
              source: 'hp-districts-preview',
              paint: {
                'fill-color': '#1688A8',
                'fill-opacity': 0.05,
              },
            });
            map.addLayer({
              id: 'hp-districts-line-preview',
              type: 'line',
              source: 'hp-districts-preview',
              paint: {
                'line-color': '#1688A8',
                'line-width': 1.2,
                'line-opacity': 0.45,
              },
            });
          }
        }
      } catch {
        // non-blocking
      }

      // Add pin marker DOM element
      const el = document.createElement('div');
      el.className = styles.mapPreviewPin;
      el.innerHTML = `
        <div class="${styles.mapPreviewPinPulse}"></div>
        <div class="${styles.mapPreviewPinHead}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
        markerRef.current = new maplibregl.Marker({ element: el, draggable: interactive })
          .setLngLat([lng, lat])
          .addTo(map);

        markerRef.current.on('dragend', () => {
          const newLngLat = markerRef.current.getLngLat();
          onSelectRef.current?.({
            lat: Number(newLngLat.lat.toFixed(5)),
            lng: Number(newLngLat.lng.toFixed(5)),
            label: null,
          });
        });
      }

      // Allow clicking map to reposition pin
      if (interactive) {
        map.on('click', (e) => {
          const { lng: clickLng, lat: clickLat } = e.lngLat;
          const roundedLat = Number(clickLat.toFixed(5));
          const roundedLng = Number(clickLng.toFixed(5));

          if (markerRef.current) {
            markerRef.current.setLngLat([roundedLng, roundedLat]);
          } else {
            markerRef.current = new maplibregl.Marker({ element: el, draggable: true })
              .setLngLat([roundedLng, roundedLat])
              .addTo(map);

            markerRef.current.on('dragend', () => {
              const newLngLat = markerRef.current.getLngLat();
              onSelectRef.current?.({
                lat: Number(newLngLat.lat.toFixed(5)),
                lng: Number(newLngLat.lng.toFixed(5)),
                label: null,
              });
            });
          }

          onSelectRef.current?.({
            lat: roundedLat,
            lng: roundedLng,
            label: null,
          });
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Update marker position when lat/lng change from outside
  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return;
    const map = mapRef.current;

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (map.isStyleLoaded()) {
      map.easeTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 11),
        duration: 600,
      });
    }
  }, [lat, lng]);

  return (
    <div className={`${styles.previewMapContainer} ${className}`}>
      <div ref={containerRef} className={styles.previewMapCanvas} />
      {interactive && (
        <div className={styles.previewMapHint} aria-hidden="true">
          <span>Tap or drag to adjust location</span>
        </div>
      )}
    </div>
  );
}
