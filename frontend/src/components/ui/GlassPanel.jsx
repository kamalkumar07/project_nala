/**
 * GlassPanel — blurred translucent surface container.
 * Seamlessly adapts to standard and [data-theme="ops"] dark themes.
 */

import React from 'react';
import styles from './GlassPanel.module.css';

export function GlassPanel({
  as: Component = 'div',
  variant = 'default', // 'default' | 'elevated' | 'subtle'
  padding = 'md', // 'none' | 'sm' | 'md' | 'lg'
  children,
  className = '',
  style = {},
  ...props
}) {
  const classes = [
    styles.glassPanel,
    styles[variant],
    styles[`pad_${padding}`],
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component className={classes} style={style} {...props}>
      {children}
    </Component>
  );
}
