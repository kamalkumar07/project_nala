/**
 * RiskLayerToggle — pill button that shows/hides the risk heat layer.
 * Props:
 *   active  bool
 *   onToggle () => void
 *   count   number  — how many risk segments are loaded
 */

import { CloudRain } from 'lucide-react';
import styles from './MapView.module.css';

export function RiskLayerToggle({ active, onToggle, count }) {
  return (
    <button
      className={`${styles.riskToggle} ${active ? styles.riskToggleActive : ''}`}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`${active ? 'Hide' : 'Show'} risk layer (${count} segments)`}
    >
      <CloudRain size={16} aria-hidden="true" />
      <span>Risk layer</span>
      {count > 0 && (
        <span className={styles.riskBadge} aria-hidden="true">{count}</span>
      )}
    </button>
  );
}
