/**
 * Skeleton — accessible loading placeholder shimmer.
 *
 * Props:
 *   variant: 'text' | 'rect' | 'circle' | 'card'
 *   width:   css string (e.g. '100%', '80px')
 *   height:  css string (e.g. '16px', '120px')
 *   count:   number of lines to render (for text variant)
 */

import styles from './Skeleton.module.css';

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  style = {},
  ...rest
}) {
  const customStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  if (count > 1 && variant === 'text') {
    return (
      <div className={styles.stack} aria-busy="true" aria-label="Loading content">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${styles.text} ${className}`}
            style={{
              ...customStyle,
              width: i === count - 1 ? '70%' : (width || '100%'),
            }}
            {...rest}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={customStyle}
      aria-busy="true"
      aria-label="Loading content"
      {...rest}
    />
  );
}
