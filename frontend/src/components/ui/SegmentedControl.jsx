/**
 * SegmentedControl — accessible linear tab / segment switcher.
 * Provides keyboard navigation, 44px touch targets, and smooth transitions.
 */

import React, { useRef } from 'react';
import styles from './SegmentedControl.module.css';

export function SegmentedControl({
  options = [], // [{ id, label, icon, badge }]
  value,
  onChange,
  size = 'md', // 'sm' | 'md'
  ariaLabel = 'Navigation segments',
  className = '',
}) {
  const containerRef = useRef(null);

  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextOpt = options[nextIndex];
      onChange?.(nextOpt.id);
      const buttons = containerRef.current?.querySelectorAll('button');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles[size]} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`${styles.segment} ${isSelected ? styles.selected : ''}`}
            onClick={() => onChange?.(opt.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {opt.icon && <span className={styles.icon} aria-hidden="true">{opt.icon}</span>}
            <span className={styles.label}>{opt.label}</span>
            {opt.badge !== undefined && opt.badge !== null && (
              <span className={styles.badge}>{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
