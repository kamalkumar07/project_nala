/**
 * DepthGauge v2 — Visual representation of estimated water depth
 * against an anatomical human silhouette with an animated waterline,
 * clear metric reference heights, and rich accessible aria-label.
 *
 * Props:
 *   depthClass: 'ankle' | 'knee' | 'waist' | 'unknown'
 *   height:     number (default 180)
 *   showLabels: bool (default true)
 *   className:  string
 */

import React from 'react';
import styles from './DepthGauge.module.css';

const DEPTH_CONFIG = {
  ankle: {
    label: 'Ankle deep',
    metric: '~30 cm',
    levelPct: 22,
    color: 'var(--color-risk-moderate)',
    bgColor: 'rgba(232, 163, 23, 0.22)',
    passability: 'Caution advised for two-wheelers',
    ariaLabel: 'Estimated water depth: Ankle deep (approx. 30 cm). Passable with caution.',
  },
  knee: {
    label: 'Knee deep',
    metric: '~60 cm',
    levelPct: 46,
    color: 'var(--color-risk-high)',
    bgColor: 'rgba(229, 116, 43, 0.25)',
    passability: 'Not passable for two-wheelers; high risk',
    ariaLabel: 'Estimated water depth: Knee deep (approx. 60 cm). Impassable for light vehicles.',
  },
  waist: {
    label: 'Waist deep',
    metric: '>60 cm',
    levelPct: 70,
    color: 'var(--color-risk-severe)',
    bgColor: 'rgba(214, 69, 69, 0.30)',
    passability: 'Dangerous flood surge; route impassable',
    ariaLabel: 'Estimated water depth: Waist deep (greater than 60 cm). Severe flood hazard; impassable.',
  },
  unknown: {
    label: 'Depth undetermined',
    metric: 'Reference unclear',
    levelPct: 0,
    color: 'var(--color-risk-unknown)',
    bgColor: 'rgba(138, 153, 166, 0.15)',
    passability: 'Proceed with extreme caution',
    ariaLabel: 'Estimated water depth: Undetermined due to lack of visible physical scale references.',
  },
};

export function DepthGauge({
  depthClass = 'unknown',
  height = 180,
  showLabels = true,
  className = '',
  animateFill = false,
}) {
  const normClass = String(depthClass || 'unknown').toLowerCase();
  const config = DEPTH_CONFIG[normClass] ?? DEPTH_CONFIG.unknown;
  const isUnknown = normClass === 'unknown';

  const waterY = 160 - (160 * (config.levelPct / 100));

  return (
    <div
      className={`${styles.container} ${className}`}
      role="img"
      aria-label={config.ariaLabel}
    >
      <div
        className={styles.gaugeBox}
        style={{ height: `${height}px`, width: `${Math.round(height * 0.72)}px` }}
      >
        <svg
          className={styles.silhouetteSvg}
          viewBox="0 0 100 160"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* Human silhouette clip path */}
            <clipPath id="depthPersonClipV2">
              {/* Head */}
              <circle cx="50" cy="18" r="11" />
              {/* Torso, Arms & Legs */}
              <path d="M32 37 C32 32 68 32 68 37 L72 70 C72 74 67 74 66 70 L64 52 L61 52 L61 92 L54 92 L54 148 L46 148 L46 92 L39 92 L39 52 L36 52 L34 70 C33 74 28 74 28 70 Z" />
            </clipPath>

            {/* Gradient for water depth fill */}
            <linearGradient id="waterDepthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-water)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--color-water-hover)" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Reference tick lines */}
          <line x1="8" y1="125" x2="92" y2="125" className={styles.refLine} strokeDasharray="3 3" />
          <line x1="8" y1="87"  x2="92" y2="87"  className={styles.refLine} strokeDasharray="3 3" />
          <line x1="8" y1="48"  x2="92" y2="48"  className={styles.refLine} strokeDasharray="3 3" />

          {/* Reference labels on side */}
          <text x="4" y="123" className={styles.refLabel}>Ankle</text>
          <text x="4" y="85"  className={styles.refLabel}>Knee</text>
          <text x="4" y="46"  className={styles.refLabel}>Waist</text>

          {/* Silhouette Base Body (Neutral Line) */}
          <g fill="var(--color-line)" className={styles.silhouetteBase}>
            <circle cx="50" cy="18" r="11" />
            <path d="M32 37 C32 32 68 32 68 37 L72 70 C72 74 67 74 66 70 L64 52 L61 52 L61 92 L54 92 L54 148 L46 148 L46 92 L39 92 L39 52 L36 52 L34 70 C33 74 28 74 28 70 Z" />
          </g>

          {/* Submerged Water Volume clipped to silhouette */}
          {!isUnknown && config.levelPct > 0 && (
            <g clipPath="url(#depthPersonClipV2)">
              <rect
                x="0"
                y={waterY}
                width="100"
                height={160 - waterY}
                fill="url(#waterDepthGrad)"
                className={`${styles.waterVolume} ${animateFill ? styles.waterVolumeEntering : ''}`}
                data-testid={animateFill ? 'depth-fill-animated' : undefined}
              />
            </g>
          )}

          {/* Oscillating Waterline Wave */}
          {!isUnknown && config.levelPct > 0 && (
            <g className={styles.waveGroup}>
              <g className={animateFill ? styles.waterlineEntering : undefined}>
                <path
                  d={`M 15 ${waterY} Q 35 ${waterY - 3}, 50 ${waterY} T 85 ${waterY}`}
                  className={styles.waterlineWave}
                  stroke="var(--color-water)"
                  strokeWidth="2.5"
                  fill="none"
                />
              </g>
            </g>
          )}
        </svg>

        {/* Floating Marker Badge */}
        <div
          className={styles.markerBadge}
          style={{
            bottom: isUnknown ? '16%' : `${Math.min(85, Math.max(12, config.levelPct))}%`,
            borderColor: config.color,
          }}
          aria-hidden="true"
        >
          <span className={styles.markerDot} style={{ background: config.color }} />
          <span className={styles.markerText}>{config.label} ({config.metric})</span>
        </div>
      </div>

      {showLabels && (
        <div className={styles.summaryCaption}>
          <strong className={styles.captionTitle} style={{ color: config.color }}>
            {config.label}
          </strong>
          <span className={styles.captionSub}>
            {config.metric} &middot; {config.passability}
          </span>
        </div>
      )}
    </div>
  );
}
