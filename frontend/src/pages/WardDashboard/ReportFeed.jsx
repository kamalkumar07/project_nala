/**
 * ReportFeed — filterable ward report feed with status transition buttons.
 *
 * Status flow (per master doc section 6.4):
 *   open → dispatched → resolved
 *
 * Each report card shows:
 *   • Depth class + passable badge
 *   • Time and ward
 *   • Current ops status chip
 *   • "Next status" action button (advances the state machine)
 *   • Optimistic update: button shows spinner while PATCH is in flight,
 *     reverts on error
 *
 * Props:
 *   reports    array
 *   loading    bool
 *   error      Error | null
 *   onRetry    () => void
 *   onPatch    (reportId, newStatus) => Promise<void>
 *   filter     'all' | 'open' | 'dispatched' | 'resolved'
 *   onFilter   (filter) => void
 */

import { useState } from 'react';
import { useNavigate }  from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  Clock, 
  MapPin, 
  Inbox, 
  RotateCcw 
} from 'lucide-react';
import { ErrorBanner }  from '../../components/ui/ErrorBanner.jsx';
import { Spinner }      from '../../components/ui/Spinner.jsx';
import styles from './WardDashboard.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META = {
  open:       { label: 'Open',       color: '#ef4444', bg: '#fef2f2' },
  dispatched: { label: 'Dispatched', color: '#f97316', bg: '#fff7ed' },
  resolved:   { label: 'Resolved',   color: '#22c55e', bg: '#f0fdf4' },
};

const NEXT_STATUS = { open: 'dispatched', dispatched: 'resolved', resolved: null };
const NEXT_LABEL  = { open: '→ Dispatch pump', dispatched: '→ Mark resolved', resolved: null };

const PASS_ICONS   = { yes: CheckCircle2, caution: AlertTriangle, no: AlertOctagon, unknown: HelpCircle };
const PASS_LABEL   = { yes: 'Passable', caution: 'Caution', no: 'Not passable', unknown: 'Unknown' };

function relativeTime(iso) {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '—';
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

// ── Single report card ─────────────────────────────────────────────────────

function ReportCard({ report, onPatch }) {
  const navigate  = useNavigate();
  const [patching, setPatching] = useState(false);
  const [patchErr, setPatchErr] = useState('');

  const a        = report.assessment ?? {};
  const status   = report.opsStatus ?? 'open';
  const meta     = STATUS_META[status] ?? STATUS_META.open;
  const next     = NEXT_STATUS[status];
  const nextLbl  = NEXT_LABEL[status];

  async function handleAdvance() {
    if (!next) return;
    setPatching(true);
    setPatchErr('');
    try {
      await onPatch(report.reportId, next);
    } catch (err) {
      setPatchErr(err.message ?? 'Status update failed');
    } finally {
      setPatching(false);
    }
  }

  return (
    <div className={styles.reportCard}>
      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className={styles.reportHeader}>
        <span className={styles.reportDepth}>
          {DEPTH_EMOJI[a.depthClass ?? 'unknown']}{' '}
          {a.depthClass ?? 'unknown'} depth
        </span>
        <span
          className={styles.reportStatusChip}
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      {/* ── Passable + meta ─────────────────────────────────────────── */}
      <div className={styles.reportMeta}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {(() => {
            const PassIcon = PASS_ICONS[a.passable ?? 'unknown'] || HelpCircle;
            return <PassIcon size={13} aria-hidden="true" />;
          })()}
          <span>{PASS_LABEL[a.passable ?? 'unknown']}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} aria-hidden="true" />
          <span>{relativeTime(report.createdAt)}</span>
        </span>
        {report.wardId && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} aria-hidden="true" />
            <span>{report.wardId}</span>
          </span>
        )}
      </div>

      {/* ── Rationale ───────────────────────────────────────────────── */}
      {a.rationale && (
        <p className={styles.reportRationale}>{a.rationale}</p>
      )}

      {/* ── Patch error ─────────────────────────────────────────────── */}
      {patchErr && (
        <ErrorBanner
          message={patchErr}
          onDismiss={() => setPatchErr('')}
          onRetry={handleAdvance}
        />
      )}

      {/* ── Actions row ─────────────────────────────────────────────── */}
      <div className={styles.reportActions}>
        {/* View full result */}
        <button
          className={styles.reportViewBtn}
          onClick={() => navigate(`/result?id=${report.reportId}`)}
        >
          View details →
        </button>

        {/* Status advance button */}
        {next && (
          <button
            className={styles.reportAdvanceBtn}
            onClick={handleAdvance}
            disabled={patching}
            aria-label={`${nextLbl} for report ${report.reportId}`}
          >
            {patching ? <Spinner size={14} color="#fff" /> : nextLbl}
          </button>
        )}

        {status === 'resolved' && (
          <span className={styles.resolvedBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Resolved</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────

const FILTERS = [
  { value: 'all',        label: 'All'        },
  { value: 'open',       label: 'Open'       },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'resolved',   label: 'Resolved'   },
];

function FilterBar({ active, onChange }) {
  return (
    <div className={styles.filterBar} role="group" aria-label="Filter reports by status">
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          className={`${styles.filterBtn} ${active === value ? styles.filterActive : ''}`}
          onClick={() => onChange(value)}
          aria-pressed={active === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ReportFeed({ reports, loading, error, onRetry, onPatch, filter, onFilter }) {
  const visible = filter === 'all'
    ? reports
    : reports.filter((r) => r.opsStatus === filter);

  return (
    <div className={styles.feedWrap}>
      <FilterBar active={filter} onChange={onFilter} />

      {loading && reports.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={styles.reportCard}
              style={{ opacity: 0.6, background: '#f8fafc' }}
            >
              <div style={{ height: 18, background: '#e2e8f0', width: '40%', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 14, background: '#e2e8f0', width: '70%', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 32, background: '#e2e8f0', width: '30%', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )}

      {error && reports.length === 0 && (
        <ErrorBanner message={error.message || 'Could not load reports. Please retry.'} onRetry={onRetry} />
      )}

      {!loading && visible.length === 0 && (
        <div className={styles.emptyBox} role="status">
          <Inbox size={32} color="var(--color-muted)" aria-hidden="true" />
          <p>No reports match this filter.</p>
          <div style={{ marginTop: '12px' }}>
            {filter !== 'all' ? (
              <button
                className={styles.filterBtn}
                onClick={() => onFilter('all')}
                style={{
                  minHeight: '44px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid var(--color-line, #D8E4EA)',
                  borderRadius: '8px',
                  background: 'var(--color-surface, #fff)',
                }}
              >
                Show all reports
              </button>
            ) : (
              <button
                className={styles.filterBtn}
                onClick={onRetry}
                style={{
                  minHeight: '44px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid var(--color-line, #D8E4EA)',
                  borderRadius: '8px',
                  background: 'var(--color-surface, #fff)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Refresh feed</span>
              </button>
            )}
          </div>
        </div>
      )}

      {visible.map((r) => (
        <ReportCard key={r.reportId} report={r} onPatch={onPatch} />
      ))}

      {/* Stale-data indicator when refreshing with existing data */}
      {loading && reports.length > 0 && (
        <div className={styles.refreshingRow} aria-live="polite">
          <Spinner size={14} /> Refreshing…
        </div>
      )}
    </div>
  );
}
