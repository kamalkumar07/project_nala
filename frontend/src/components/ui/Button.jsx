/**
 * Button — primary action button, mobile-first.
 *
 * Props:
 *   variant   "primary" | "secondary" | "danger" | "ghost"
 *   size      "md" (default) | "lg" | "sm"
 *   loading   bool — shows spinner, disables interaction
 *   fullWidth bool — stretches to container width
 *   disabled  bool
 *   ...rest   forwarded to <button>
 */

import { Spinner } from './Spinner.jsx';
import styles from './Button.module.css';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  children,
  ...rest
}) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className={styles.spinnerWrap} aria-hidden="true">
          <Spinner size={size === 'sm' ? 14 : 18} color="currentColor" />
        </span>
      )}
      <span className={loading ? styles.hiddenText : undefined}>{children}</span>
    </button>
  );
}
