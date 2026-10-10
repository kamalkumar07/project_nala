/**
 * ErrorBanner — inline error message with Lucide AlertTriangle and optional retry action.
 * Props:
 *   message   string
 *   onRetry   () => void  (optional)
 *   onDismiss () => void  (optional)
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import styles from './ErrorBanner.module.css';

export function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div role="alert" className={styles.banner}>
      <span className={styles.icon} aria-hidden="true">
        <AlertTriangle size={18} />
      </span>
      <p className={styles.text}>{message}</p>
      <div className={styles.actions}>
        {onRetry && (
          <button className={styles.action} onClick={onRetry}>
            Try again
          </button>
        )}
        {onDismiss && (
          <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss error">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
