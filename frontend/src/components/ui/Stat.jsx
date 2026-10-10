/**
 * Stat — metric stat component featuring tabular numerals and clean labels.
 */

import React from 'react';
import styles from './Stat.module.css';

export function Stat({
  value,
  label,
  subtext,
  icon = null,
  trend = null, // { direction: 'up' | 'down', label: string }
  variant = 'default',
  className = '',
}) {
  return (
    <div className={`${styles.statCard} ${styles[variant]} ${className}`}>
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      </div>
      <div className={styles.valueRow}>
        <span className={`${styles.value} tabular-nums`}>{value}</span>
      </div>
      {(subtext || trend) && (
        <div className={styles.bottomRow}>
          {trend && (
            <span className={`${styles.trend} ${styles[trend.direction]}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.label}
            </span>
          )}
          {subtext && <span className={styles.subtext}>{subtext}</span>}
        </div>
      )}
    </div>
  );
}
