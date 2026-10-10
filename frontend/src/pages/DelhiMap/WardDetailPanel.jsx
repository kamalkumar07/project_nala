/**
 * WardDetailPanel — shown when the user clicks a ward polygon or a report pin.
 *
 * Data rules:
 *   • Ward name/number: from GeoJSON properties (always available).
 *   • Flood reports: filtered from API data by wardNo match — never invented.
 *   • Risk: from API risk array by wardId/wardNo match — if absent, says "No data".
 *   • Coordinates: from the click event — real lat/lng.
 *
 * Props:
 *   ward          { Ward_Name, Ward_No } | null
 *   clickLatLng   { lat, lng } | null
 *   reports       array — full API report list
 *   risk          array — full API risk list
 *   onClose       () => void
 *   isDemoMode    bool
 */

import { useMemo } from 'react';
import { X, MapPin, AlertTriangle } from 'lucide-react';
import {
  titleCase, wardBodyLabel, fmtLat, fmtLng,
  RISK_BAND_META, DEPTH_META, PASSABLE_META, relativeTime,
} from '../../utils/mapUtils.js';
import styles from './DelhiMap.module.css';

function RiskBadge({ band }) {
  if (!band) return <span className={styles.noData}>No risk data</span>;
  const m = RISK_BAND_META[band] ?? RISK_BAND_META.low;
  return (
    <span className={styles.riskBadge} style={{ background: m.fill, color: m.color, borderColor: m.stroke }}>
      {m.label}
    </span>
  );
}

function ReportRow({ report }) {
  const a = report.assessment;
  const depth    = a?.depthClass ?? 'unknown';
  const passable = a?.passable   ?? 'unknown';
  const dm = DEPTH_META[depth]    ?? DEPTH_META.unknown;
  const pm = PASSABLE_META[passable] ?? PASSABLE_META.unknown;
  const isDemo = report._demo;

  return (
    <div className={`${styles.reportRow} ${isDemo ? styles.reportRowDemo : ''}`}>
      <div className={styles.reportRowLeft}>
        <span className={styles.reportDepthDot} style={{ background: dm.color }} title={dm.label} />
        <div>
          <span className={styles.reportDepthLabel}>{dm.label}</span>
          {isDemo && <span className={styles.demoTag}> · DEMO</span>}
        </div>
      </div>
      <div className={styles.reportRowRight}>
        <span className={styles.reportPassable} style={{ color: pm.color }}>
          {pm.icon} {pm.label}
        </span>
        <span className={styles.reportTime}>{relativeTime(report.createdAt)}</span>
      </div>
    </div>
  );
}

export function WardDetailPanel({ ward, clickLatLng, reports, risk, onClose, isDemoMode }) {
  // Match reports to this ward
  const wardReports = useMemo(() => {
    if (!ward) return [];
    return reports.filter(r =>
      String(r.wardNo)   === String(ward.Ward_No) ||
      String(r.wardId)   === String(ward.Ward_No) ||
      // fallback: name match (case-insensitive)
      (r.wardName && r.wardName.toUpperCase() === ward.Ward_Name)
    );
  }, [ward, reports]);

  // Match risk to this ward
  const wardRisk = useMemo(() => {
    if (!ward) return null;
    return risk.find(r =>
      String(r.wardNo) === String(ward.Ward_No) ||
      String(r.wardId) === String(ward.Ward_No)
    ) ?? null;
  }, [ward, risk]);

  if (!ward && !clickLatLng) return null;

  const wardName   = ward ? titleCase(ward.Ward_Name) : null;
  const wardNo     = ward?.Ward_No ?? null;
  const bodyLabel  = ward ? wardBodyLabel(wardNo) : null;
  const openCount  = wardReports.filter(r => r.opsStatus === 'open').length;

  return (
    <div className={styles.detailPanel}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailTitleBlock}>
          {wardName ? (
            <>
              <span className={styles.detailWardNo}>{bodyLabel} · Ward {wardNo}</span>
              <h2 className={styles.detailWardName}>{wardName}</h2>
            </>
          ) : (
            <h2 className={styles.detailWardName}>Selected location</h2>
          )}
        </div>
        <button className={styles.detailClose} onClick={onClose} aria-label="Close panel">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Coordinates */}
      {clickLatLng && (
        <div className={styles.detailCoords}>
          <MapPin size={14} aria-hidden="true" />
          <span>{fmtLat(clickLatLng.lat)}</span>
          <span className={styles.coordDivider}>·</span>
          <span>{fmtLng(clickLatLng.lng)}</span>
        </div>
      )}

      {/* Risk */}
      <div className={styles.detailRow}>
        <span className={styles.detailRowLabel}>Risk level</span>
        <RiskBadge band={wardRisk?.band} />
      </div>

      {/* Report counts */}
      <div className={styles.detailRow}>
        <span className={styles.detailRowLabel}>Flood reports</span>
        <span className={styles.detailRowValue}>
          {wardReports.length > 0 ? wardReports.length : <span className={styles.noData}>None in view</span>}
        </span>
      </div>

      {wardReports.length > 0 && (
        <div className={styles.detailRow}>
          <span className={styles.detailRowLabel}>Active</span>
          <span className={styles.detailRowValue}
            style={{ color: openCount > 0 ? '#f97316' : 'inherit' }}>
            {openCount}
          </span>
        </div>
      )}

      {/* Report list */}
      {wardReports.length > 0 ? (
        <div className={styles.reportList}>
          <span className={styles.reportListTitle}>Reports</span>
          {wardReports.slice(0, 6).map(r => (
            <ReportRow key={r.reportId} report={r} />
          ))}
          {wardReports.length > 6 && (
            <p className={styles.reportMore}>+{wardReports.length - 6} more</p>
          )}
        </div>
      ) : (
        <p className={styles.noData} style={{ marginTop: '0.5rem' }}>
          No current flood data for this ward
        </p>
      )}

      {isDemoMode && (
        <p className={styles.demoPanelNote}>
          <AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          Demo mode — data is simulated
        </p>
      )}
    </div>
  );
}
