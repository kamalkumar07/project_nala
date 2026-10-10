/**
 * ReportDetailSheet — bottom drawer that slides up when a map pin is tapped.
 *
 * Props:
 *   report   object | null   — the full report from _raw JSON
 *   onClose  () => void
 *
 * Renders: depth badge, passable pill, confidence bar, rationale, and a
 * "View full result" link that navigates to /result?id=<reportId>.
 */

import { useNavigate }  from 'react-router-dom';
import { 
  X, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle 
} from 'lucide-react';
import {
  PASSABLE_COLOR, PASSABLE_LABEL,
  DEPTH_LABEL,
} from './pinHelpers.js';
import styles from './MapView.module.css';

function ConfBar({ confidence }) {
  const pct = Math.round((confidence ?? 0) * 100);
  const color =
    pct >= 75 ? '#16a34a' :
    pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className={styles.sheetConfWrap}>
      <div className={styles.sheetConfLabel}>
        <span>Confidence</span>
        <span style={{ fontWeight: 700 }}>{pct}%</span>
      </div>
      <div className={styles.sheetConfTrack}>
        <div
          className={styles.sheetConfFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function ReportDetailSheet({ report, onClose }) {
  const navigate = useNavigate();

  if (!report) return null;

  const a         = report.assessment ?? {};
  const passable  = a.passable  ?? 'unknown';
  const depth     = a.depthClass ?? 'unknown';
  const created   = report.createdAt
    ? new Date(report.createdAt).toLocaleString()
    : '—';

  return (
    /* Backdrop */
    <div
      className={styles.sheetBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Report detail"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet panel */}
      <div className={styles.sheet}>
        {/* Drag handle */}
        <div className={styles.sheetHandle} aria-hidden="true" />

        {/* Close */}
        <button
          className={styles.sheetClose}
          onClick={onClose}
          aria-label="Close detail"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Header row */}
        <div className={styles.sheetHeader}>
          <span
            className={styles.sheetDepthBadge}
            data-depth={depth}
          >
            {DEPTH_LABEL[depth]}
          </span>
          <span
            className={styles.sheetPassPill}
            style={{
              background: PASSABLE_COLOR[passable] + '22',
              color: PASSABLE_COLOR[passable],
              borderColor: PASSABLE_COLOR[passable],
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {passable === 'yes' && <CheckCircle2 size={14} aria-hidden="true" />}
            {passable === 'caution' && <AlertTriangle size={14} aria-hidden="true" />}
            {passable === 'no' && <AlertOctagon size={14} aria-hidden="true" />}
            {passable === 'unknown' && <HelpCircle size={14} aria-hidden="true" />}
            {PASSABLE_LABEL[passable]}
          </span>
        </div>

        {/* Confidence */}
        {a.confidence != null && <ConfBar confidence={a.confidence} />}

        {/* Rationale */}
        {a.rationale && (
          <p className={styles.sheetRationale}>
            <span className={styles.sheetRationaleLabel}>AI note: </span>
            {a.rationale}
          </p>
        )}

        {/* Meta */}
        <p className={styles.sheetMeta} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} aria-hidden="true" />
            Ward {report.wardId ?? '—'}
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} aria-hidden="true" />
            {created}
          </span>
        </p>

        {/* CTA */}
        <button
          className={styles.sheetCta}
          onClick={() => navigate(`/result?id=${report.reportId}`)}
        >
          View full result & confirm assessment →
        </button>
      </div>
    </div>
  );
}
