/**
 * Chip — interactive filter or status chip with icon & text.
 * WCAG 2.5.5 touch target compliant (>= 44x44px).
 */

import React from 'react';
import styles from './Chip.module.css';

export function Chip({
  label,
  icon = null,
  active = false,
  variant = 'default', // 'default' | 'filter' | 'status'
  size = 'md',        // 'sm' | 'md'
  onClick,
  disabled = false,
  badge = null,
  className = '',
  role,
  ...props
}) {
  const isInteractive = Boolean(onClick);
  const Component = isInteractive ? 'button' : 'span';

  const classes = [
    styles.chip,
    styles[variant],
    styles[size],
    active && styles.active,
    isInteractive && styles.interactive,
    disabled && styles.disabled,
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      type={isInteractive ? 'button' : undefined}
      className={classes}
      onClick={disabled ? undefined : onClick}
      disabled={isInteractive ? disabled : undefined}
      role={role || (isInteractive ? (variant === 'filter' ? 'checkbox' : 'button') : 'status')}
      aria-pressed={isInteractive && variant === 'filter' ? active : undefined}
      {...props}
    >
      {icon && <span className={styles.iconWrap} aria-hidden="true">{icon}</span>}
      <span className={styles.label}>{label}</span>
      {badge !== null && badge !== undefined && (
        <span className={styles.badge}>{badge}</span>
      )}
    </Component>
  );
}
