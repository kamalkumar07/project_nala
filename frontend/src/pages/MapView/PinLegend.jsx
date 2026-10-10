/**
 * PinLegend — compact legend showing passable colour codes.
 * Positioned bottom-left on the map so it doesn't compete with the FAB.
 */

import { PASSABLE_COLOR, PASSABLE_LABEL } from './pinHelpers.js';
import styles from './MapView.module.css';

export function PinLegend() {
  return (
    <div className={styles.legend} aria-label="Map legend">
      <p className={styles.legendTitle}>Report status</p>
      {Object.entries(PASSABLE_LABEL).map(([key, label]) => (
        <div key={key} className={styles.legendRow}>
          <span
            className={styles.legendDot}
            style={{ background: PASSABLE_COLOR[key] }}
            aria-hidden="true"
          />
          <span className={styles.legendLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}
