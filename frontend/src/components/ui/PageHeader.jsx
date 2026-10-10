/**
 * PageHeader — app bar with optional back button and title.
 * Props: title string, onBack () => void | null
 */

import styles from './PageHeader.module.css';

export function PageHeader({ title, onBack }) {
  return (
    <header className={styles.header}>
      {onBack ? (
        <button
          className={styles.back}
          onClick={onBack}
          aria-label="Go back"
        >
          ←
        </button>
      ) : (
        <span className={styles.backPlaceholder} />
      )}
      <h1 className={styles.title}>{title}</h1>
      {/* Right slot kept for symmetry */}
      <span className={styles.rightSlot} />
    </header>
  );
}
