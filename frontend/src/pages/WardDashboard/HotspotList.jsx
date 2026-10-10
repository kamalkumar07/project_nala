/**
 * HotspotList — ranked pump-dispatch priority cards.
 *
 * Each card shows:
 *   • Rank badge (1, 2, 3…)
 *   • Risk score bar  (colour-coded: green/amber/orange/red)
 *   • Open report count
 *   • Time since latest report
 *   • Segment / ward ID
 *
 * Props:
 *   hotspots   array   — from GET /api/v1/ward/hotspots
 *   loading    bool
 *   error      Error | null
 *   onRetry    () => void
 */

import { CheckCircle2, RotateCcw } from 'lucide-react';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import styles from './WardDashboard.module.css';

const BAND_COLORS = {
  severe:   { bar: '#ef4444', bg: '#fef2f2', label: 'Severe'   },
  high:     { bar: '#f97316', bg: '#fff7ed', label: 'High'     },
  moderate: { bar: '#fbbf24', bg: '#fefce8', label: 'Moderate' },
  low:      { bar: '#22c55e', bg: '#f0fdf4', label: 'Low'      },
};

function scoreToBand(score) {
  if (score >= 0.75) return 'severe';
  if (score >= 0.5)  return 'high';
  if (score >= 0.25) return 'moderate';
  return 'low';
}

function relativeTime(isoString) {
  if (!isoString) return '—';
  const time = new Date(isoString).getTime();
  if (!Number.isFinite(time)) return '—';
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

function HotspotCard({ spot }) {
  const isFiniteScore = Number.isFinite(spot.score);
  const pct  = isFiniteScore ? Math.round(spot.score * 100) : '—';
  const band = scoreToBand(isFiniteScore ? spot.score : 0);
  const meta = BAND_COLORS[band] ?? BAND_COLORS.low;
  const openReports = Number.isFinite(spot.openReports) ? spot.openReports : '—';

  return (
    <div
      className={styles.hotspotCard}
      style={{ background: meta.bg, borderLeftColor: meta.bar }}
      aria-label={`Rank ${spot.rank}: risk score ${pct}%`}
    >
      {/* Rank badge */}
      <div className={styles.hotspotRank} style={{ background: meta.bar }}>
        #{spot.rank}
      </div>

      {/* Score + bar */}
      <div className={styles.hotspotMain}>
        <div className={styles.hotspotScoreRow}>
          <span className={styles.hotspotScoreLabel}>Risk score</span>
          <span className={styles.hotspotScoreValue} style={{ color: meta.bar }}>
            {pct}% <span className={styles.hotspotBand}>({meta.label})</span>
          </span>
        </div>
        <div className={styles.hotspotTrack}>
          <div
            className={styles.hotspotFill}
            style={{ width: `${isFiniteScore ? pct : 0}%`, background: meta.bar }}
          />
        </div>

        {/* Meta row */}
        <div className={styles.hotspotMeta}>
          <span>
            <strong>{openReports}</strong> open report{openReports !== 1 ? 's' : ''}
          </span>
          <span>Last: {relativeTime(spot.latestReportAt)}</span>
          {spot.segmentId && (
            <span className={styles.hotspotSeg}>{spot.segmentId}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HotspotList({ hotspots, loading, error, onRetry }) {
  if (loading && hotspots.length === 0) {
    return (
      <div className={styles.hotspotList} aria-busy="true">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={styles.hotspotCard}
            style={{ opacity: 0.6, background: '#f8fafc', borderLeftColor: '#cbd5e1' }}
          >
            <div className={styles.hotspotRank} style={{ background: '#94a3b8' }}>#—</div>
            <div className={styles.hotspotMain} style={{ width: '100%' }}>
              <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: '40%', marginBottom: 8 }} />
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, width: '100%', marginBottom: 8 }} />
              <div style={{ height: 12, background: '#e2e8f0', borderRadius: 4, width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && hotspots.length === 0) {
    return <ErrorBanner message={error.message || 'Failed to load hotspots. Please retry.'} onRetry={onRetry} />;
  }

  if (hotspots.length === 0) {
    return (
      <div className={styles.emptyBox} role="status">
        <CheckCircle2 size={32} color="#2E9E5B" aria-hidden="true" />
        <p>No hotspots detected in your ward right now.</p>
        <button
          onClick={onRetry}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            minHeight: '44px',
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-line, #D8E4EA)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Refresh hotspots</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.hotspotList}>
      {error && (
        <ErrorBanner message={error.message} onRetry={onRetry} />
      )}
      {hotspots.map((spot) => (
        <HotspotCard key={spot.segmentId ?? spot.rank} spot={spot} />
      ))}
    </div>
  );
}
