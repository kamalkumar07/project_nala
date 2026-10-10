/**
 * AlertOptIn — self-contained alert subscription widget.
 *
 * States:
 *   idle        — collapsed teaser; "Get alerts" CTA
 *   expanded    — channel (email/push) + contact field + radius slider + location
 *   locating    — Geolocation API in progress
 *   submitting  — POST /api/v1/alerts/subscriptions in flight
 *   subscribed  — success; shows subscriptionId + "Unsubscribe" link
 *   unsubscribing — DELETE in flight
 *   error       — last error with retry/dismiss
 *
 * The component is fully self-contained so it can be dropped into any page.
 * It persists the subscriptionId in component state only (not localStorage)
 * — appropriate for a one-session demo; production would use a persistent store.
 *
 * Props:
 *   defaultLat   number | undefined  — pre-fill from the report location
 *   defaultLng   number | undefined
 */

import { useState, useRef } from 'react';
import { Bell, Mail, Smartphone, CheckCircle2, MapPin } from 'lucide-react';
import { createSubscription, deleteSubscription } from '../../services/api.js';
import { Spinner }     from './Spinner.jsx';
import { ErrorBanner } from './ErrorBanner.jsx';
import styles from './AlertOptIn.module.css';

const RADIUS_OPTIONS = [
  { value: 500,   label: '500 m' },
  { value: 1000,  label: '1 km'  },
  { value: 2000,  label: '2 km'  },
  { value: 5000,  label: '5 km'  },
];

