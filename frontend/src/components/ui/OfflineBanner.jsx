import React, { useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/useOnline.js';
import { useToast } from './Toast.jsx';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const online = useOnline();
  const toast = useToast();
  const initialMounted = useRef(false);

  useEffect(() => {
    function handleOffline() {
      toast.warn("You're offline — live hazard updates will pause until reconnected.");
    }
    function handleOnline() {
      toast.success('Back online. Live hazard updates restored.');
    }

    // If device was already offline on first mount, notify once
    if (!initialMounted.current) {
      initialMounted.current = true;
      if (!navigator.onLine) {
        toast.warn("You're currently offline — cached data is being displayed.");
      }
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);

  if (online) return null;

  return (
    <div role="status" aria-live="polite" className={styles.bar}>
      <WifiOff size={16} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
      You're offline — changes will resume when reconnected
    </div>
  );
}
