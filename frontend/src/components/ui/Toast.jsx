/**
 * Toast — accessible notification system with Lucide icons.
 * Pairs icon and message for full WCAG AA accessibility.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

function ToastIcon({ type }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 size={18} className={styles.iconSvg} aria-hidden="true" />;
    case 'error':
      return <AlertOctagon size={18} className={styles.iconSvg} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle size={18} className={styles.iconSvg} aria-hidden="true" />;
    case 'info':
    default:
      return <Info size={18} className={styles.iconSvg} aria-hidden="true" />;
  }
}

export function Toast({
  id,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  message,
  onDismiss,
  duration = 4000,
}) {
  useEffect(() => {
    if (!duration || duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss?.(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const isAlert = type === 'error' || type === 'warning';

  if (typeof message === 'object' && message !== null) {
    const {
      title,
      areaName,
      message: textMessage,
      time = 'Just now',
      onAction,
      actionLabel = 'Focus on map',
    } = message;

    return (
      <div
        className={`${styles.notificationToast} ${styles[type]}`}
        role={isAlert ? 'alert' : 'status'}
        aria-live={isAlert ? 'assertive' : 'polite'}
      >
        <div className={styles.notifHeader}>
          <div className={styles.notifBrand}>
            <span className={styles.iconWrap}>
              <ToastIcon type={type} />
            </span>
            <span>Emergency hazard alert</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={styles.notifTime}>{time}</span>
            {onDismiss && (
              <button
                type="button"
                className={styles.dismissBtn}
                onClick={() => onDismiss(id)}
                aria-label="Dismiss notification"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <h4 className={styles.notifTitle}>
          {title || areaName || 'Hazard advisory'}
          {areaName && title && title !== areaName ? ` • ${areaName}` : ''}
        </h4>

        {textMessage && <p className={styles.notifMessage}>{textMessage}</p>}

        <p className={styles.notifDisclaimer}>
          Community-submitted and AI-assessed. Advisory only. In an emergency call 112.
        </p>

        {onAction && (
          <div className={styles.notifActions}>
            <button
              type="button"
              className={styles.notifActionBtn}
              onClick={() => {
                onAction();
                onDismiss?.(id);
              }}
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${styles.toast} ${styles[type]}`}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
    >
      <span className={styles.iconWrap}>
        <ToastIcon type={type} />
      </span>
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const success = useCallback((msg, dur) => show(msg, 'success', dur), [show]);
  const error   = useCallback((msg, dur) => show(msg, 'error', dur), [show]);
  const warn    = useCallback((msg, dur) => show(msg, 'warning', dur), [show]);
  const info    = useCallback((msg, dur) => show(msg, 'info', dur), [show]);
  const alertNotification = useCallback((options, dur = 8000) => {
    const sev = (options?.severity || '').toLowerCase();
    const type = sev === 'severe' ? 'error' : sev === 'high' ? 'warning' : 'info';
    return show(options, type, dur);
  }, [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, warn, info, alertNotification, dismiss }}>
      {children}
      <div className={styles.toastContainer} aria-label="Notifications" role="region">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            type={t.type}
            message={t.message}
            duration={t.duration}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      alertNotification: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

