/**
 * HeroPhoneMap.jsx — phone mockup with live mini-map, seeded pins, and arriving hazard report.
 *
 * Requirements:
 *   • Mobile phone chassis with notch/status bar
 *   • Seeded pins appearing in Himachal districts (Kangra, Kullu, Shimla, Mandi)
 *   • Animated report arriving with dropping pin, pulsing ripple, and in-phone alert card
 *   • Pure CSS/SVG, zero heavy libraries, reduced-motion safe
 */

import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, AlertOctagon, Bell, RefreshCw } from 'lucide-react';
import styles from './LandingPage.module.css';

const SEEDED_PINS = [
  { id: 'kangra', name: 'Dharamshala', district: 'Kangra', x: 82, y: 122, band: 'SEVERE', color: '#D64545', score: 92 },
  { id: 'kullu', name: 'Akhara Bazar', district: 'Kullu', x: 142, y: 138, band: 'HIGH', color: '#E5742B', score: 76 },
  { id: 'shimla', name: 'Cart Road', district: 'Shimla', x: 162, y: 192, band: 'MODERATE', color: '#E8A317', score: 48 },
  { id: 'mandi', name: 'Suketi Riverfront', district: 'Mandi', x: 105, y: 172, band: 'HIGH', color: '#E5742B', score: 68 },
];

const DISTRICT_SHAPES = [
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

export function HeroPhoneMap() {
  const [arrivedReport, setArrivedReport] = useState(false);
  const [activePinIndex, setActivePinIndex] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setArrivedReport(true);
      return;
    }

    // Sequence: show seeded pins, then after 1.5s trigger report arriving
    const timer = setTimeout(() => {
      setArrivedReport(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleSimulateNew = () => {
    setArrivedReport(false);
    setActivePinIndex((prev) => (prev + 1) % SEEDED_PINS.length);
    setTimeout(() => {
      setArrivedReport(true);
    }, 600);
  };

  const focusPin = SEEDED_PINS[activePinIndex];

  return (
    <div className={styles.phoneFrameWrapper} aria-label="Live mobile preview of Himachal Pradesh hazard map">
      <div className={styles.phoneChassis}>
        {/* Dynamic Island / Notch */}
        <div className={styles.phoneNotch}>
          <div className={styles.phoneSpeaker} />
          <div className={styles.phoneCameraLens} />
        </div>

        {/* Screen Area */}
        <div className={styles.phoneScreen}>
          {/* App Mini Header */}
          <div className={styles.phoneAppHeader}>
            <div className={styles.phoneAppBrand}>
              <span className={styles.phoneLiveDot} aria-hidden="true" />
              <span>PARVAT · Live HP</span>
            </div>
            <button
              type="button"
              className={styles.phoneSimBtn}
              onClick={handleSimulateNew}
              title="Simulate incoming report"
              aria-label="Simulate incoming hazard report"
            >
              <RefreshCw size={11} aria-hidden="true" />
              <span>New report</span>
            </button>
          </div>

          {/* SVG Vector Map Canvas */}
          <div className={styles.phoneMapCanvas}>
            <svg viewBox="0 0 300 280" className={styles.phoneMapSvg} aria-hidden="true">
              {/* Background terrain gradient */}
              <defs>
                <radialGradient id="heroMapGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1688A8" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0B1F33" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="145" cy="145" rx="130" ry="110" fill="url(#heroMapGlow)" />

              {/* District Outlines */}
              <g>
                {DISTRICT_SHAPES.map((dist) => (
                  <path
                    key={dist.id}
                    d={dist.d}
                    className={`${styles.phoneDistrictPath} ${dist.id === focusPin.district.toLowerCase() ? styles.phoneDistrictActive : ''}`}
                  />
                ))}
              </g>

              {/* Seeded Pins */}
              {SEEDED_PINS.map((pin, idx) => (
                <g key={pin.id} transform={`translate(${pin.x}, ${pin.y})`} className={styles.seededPinGroup}>
                  <circle cx="0" cy="0" r="10" fill={pin.color} opacity="0.25" />
                  <circle cx="0" cy="0" r="5" fill={pin.color} />
                  <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
                  <text
                    x="0"
                    y="-8"
                    textAnchor="middle"
                    fill="#EAF3F9"
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="var(--font-heading)"
                  >
                    {pin.name}
                  </text>
                </g>
              ))}

              {/* Arriving Hazard Report Pin with Radiating Ripple */}
              {arrivedReport && (
                <g transform={`translate(${focusPin.x}, ${focusPin.y})`} className={styles.arrivedPinGroup}>
                  <circle cx="0" cy="0" r="20" fill={focusPin.color} className={styles.arrivingRipple} />
                  <circle cx="0" cy="0" r="12" fill={focusPin.color} className={styles.arrivingRippleDelay} />
                  <circle cx="0" cy="0" r="7" fill={focusPin.color} />
                  <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
                </g>
              )}
            </svg>
          </div>

          {/* Arriving Report In-App Floating Card */}
          {arrivedReport && (
            <div className={styles.phoneAlertCard} role="status" aria-live="polite">
              <div className={styles.phoneAlertTop}>
                <div className={styles.phoneAlertBadge} style={{ background: focusPin.color }}>
                  <AlertOctagon size={10} aria-hidden="true" color="#FFFFFF" />
                  <span>{focusPin.band}</span>
                </div>
                <span className={styles.phoneAlertTime}>Report arrived just now</span>
              </div>
              <strong className={styles.phoneAlertArea}>{focusPin.name}, {focusPin.district}</strong>
              <p className={styles.phoneAlertText}>
                Knee-deep water accumulation. Road impassable for two-wheelers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
