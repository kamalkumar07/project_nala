/**
 * HimachalMiniMap — accessible SVG vector map of Himachal Pradesh districts.
 * Renders district boundaries and animates a hotspot pin based on report coordinates.
 *
 * Fully responsive, no external heavy libraries, pure SVG and CSS.
 */

import { MapPin } from 'lucide-react';
import styles from './LandingPage.module.css';

// Approximate schematic layout for Himachal Pradesh districts in SVG coordinates (viewBox 0 0 320 280)
const DISTRICTS = [
  { id: 'chamba', name: 'Chamba', d: 'M 40,60 L 90,40 L 110,75 L 80,105 L 45,95 Z' },
  { id: 'kangra', name: 'Kangra', d: 'M 45,95 L 80,105 L 115,95 L 120,135 L 75,150 L 50,125 Z' },
  { id: 'lahual', name: 'Lahaul & Spiti', d: 'M 90,40 L 210,30 L 245,100 L 160,115 L 110,75 Z' },
  { id: 'kullu', name: 'Kullu', d: 'M 115,95 L 160,115 L 175,155 L 130,165 L 120,135 Z' },
  { id: 'mandi', name: 'Mandi', d: 'M 75,150 L 120,135 L 130,165 L 140,195 L 90,205 L 70,175 Z' },
  { id: 'kinnaur', name: 'Kinnaur', d: 'M 160,115 L 245,100 L 275,160 L 205,185 L 175,155 Z' },
  { id: 'shimla', name: 'Shimla', d: 'M 130,165 L 175,155 L 205,185 L 180,225 L 140,215 L 140,195 Z' },
  { id: 'hamirpur', name: 'Hamirpur', d: 'M 50,150 L 75,150 L 70,175 L 45,170 Z' },
  { id: 'una', name: 'Una', d: 'M 30,140 L 50,150 L 45,185 L 25,175 Z' },
  { id: 'bilaspur', name: 'Bilaspur', d: 'M 70,175 L 90,205 L 75,225 L 55,200 Z' },
  { id: 'solan', name: 'Solan', d: 'M 90,205 L 140,195 L 140,225 L 100,245 L 80,230 Z' },
  { id: 'sirmaur', name: 'Sirmaur', d: 'M 140,225 L 180,225 L 175,265 L 125,260 Z' },
];

export function HimachalMiniMap({ activePin, activeDistrict = 'kangra' }) {
  // Pin SVG coordinate defaults (mapped to district approximate centers)
  const PIN_COORDS = {
    kangra: { x: 82, y: 122 },
    kullu:  { x: 142, y: 138 },
    shimla: { x: 162, y: 192 },
    mandi:  { x: 105, y: 172 },
  };

  const coords = PIN_COORDS[activeDistrict] || PIN_COORDS.kangra;

  return (
    <div className={styles.miniMapWrap} role="img" aria-label={`Himachal Pradesh district map showing hazard pin in ${activeDistrict}`}>
      <svg
        viewBox="0 0 300 280"
        className={styles.miniMapSvg}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1688A8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1688A8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient terrain glow */}
        <ellipse cx="145" cy="145" rx="130" ry="110" fill="url(#mapGlow)" />

        {/* District outlines */}
        <g className={styles.districtGroup}>
          {DISTRICTS.map((dist) => {
            const isActive = dist.id === activeDistrict;
            return (
              <path
                key={dist.id}
                d={dist.d}
                className={`${styles.districtPath} ${isActive ? styles.districtActive : ''}`}
              >
                <title>{dist.name}</title>
              </path>
            );
          })}
        </g>

        {/* District Labels */}
        <g className={styles.mapLabels} fill="var(--color-muted)" fontSize="9" fontFamily="var(--font-heading)" fontWeight="600">
          <text x="60" y="75">Chamba</text>
          <text x="56" y="125">Kangra</text>
          <text x="145" y="70">Lahaul & Spiti</text>
          <text x="130" y="140">Kullu</text>
          <text x="88" y="180">Mandi</text>
          <text x="148" y="200">Shimla</text>
          <text x="200" y="148">Kinnaur</text>
        </g>

        {/* Dynamic Hotspot Pin */}
        {activePin && (
          <g transform={`translate(${coords.x}, ${coords.y})`} className={styles.mapPinGroup}>
            {/* Ripple Pulse Ring */}
            <circle cx="0" cy="0" r="14" className={styles.pinRipple} fill={activePin.color || '#E5742B'} opacity="0.3" />
            <circle cx="0" cy="0" r="7" fill={activePin.color || '#E5742B'} />
            <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
          </g>
        )}
      </svg>

      {/* Coordinate & District Indicator Overlay */}
      <div className={styles.miniMapCaption}>
        <span className={styles.miniMapDistrictName}>
          <MapPin size={14} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }} />
          {activePin?.district || 'Himachal Pradesh'}
        </span>
        <span className={styles.miniMapCoords}>
          {activePin?.coords || '32.10°N, 76.32°E'}
        </span>
      </div>
    </div>
  );
}
