/**
 * StatsPanel — live summary counts derived exclusively from API/demo data.
 * No invented numbers. Every count comes directly from the reports/risk arrays.
 *
 * Props:
 *   reports    array   — from useMapData
 *   risk       array   — from useMapData
 *   loading    bool
 *   isDemoMode bool
 */

import styles from './DelhiMap.module.css';

function Stat({ label, value, sub, accent }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue} style={accent ? { color: accent } : {}}>
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

export function StatsPanel({ reports, risk, loading, isDemoMode }) {
  const total      = reports.length;
  const active     = reports.filter(r => r.opsStatus === 'open' || r.opsStatus === 'dispatched').length;
  const flooded    = reports.filter(r => r.assessment?.passable === 'no').length;
  const analyzing  = reports.filter(r => r.status === 'analyzing').length;
  const highRisk   = risk.filter(r => r.band === 'severe' || r.band === 'high').length;

  return (
    <div className={styles.statsPanel}>
      <div className={styles.statsPanelHeader}>
        <span className={styles.statsPanelTitle}>Live Status</span>
        {isDemoMode && <span className={styles.demoChip}>DEMO</span>}
        {loading && <span className={styles.statsPanelLoading}>●</span>}
      </div>

      {total === 0 && !loading ? (
        <p className={styles.statsEmpty}>No reports in current view</p>
      ) : (
        <div className={styles.statsGrid}>
          <Stat label="Reports"   value={total}    />
          <Stat label="Active"    value={active}   accent={active  > 0 ? '#f97316' : undefined} />
          <Stat label="Flooded"   value={flooded}  accent={flooded > 0 ? '#ef4444' : undefined} />
          <Stat label="Analyzing" value={analyzing} />
        </div>
      )}

      {highRisk > 0 && (
        <div className={styles.riskAlert}>
          <span className={styles.riskAlertDot} />
          <span>{highRisk} high-risk ward{highRisk !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
