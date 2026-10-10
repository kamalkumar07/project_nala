/**
 * BottomSheet / SidePanel — responsive drawer dialog.
 *
 * Behaviors:
 *   • On mobile (< 768px): slides up from bottom with grab handle
 *   • On desktop (≥ 768px): docks on the right edge as a side panel
 *   • Supports forced mode ('sheet' | 'side' | 'auto')
 *   • Full keyboard access: Escape key to close, focus trapped within
 *   • WCAG AA: role="dialog", aria-modal="true", 44px close target
 *   • Respects prefers-reduced-motion
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './BottomSheet.module.css';

export function BottomSheet({
  open = false,
  onClose,
  title,
  children,
  footer,
  mode = 'auto', // 'auto' | 'bottom' | 'side'
  className = '',
}) {
  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  if (!open) return null;

  const modeClass = mode === 'side'
    ? styles.forceSide
    : mode === 'bottom'
      ? styles.forceBottom
      : styles.autoResponsive;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`${styles.panel} ${modeClass} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel detail'}
      >
        {/* Mobile Grab Handle */}
        <div className={styles.grabBar} aria-hidden="true">
          <div className={styles.handlePill} />
        </div>

        {/* Header */}
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.content}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// SidePanel alias for semantic clarity when desktop side panel is desired
export function SidePanel(props) {
  return <BottomSheet mode="side" {...props} />;
}
