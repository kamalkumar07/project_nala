/**
 * LayerControl — floating toggle panel for map layers.
 *
 * Props:
 *   layers   { wards, reports, risk, selected } — booleans
 *   onChange (key, value) => void
 *   riskCount  number
 *   reportCount number
 */

import { Map, MapPin, CloudRain, Crosshair } from 'lucide-react';
import styles from './DelhiMap.module.css';

const LAYERS = [
  { key: 'wards',    label: 'Ward boundaries', Icon: Map },
  { key: 'reports',  label: 'Flood reports',   Icon: MapPin },
  { key: 'risk',     label: 'Risk layer',      Icon: CloudRain },
  { key: 'selected', label: 'Selected location', Icon: Crosshair },
];

export function LayerControl({ layers, onChange, riskCount, reportCount }) {
  return (
    <div className={styles.layerControl} role="group" aria-label="Map layer toggles">
      <span className={styles.layerControlTitle}>Layers</span>
      {LAYERS.map(({ key, label, Icon }) => {
        const active = layers[key];
        let badge = null;
        if (key === 'reports' && reportCount > 0) badge = reportCount;
        if (key === 'risk'    && riskCount   > 0) badge = riskCount;

        return (
          <label key={key} className={styles.layerRow}>
            <input
              type="checkbox"
              checked={active}
              onChange={e => onChange(key, e.target.checked)}
              className={styles.layerCheck}
            />
            <span className={styles.layerIcon}>
              <Icon size={14} aria-hidden="true" />
            </span>
            <span className={styles.layerLabel}>{label}</span>
            {badge && <span className={styles.layerBadge}>{badge}</span>}
          </label>
        );
      })}
    </div>
  );
}
