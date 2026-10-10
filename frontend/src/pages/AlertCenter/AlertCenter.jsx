/**
 * AlertCenter.jsx — Citizen warning center and emergency subscription hub.
 *
 * Implements:
 *   • List of nearby hazard alerts sorted by severity then distance
 *   • Each alert has severity RiskBadge, affected area (district/hotspot name),
 *     plain-language message, and timestamp (with exact hover)
 *   • Filter by severity (All, Severe, High, Moderate, Low)
 *   • Empty state: "No alerts near you. We'll show warnings here."
 *   • Subscription opt-in: channel (email/push), radius, minimum severity, contact
 *   • Unsubscribe flow connected to DELETE /api/v1/alerts/subscriptions/:id
 *   • 44px minimum touch targets and WCAG AA AA accessibility
 */

import { useMemo, useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Bell, 
  X, 
  MapPin, 
  Clock, 
  Compass,
  ShieldAlert
} from 'lucide-react';
import { RiskBadge, Button, Skeleton, ErrorState, useToast } from '../../components/ui/index.js';
import { useAlerts } from '../../api/index.js';
import { calculateDistanceKm, formatDistance } from '../../utils/geoUtils.js';
import styles from './AlertCenter.module.css';

const SEVERITY_ORDER = {
  SEVERE: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
  UNKNOWN: 0,
};

const SEVERITY_FILTERS = [
  { id: 'ALL', label: 'All alerts' },
  { id: 'SEVERE', label: 'Severe', Icon: AlertOctagon },
  { id: 'HIGH', label: 'High', Icon: AlertTriangle },
  { id: 'MODERATE', label: 'Moderate', Icon: AlertCircle },
  { id: 'LOW', label: 'Low', Icon: CheckCircle2 },
];

const RADIUS_OPTIONS = [
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
];

function generateAlertMessage(h) {
  const band = h.riskBand || 'UNKNOWN';
  const active = h.activeReports || 0;
  const reportsText = active > 0 ? ` (${active} active citizen report${active !== 1 ? 's' : ''})` : '';

  switch (band) {
    case 'SEVERE':
      return `Critical flood risk: deep water accumulation exceeding waist depth. Road passage impassable, immediate detour advised${reportsText}.`;
    case 'HIGH':
      return `High flood warning: water levels at knee height. Severe hazards for two-wheelers and pedestrians${reportsText}.`;
    case 'MODERATE':
      return `Moderate waterlogging reported: ankle-deep water accumulation causing traffic congestion. Proceed with care.`;
    case 'LOW':
      return `Minor runoff advisory: localized surface water accumulation. Passable with normal caution.`;
    default:
      return `Hazard advisory: monitoring localized monsoon conditions across this sector.`;
  }
}

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '—';
  const diff = Date.now() - time;
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatExactTime(iso) {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  } catch {
    return '—';
  }
}