export function AlertOptIn({ defaultLat, defaultLng }) {
  const [phase,    setPhase]    = useState('idle');
  const [channel,  setChannel]  = useState('email');
  const [contact,  setContact]  = useState('');
  const [radiusM,  setRadiusM]  = useState(1000);
  const [lat,      setLat]      = useState(defaultLat ?? null);
  const [lng,      setLng]      = useState(defaultLng ?? null);
  const [locLabel, setLocLabel] = useState(
    defaultLat != null ? 'Using report location' : null,
  );
  const [subId,    setSubId]    = useState(null);   // subscriptionId after success
  const [error,    setError]    = useState('');

  const abortRef = useRef(null);

  // ── Location ──────────────────────────────────────────────────────────────

  function requestLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setPhase('locating');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        const acc = Math.round(pos.coords.accuracy);
        setLocLabel(`Current location (±${acc} m)`);
        setPhase('expanded');
      },
      (err) => {
        const msgs = {
          1: 'Location access denied. Enable it in your browser settings.',
          2: 'Location unavailable — try again.',
          3: 'Location request timed out.',
        };
        setError(msgs[err.code] ?? 'Could not get location.');
        setPhase('expanded');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────

  async function handleSubscribe(e) {
    e.preventDefault();
    setError('');

    // Validate contact
    if (!contact.trim()) {
      setError(channel === 'email' ? 'Please enter your email address.' : 'Contact value is required.');
      return;
    }
    if (channel === 'email' && !contact.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    // Location is required
    if (lat == null || lng == null) {
      setError('We need your location to send nearby alerts. Tap "Detect location" first.');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('submitting');
    try {
      const sub = await createSubscription(
        { channel, contact: contact.trim(), lat, lng, radiusM },
        controller.signal,
      );
      setSubId(sub.subscriptionId);
      setPhase('subscribed');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message ?? 'Could not subscribe. Please try again.');
      setPhase('expanded');
    }
  }

  // ── Unsubscribe ───────────────────────────────────────────────────────────

  async function handleUnsubscribe() {
    if (!subId) return;
    setPhase('unsubscribing');
    setError('');
    try {
      await deleteSubscription(subId);
      // Reset to idle so the user can re-subscribe if they want
      setSubId(null);
      setContact('');
      setPhase('idle');
    } catch (err) {
      setError(err.message ?? 'Could not unsubscribe. Please try again.');
      setPhase('subscribed');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Subscribed state ──────────────────────────────────────────────────────
  if (phase === 'subscribed' || phase === 'unsubscribing') {
    return (
      <div className={styles.card}>
        <div className={styles.successRow}>
          <span className={styles.successIcon} aria-hidden="true"><Bell size={20} /></span>
          <div>
            <p className={styles.successTitle}>You're subscribed!</p>
            <p className={styles.successSub}>
              We'll alert you when a flood is reported within{' '}
              {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`} of
              your location via {channel === 'email' ? `email (${contact})` : 'web push'}.
            </p>
          </div>
        </div>

        {error && (
          <ErrorBanner message={error} onDismiss={() => setError('')} />
        )}

        <button
          className={styles.unsubLink}
          onClick={handleUnsubscribe}
          disabled={phase === 'unsubscribing'}
          aria-label="Unsubscribe from flood alerts"
        >
          {phase === 'unsubscribing'
            ? <><Spinner size={12} color="currentColor" /> Unsubscribing…</>
            : 'Unsubscribe from alerts'}
        </button>
      </div>
    );
  }

  // ── Idle teaser ───────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className={styles.teaser}>
        <span className={styles.teaserIcon} aria-hidden="true"><Bell size={20} /></span>
        <div className={styles.teaserText}>
          <p className={styles.teaserTitle}>Get flood alerts near you</p>
          <p className={styles.teaserSub}>
            We'll notify you when a new flood is reported in your area.
          </p>
        </div>
        <button
          className={styles.teaserBtn}
          onClick={() => {
            setPhase('expanded');
            // If we have a location from the report, skip geo prompt
            if (lat == null) requestLocation();
          }}
        >
          Set up
        </button>
      </div>
    );
  }

  // ── Locating ──────────────────────────────────────────────────────────────
  if (phase === 'locating') {
    return (
      <div className={styles.card}>
        <div className={styles.locatingRow} aria-live="polite">
          <Spinner size={20} />
          <span>Getting your location…</span>
        </div>
      </div>
    );
  }

  // ── Expanded form (also used during submitting) ───────────────────────────
  return (
    <div className={styles.card}>
      <h3 className={styles.formTitle}>
        <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}><Bell size={18} /></span> Get flood alerts
      </h3>
      <p className={styles.formSub}>
        Choose how you want to be notified when floods are reported near you.
      </p>

      <form onSubmit={handleSubscribe} noValidate>
        {/* ── Channel toggle ─────────────────────────────────────────── */}
        <div
          className={styles.channelGroup}
          role="radiogroup"
          aria-label="Alert channel"
        >
          {['email', 'push'].map((ch) => (
            <button
              key={ch}
              type="button"
              role="radio"
              aria-checked={channel === ch}
              className={`${styles.channelBtn} ${channel === ch ? styles.channelActive : ''}`}
              onClick={() => setChannel(ch)}
            >
              {ch === 'email' ? (
                <><Mail size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Email</>
              ) : (
                <><Smartphone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Web Push</>
              )}
            </button>
          ))}
        </div>

        {/* ── Contact input ──────────────────────────────────────────── */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="alert-contact">
            {channel === 'email' ? 'Email address' : 'Push endpoint / identifier'}
          </label>
          <input
            id="alert-contact"
            type={channel === 'email' ? 'email' : 'text'}
            className={styles.input}
            placeholder={channel === 'email' ? 'you@example.com' : 'Paste your push subscription URL'}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            autoComplete={channel === 'email' ? 'email' : 'off'}
            disabled={phase === 'submitting'}
            required
          />
        </div>

        {/* ── Radius selector ───────────────────────────────────────── */}
        <div className={styles.field}>
          <span className={styles.label}>Alert radius</span>
          <div className={styles.radiusGroup} role="radiogroup" aria-label="Alert radius">
            {RADIUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={radiusM === value}
                className={`${styles.radiusBtn} ${radiusM === value ? styles.radiusActive : ''}`}
                onClick={() => setRadiusM(value)}
                disabled={phase === 'submitting'}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Location row ──────────────────────────────────────────── */}
        <div className={styles.locationRow}>
          <span className={styles.locationIcon} aria-hidden="true">
            {lat != null ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
          </span>
          <span className={styles.locationText}>
            {locLabel ?? 'Location not set'}
          </span>
          {lat == null && (
            <button
              type="button"
              className={styles.detectBtn}
              onClick={requestLocation}
              disabled={phase === 'submitting'}
            >
              Detect
            </button>
          )}
          {lat != null && (
            <button
              type="button"
              className={styles.detectBtn}
              onClick={requestLocation}
              disabled={phase === 'submitting'}
            >
              Re-detect
            </button>
          )}
        </div>

        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError('')}
          />
        )}

        {/* ── Submit ────────────────────────────────────────────────── */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={phase === 'submitting'}
          aria-busy={phase === 'submitting'}
        >
          {phase === 'submitting'
            ? <><Spinner size={16} color="#fff" /> Subscribing…</>
            : <><Bell size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Subscribe to alerts</>}
        </button>

        {/* ── Cancel ────────────────────────────────────────────────── */}
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => { setPhase('idle'); setError(''); }}
          disabled={phase === 'submitting'}
        >
          Not now
        </button>
      </form>
    </div>
  );
}
