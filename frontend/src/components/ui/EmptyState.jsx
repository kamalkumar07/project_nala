/**
 * EmptyState — clear visual feedback when no items or reports exist.
 * Uses Lucide icons and sentence case exclusively.
 */

import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from './Button.jsx';
import styles from './EmptyState.module.css';

export function EmptyState({
  icon = null,
  title = 'No reports found',
  description = 'There are no active hazard reports matching your criteria.',
  actionLabel,
  onAction,
  className = '',
}) {
  const IconRender = icon || <ClipboardList size={32} aria-hidden="true" />;

  return (
    <div className={`${styles.emptyState} ${className}`} role="status">
      <div className={styles.iconWrap} aria-hidden="true">
        {IconRender}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <div className={styles.actionWrap}>
          <Button variant="secondary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
