/**
 * ErrorState — accessible error feedback presentation using Lucide icons.
 * Pairs red warning accent with AlertTriangle icon and text.
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button.jsx';
import styles from './ErrorState.module.css';

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load the requested information. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div className={`${styles.errorState} ${className}`} role="alert">
      <div className={styles.iconWrap} aria-hidden="true">
        <AlertTriangle size={32} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.actionWrap}>
          <Button variant="secondary" size="md" onClick={onRetry}>
            <RotateCcw size={16} style={{ marginRight: '6px' }} aria-hidden="true" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