export function AlertCenter({
  hotspots = [],
  loading = false,
  error = null,
  userLocation = null, // { lat, lng }
  onFocusHotspot,
  supportsSubscriptions = false,
}) {
  const toast = useToast();
  const { subscribe, unsubscribe, loading: subLoading } = useAlerts();

  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  // Subscription state (persisted in localStorage)
  const [activeSub, setActiveSub] = useState(() => {
    try {
      const saved = localStorage.getItem('nalawatch_user_subscription');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [channel, setChannel] = useState('email');
  const [contact, setContact] = useState('');
  const [radiusM, setRadiusM] = useState(1000);
  const [minSeverity, setMinSeverity] = useState('HIGH');
  const [optInOpen, setOptInOpen] = useState(false);
  const [subError, setSubError] = useState('');

  // ── Derive and Sort Alerts ──────────────────────────────────────────────────
  const derivedAlerts = useMemo(() => {
    return hotspots
      .filter((h) => h.riskBand && h.riskBand !== 'UNKNOWN')
      .map((h) => {
        const distanceKm = userLocation
          ? calculateDistanceKm(userLocation.lat, userLocation.lng, h.lat, h.lng)
          : null;

        const areaName =
          h.wardName || (h.wardNo ? `Ward ${h.wardNo}` : h.district || 'Hazard zone');

        return {
          id: `alert_${h.hotspotId}`,
          hotspotId: h.hotspotId,
          severity: h.riskBand,
          areaName,
          district: h.district || 'Himachal Pradesh',
          message: generateAlertMessage(h),
          timestamp: h.lastUpdated,
          distanceKm,
          hotspot: h,
        };
      })
      .sort((a, b) => {
        // 1. Sort by severity first (SEVERE > HIGH > MODERATE > LOW)
        const orderDiff = (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
        if (orderDiff !== 0) return orderDiff;

        // 2. Then sort by distance ascending (closest first)
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;

        // 3. Fallback to newest timestamp
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });
  }, [hotspots, userLocation]);

  // Filter alerts by selected severity
  const filteredAlerts = useMemo(() => {
    if (selectedSeverity === 'ALL') return derivedAlerts;
    return derivedAlerts.filter((a) => a.severity === selectedSeverity);
  }, [derivedAlerts, selectedSeverity]);

  // ── Subscription Handlers ───────────────────────────────────────────────────
  async function handleSubscribe(e) {
    e.preventDefault();
    setSubError('');

    if (!contact.trim()) {
      setSubError(channel === 'email' ? 'Please enter a valid email address.' : 'Push token is required.');
      return;
    }
    if (channel === 'email' && !contact.includes('@')) {
      setSubError('Please enter a valid email address.');
      return;
    }

    const subLat = userLocation?.lat ?? 31.8;
    const subLng = userLocation?.lng ?? 77.2;

    try {
      const res = await subscribe({
        channel,
        contact: contact.trim(),
        lat: subLat,
        lng: subLng,
        radiusM,
      });

      const subRecord = {
        subscriptionId: res?.subscriptionId || `sub_${Date.now()}`,
        channel,
        contact: contact.trim(),
        radiusM,
        minSeverity,
        createdAt: new Date().toISOString(),
      };

      setActiveSub(subRecord);
      localStorage.setItem('nalawatch_user_subscription', JSON.stringify(subRecord));
      setOptInOpen(false);
      setContact('');
      toast.success('Successfully subscribed to nearby hazard alerts!');
    } catch (err) {
      setSubError(err.message || 'Subscription failed. Please retry.');
    }
  }

  async function handleUnsubscribe() {
    if (!activeSub?.subscriptionId) {
      setActiveSub(null);
      localStorage.removeItem('nalawatch_user_subscription');
      return;
    }

    try {
      await unsubscribe(activeSub.subscriptionId);
      setActiveSub(null);
      localStorage.removeItem('nalawatch_user_subscription');
      toast.info('You have unsubscribed from emergency alerts.');
    } catch {
      // Clear locally even if backend mock or network was offline
      setActiveSub(null);
      localStorage.removeItem('nalawatch_user_subscription');
      toast.info('Subscription removed locally.');
    }
  }

  if (error && derivedAlerts.length === 0) {
    return (
      <div className={styles.alertCenterContainer}>
        <ErrorState
          title="Could not load emergency alerts"
          message={error.message || 'We could not connect to the alerts service.'}
          retryLabel="Retry loading alerts"
        />
      </div>
    );
  }

  return (
    <div className={styles.alertCenterContainer}>
      {/* ── Top Header & Proactive Subscription Banner ─────────────────────── */}
      <header className={styles.centerHeader}>
        <div>
          <h2 className={styles.centerTitle}>Emergency Alert Center</h2>
          <p className={styles.centerSub}>
            Live hazard warnings across Himachal Pradesh sorted by severity and proximity.
          </p>
        </div>

        {supportsSubscriptions && (
          <div className={styles.subBanner}>
            {activeSub ? (
              <div className={styles.activeSubCard} role="status">
                <div className={styles.activeSubInfo}>
                  <span className={styles.activeSubIcon}>
                    <Bell size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>Subscribed to {activeSub.channel} alerts</strong>
                    <p className={styles.activeSubDetails}>
                      Notifying {activeSub.contact} within {activeSub.radiusM}m
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnsubscribe}
                  loading={subLoading}
                  className={styles.unsubBtn}
                >
                  Unsubscribe
                </Button>
              </div>
            ) : !optInOpen ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setOptInOpen(true)}
                className={styles.openOptInBtn}
              >
                <Bell size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
                Get nearby hazard alerts
              </Button>
            ) : null}
          </div>
        )}
      </header>

      {/* ── Mandatory Advisory Disclaimer Box ──────────────────────────────── */}
      <div className={styles.advisoryNoticeBox} role="note">
        <div className={styles.advisoryIconWrap} aria-hidden="true">
          <ShieldAlert size={18} />
        </div>
        <p className={styles.advisoryText}>
          <strong>Advisory notice:</strong> Community-submitted and AI-assessed. Advisory only. In an emergency call 112.
        </p>
      </div>

      {/* ── Subscription Opt-in Card ───────────────────────────────────────── */}
      {supportsSubscriptions && !activeSub && optInOpen && (
        <form onSubmit={handleSubscribe} className={styles.optInCard} aria-label="Alert subscription form">
          <div className={styles.optInHeader}>
            <h3 className={styles.optInTitle}>Proactive Early Warning Alerts</h3>
            <button
              type="button"
              className={styles.closeOptInBtn}
              onClick={() => setOptInOpen(false)}
              aria-label="Cancel subscription"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className={styles.optInDescription}>
            Receive immediate notifications whenever new HIGH or SEVERE flood hazards emerge near your position.
          </p>

          {subError && (
            <div className={styles.optInError} role="alert">
              <AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
              {subError}
            </div>
          )}

          <div className={styles.formRow}>
            {/* Channel Selection */}
            <div className={styles.fieldCol}>
              <label htmlFor="channel-select" className={styles.formLabel}>Delivery channel</label>
              <select
                id="channel-select"
                className={styles.formSelect}
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="email">Email notification</option>
                <option value="push">Web push alert</option>
              </select>
            </div>

            {/* Radius Selection */}
            <div className={styles.fieldCol}>
              <label htmlFor="radius-select" className={styles.formLabel}>Notification radius</label>
              <select
                id="radius-select"
                className={styles.formSelect}
                value={radiusM}
                onChange={(e) => setRadiusM(Number(e.target.value))}
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Within {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Severity */}
            <div className={styles.fieldCol}>
              <label htmlFor="severity-select" className={styles.formLabel}>Minimum severity</label>
              <select
                id="severity-select"
                className={styles.formSelect}
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value)}
              >
                <option value="HIGH">High & Severe only (Recommended)</option>
                <option value="ALL">All detected hazards</option>
              </select>
            </div>
          </div>

          {/* Contact Input */}
          <div className={styles.fieldCol}>
            <label htmlFor="contact-input" className={styles.formLabel}>
              {channel === 'email' ? 'Email address' : 'Device notification token'}
            </label>
            <input
              id="contact-input"
              type={channel === 'email' ? 'email' : 'text'}
              className={styles.formInput}
              placeholder={channel === 'email' ? 'name@example.com' : 'Push notification token'}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
            />
          </div>

          <div className={styles.formActions}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={subLoading}
            >
              Confirm subscription →
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setOptInOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Severity Filter Chips ──────────────────────────────────────────── */}
      <div className={styles.filterBar} role="group" aria-label="Filter alerts by severity">
        <span className={styles.filterLabel}>Filter by severity:</span>
        <div className={styles.chipsWrap}>
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterChip} ${selectedSeverity === f.id ? styles.filterChipActive : ''}`}
              onClick={() => setSelectedSeverity(f.id)}
              aria-pressed={selectedSeverity === f.id}
            >
              {f.Icon && <f.Icon size={13} aria-hidden="true" style={{ marginRight: '4px' }} />}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Alerts Feed ────────────────────────────────────────────────────── */}
      <main className={styles.alertsList} role="feed" aria-label="Nearby hazard alerts">
        {loading && filteredAlerts.length === 0 ? (
          <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ padding: '20px', background: 'var(--color-surface, #fff)', borderRadius: '14px', border: '1px solid var(--color-line, #D8E4EA)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Skeleton width={110} height={28} />
                  <Skeleton width={80} height={18} />
                </div>
                <Skeleton width="50%" height={24} />
                <Skeleton width="90%" height={16} />
                <Skeleton width={120} height={36} />
              </div>
            ))}
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const timeAgo = formatRelativeTime(alert.timestamp);
            const exactTime = formatExactTime(alert.timestamp);
            const distance = formatDistance(alert.distanceKm);

            const severityClass =
              alert.severity === 'SEVERE'
                ? styles.cardSevere
                : alert.severity === 'HIGH'
                ? styles.cardHigh
                : alert.severity === 'MODERATE'
                ? styles.cardModerate
                : styles.cardLow;

            return (
              <article
                key={alert.id}
                className={`${styles.alertCard} ${severityClass}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.badgeRow}>
                    <RiskBadge band={alert.severity} size="md" />
                    {distance && (
                      <span className={styles.distanceChip}>
                        <MapPin size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                        {distance}
                      </span>
                    )}
                  </div>

                  <span
                    className={styles.timeTag}
                    title={exactTime}
                    aria-label={`Logged ${timeAgo}. Exact time: ${exactTime}`}
                  >
                    <Clock size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                    {timeAgo}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.alertAreaHeading}>
                    {alert.areaName}
                    <span className={styles.districtSub}> • {alert.district}</span>
                  </h3>
                  <p className={styles.alertMessage}>{alert.message}</p>
                </div>

                <div className={styles.cardFooter}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={styles.focusBtn}
                    onClick={() => onFocusHotspot?.(alert.hotspot)}
                  >
                    Focus on map →
                  </Button>
                </div>
              </article>
            );
          })
        ) : (
          /* ── Exact Required Empty State with Verb CTA ────────────────────── */
          <div className={styles.emptyStateContainer} role="status">
            <span className={styles.emptyIcon} aria-hidden="true">
              <CheckCircle2 size={32} color="#2E9E5B" />
            </span>
            <h3 className={styles.emptyHeading}>No alerts near you. We'll show warnings here.</h3>
            <p className={styles.emptySub}>
              Monitored districts and river basins in your proximity have no active emergency flood warnings.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {selectedSeverity !== 'ALL' ? (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setSelectedSeverity('ALL')}
                >
                  Show all alerts
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onFocusHotspot?.(null)}
                >
                  <Compass size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
                  Explore live map
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
