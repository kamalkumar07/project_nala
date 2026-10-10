/**
 * RiskBadge — displays hazard risk level pairing color with a Lucide icon and text label.
 * Never relies on color alone to convey meaning (WCAG 1.4.1 AA).
 *
 * Bands:
 *   LOW       #2E9E5B  (CheckCircle2 + Low risk)
 *   MODERATE  #E8A317  (AlertCircle + Moderate risk)
 *   HIGH      #E5742B  (AlertTriangle + High risk)
 *   SEVERE    #D64545  (AlertOctagon + Severe risk)
 *   UNKNOWN   #8A99A6  (HelpCircle + Unknown risk)
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import styles from './RiskBadge.module.css';

export const RISK_META = {
  LOW: {
    label: 'Low risk',
    shortLabel: 'Low',
    IconComponent: CheckCircle2,
    className: 'low',
    color: 'var(--color-risk-low)',
  },
  MODERATE: {
    label: 'Moderate risk',
    shortLabel: 'Moderate',
    IconComponent: AlertCircle,
    className: 'moderate',
    color: 'var(--color-risk-moderate)',
  },
  HIGH: {
    label: 'High risk',
    shortLabel: 'High',
    IconComponent: AlertTriangle,
    className: 'high',
    color: 'var(--color-risk-high)',
  },
  SEVERE: {
    label: 'Severe risk',
    shortLabel: 'Severe',
    IconComponent: AlertOctagon,
    className: 'severe',
    color: 'var(--color-risk-severe)',
  },
  UNKNOWN: {
    label: 'Unknown risk',
    shortLabel: 'Unknown',
    IconComponent: HelpCircle,
    className: 'unknown',
    color: 'var(--color-risk-unknown)',
  },
};

export function normalizeRiskBand(band) {
  if (!band) return 'UNKNOWN';
  const upper = String(band).trim().toUpperCase();
  if (upper === 'LOW') return 'LOW';
  if (upper === 'MODERATE' || upper === 'MEDIUM') return 'MODERATE';
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'SEVERE') return 'SEVERE';
  return 'UNKNOWN';
}

export function RiskBadge({
  band = 'UNKNOWN',
  size = 'md', // 'sm' | 'md' | 'lg'
  short = false,
  showIcon = true,
  className = '',
}) {
  const normalized = normalizeRiskBand(band);
  const meta = RISK_META[normalized] ?? RISK_META.UNKNOWN;
  const labelText = short ? meta.shortLabel : meta.label;
  const Icon = meta.IconComponent;

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  const classes = [
    styles.badge,
    styles[meta.className],
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} role="status" aria-label={meta.label}>
      {showIcon && Icon && (
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon size={iconSize} className={styles.iconSvg} />
        </span>
      )}
      <span className={styles.label}>{labelText}</span>
    </span>
  );
}
