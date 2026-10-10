/**
 * Card — versatile container surface matching PARVAT design tokens.
 *
 * Features:
 *   • 14px border radius
 *   • Soft shadow and subtle line border
 *   • Interactive hover effect when onClick is supplied
 *   • Sentence case semantic content
 */

import styles from './Card.module.css';

export function Card({
  children,
  variant = 'default', // 'default' | 'elevated' | 'flat' | 'muted'
  interactive = false,
  onClick,
  className = '',
  padding = 'md', // 'none' | 'sm' | 'md' | 'lg'
  ...rest
}) {
  const isClickable = interactive || Boolean(onClick);

  const classes = [
    styles.card,
    styles[variant],
    styles[`pad-${padding}`],
    isClickable ? styles.interactive : '',
    className,
  ].filter(Boolean).join(' ');

  if (isClickable) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(e);
          }
        }}
        className={classes}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
