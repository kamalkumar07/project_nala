/**
 * AlertBanner.jsx — in-app banner on the map for new HIGH/SEVERE hazard alerts.
 * Uses Lucide MapPin and X icons.
 */

import React from 'react';
import { MapPin, X } from 'lucide-react';
import { RiskBadge } from './RiskBadge.jsx';
import { formatDistance } from '../../utils/geoUtils.js';
import styles from './AlertBanner.module.css';

export function AlertBanner({
  alert,
  onFocus,
  onDismiss,
}) {
  if (!alert) return null;

  const distanceText = formatDistance(alert.distanceKm);

  return (
    <aside
      className={`${styles.bannerContainer} ${alert.severity === 'SEVERE' ? styles.bannerSevere : styles.bannerHigh}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.bannerMain}>
        <div className={styles.headerRow}>
          <div className={styles.badgeWrap}>
            <RiskBadge band={alert.severity} size="sm" />
            {distanceText && (
              <span className={styles.distanceBadge}>
                <MapPin size={12} aria-hidden="true" style={{ marginRight: '3px' }} />
                {distanceText}
              </span>
            )}
          </div>
          <strong className={styles.areaTitle}>{alert.areaName}</strong>
        </div>

        <p className={styles.messageText}>{alert.message}</p>
        <p className={styles.disclaimerText}>
          Community-submitted and AI-assessed. Advisory only. In an emergency call 112.
        </p>
      </div>

      <div className={styles.actionRow}>
        {onFocus && (
          <button
            type="button"
            className={styles.focusBtn}
            onClick={() => onFocus(alert)}
            aria-label={`View ${alert.areaName} on map`}
          >
            View on map →
          </button>
        )}

        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => onDismiss(alert.id)}
          aria-label="Dismiss this warning"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
