/**
 * StepIndicator — horizontal progress dots for multi-step flows.
 * Props: total number, current number (1-based)
 */

import styles from './StepIndicator.module.css';

export function StepIndicator({ total, current }) {
  return (
    <div className={styles.wrap} aria-label={`Step ${current} of ${total}`} role="status">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.dot} ${i + 1 === current ? styles.active : ''} ${i + 1 < current ? styles.done : ''}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
