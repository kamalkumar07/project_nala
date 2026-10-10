/**
 * PriorityList.jsx — ranked hotspot priority dispatch view with dark ops theme.
 *
 * Implements:
 *   • Dark ops theme ([data-theme="ops"])
 *   • "Where do we send help first?" answer at a glance with #1 urgent dispatch card
 *   • District summary cards with interactive filtering
 *   • Risk band filter chips (All, Severe, High, Moderate, Low)
 *   • Ranked list with horizontal severity bars and tabular numerals
 *   • Status stepper (open, dispatched, resolved) with operational state handling
 *   • ScoreRing with count-up animation
 *   • Click-to-focus on map with 44px minimum touch targets
 *   • Resilient fallback dashes ("—") for missing data
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  RotateCcw, 
  CheckCircle2, 
  MapPin, 
  ClipboardList, 
  Clock,
  ShieldAlert,
  Send,
  Truck,
  Check,
  AlertOctagon,
  ArrowRight,
  Filter
} from 'lucide-react';
import { RiskBadge, ScoreRing, Button, Skeleton, ErrorState } from '../../components/ui/index.js';
import styles from './PriorityList.module.css';

const SUGGESTED_ACTIONS = {
  SEVERE: 'Dispatch emergency response crews, deploy high-capacity dewatering pumps, and barricade submerged roads.',
  HIGH: 'Notify nearby residents, dispatch dewatering equipment, and inspect drainage culverts.',
  MODERATE: 'Monitor culvert inflow, clear debris from road shoulders, and caution motorists.',
  LOW: 'Routine monitoring and maintain unobstructed storm runoff channels.',
  UNKNOWN: 'Deploy municipal inspection team to assess localized water accumulation.',
};

function getBandColor(band) {
  switch ((band || '').toUpperCase()) {
    case 'SEVERE': return '#D64545';
    case 'HIGH': return '#E5742B';
    case 'MODERATE': return '#E8A317';
    case 'LOW': return '#2E9E5B';
    default: return '#8A99A6';
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  const time = new Date(isoString).getTime();
  if (!Number.isFinite(time)) return '—';
  const diffMs = Date.now() - time;
  if (diffMs < 0) return 'Updated just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `Updated ${days}d ago`;
}

function formatExactTime(isoString) {
  if (!isoString) return '—';
  const time = new Date(isoString).getTime();
  if (!Number.isFinite(time)) return '—';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  } catch {
    return '—';
  }
}

export function PriorityList({
  hotspots = [],
  loading = false,
  error = null,
  selectedHotspotId,
  onSelectHotspot,
  onRefresh,
  onUpdateStatus,
}) {
  const navigate = useNavigate();

  // Internal state for operational status of hotspots (open, dispatched, resolved)
  const [statusOverrides, setStatusOverrides] = useState({});

  // Filter states
  const [selectedBand, setSelectedBand] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');

  // Rank all hotspots strictly by riskScore descending
  const rankedHotspots = useMemo(() => {
    return [...hotspots].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
  }, [hotspots]);

  // Aggregate stats by district for district summary cards
  const districtSummaries = useMemo(() => {
    const map = new Map();
    rankedHotspots.forEach((h) => {
      const d = h.district || 'Unassigned';
      if (!map.has(d)) {
        map.set(d, {
          name: d,
          count: 0,
          severeCount: 0,
          highCount: 0,
          maxScore: 0,
          topBand: 'LOW',
        });
      }
      const item = map.get(d);
      item.count += 1;
      const band = (h.riskBand || 'UNKNOWN').toUpperCase();
      if (band === 'SEVERE') item.severeCount += 1;
      if (band === 'HIGH') item.highCount += 1;
      if ((h.riskScore ?? 0) > item.maxScore) {
        item.maxScore = h.riskScore ?? 0;
        item.topBand = band;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.maxScore - a.maxScore);
  }, [rankedHotspots]);

  // Band counts for filter chips
  const bandCounts = useMemo(() => {
    const counts = { ALL: rankedHotspots.length, SEVERE: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    rankedHotspots.forEach((h) => {
      const b = (h.riskBand || 'UNKNOWN').toUpperCase();
      if (counts[b] !== undefined) {
        counts[b] += 1;
      }
    });
    return counts;
  }, [rankedHotspots]);

  // Filtered hotspots based on active band and district
  const filteredHotspots = useMemo(() => {
    return rankedHotspots.filter((h) => {
      if (selectedBand !== 'ALL') {
        const b = (h.riskBand || 'UNKNOWN').toUpperCase();
        if (b !== selectedBand) return false;
      }
      if (selectedDistrict !== 'ALL') {
        if ((h.district || 'Unassigned') !== selectedDistrict) return false;
      }
      return true;
    });
  }, [rankedHotspots, selectedBand, selectedDistrict]);

  // Top urgent hotspot to answer "where do we send help first?"
  const topUrgentHotspot = useMemo(() => {
    if (rankedHotspots.length === 0) return null;
    return rankedHotspots[0];
  }, [rankedHotspots]);

  const handleStatusChange = (e, hotspotId, newStatus) => {
    e.stopPropagation(); // Don't trigger row focus
    setStatusOverrides((prev) => ({ ...prev, [hotspotId]: newStatus }));
    if (onUpdateStatus) {
      onUpdateStatus(hotspotId, newStatus);
    }
  };

  // ── Error State ─────────────────────────────────────────────────────────────
  if (error && rankedHotspots.length === 0) {
    return (
      <div className={styles.opsContainer} data-theme="ops">
        <ErrorState
          title="Could not load priority hotspots"
          message={error.message || 'We could not connect to the hazard monitoring service.'}
          onRetry={onRefresh}
          retryLabel="Retry loading list"
        />
      </div>
    );
  }

  // ── Loading Skeleton State ──────────────────────────────────────────────────
  if (loading && rankedHotspots.length === 0) {
    return (
      <div className={styles.opsContainer} data-theme="ops" role="status" aria-label="Loading priority zones">
        <div className={styles.headerRow}>
          <div className={styles.titleArea}>
            <h3 className={styles.priorityTitle}>
              <span className={styles.opsIndicator} aria-hidden="true" />
              Priority hazard hotspots
            </h3>
            <p className={styles.prioritySub}>Loading ranked hotspot data…</p>
          </div>
        </div>
        <div className={styles.listBody} aria-busy="true">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', background: '#0E2233', borderRadius: '10px' }}>
              <Skeleton width="32px" height="32px" variant="circle" />
              <Skeleton width="48px" height="48px" variant="circle" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton width="60%" height={20} />
                <Skeleton width="40%" height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (rankedHotspots.length === 0) {
    return (
      <div className={styles.emptyContainer} data-theme="ops" role="status">
        <span className={styles.emptyIcon} aria-hidden="true">
          <CheckCircle2 size={32} color="#2E9E5B" />
        </span>
        <h4 className={styles.emptyTitle}>No critical hotspots reported</h4>
        <p className={styles.emptySubtitle}>
          All monitored wards and river corridors in Himachal Pradesh are currently within safe limits.
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app/report')}
          >
            <Camera size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
            Report a hazard
          </Button>
          {onRefresh && (
            <Button
              variant="outline"
              size="md"
              onClick={onRefresh}
            >
              <RotateCcw size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
              Refresh list
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.opsContainer} data-theme="ops">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h3 className={styles.priorityTitle}>
            <span className={styles.opsIndicator} aria-hidden="true" />
            Priority hazard hotspots
          </h3>
          <p className={styles.prioritySub}>
            Ranked by multi-factor risk score. Select any hotspot to center and inspect on the map.
          </p>
        </div>
        <span className={styles.countBadge}>
          {rankedHotspots.length} zone{rankedHotspots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── "Where do we send help first?" Urgent Dispatch Hero Card ─────────── */}
      {topUrgentHotspot && (
        <section
          className={styles.urgentHeroCard}
          aria-label="Immediate dispatch priority recommendation"
        >
          <div className={styles.urgentHeroHeader}>
            <div className={styles.urgentHeroBadge}>
              <span className={styles.urgentPulseDot} aria-hidden="true" />
              <span>Where to send help first • Rank #1</span>
            </div>
            <RiskBadge band={topUrgentHotspot.riskBand} size="sm" />
          </div>

          <div className={styles.urgentHeroBody}>
            <div className={styles.urgentHeroRing}>
              <ScoreRing
                score={Number.isFinite(topUrgentHotspot.riskScore) ? topUrgentHotspot.riskScore : 0}
                size={64}
                strokeWidth={6}
              />
            </div>

            <div className={styles.urgentHeroDetails}>
              <h4 className={styles.urgentHeroTitle}>
                {topUrgentHotspot.wardName ||
                  (topUrgentHotspot.wardNo ? `Ward ${topUrgentHotspot.wardNo}` : (topUrgentHotspot.district ? `${topUrgentHotspot.district} sector` : '—'))}
              </h4>
              <div className={styles.urgentHeroMeta}>
                <span>
                  <MapPin size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                  {topUrgentHotspot.district || '—'}
                </span>
                <span>
                  <ClipboardList size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                  {Number.isFinite(topUrgentHotspot.reportCount)
                    ? `${topUrgentHotspot.reportCount} citizen logs`
                    : 'Awaiting citizen logs'}
                  {Number.isFinite(topUrgentHotspot.activeReports) ? ` (${topUrgentHotspot.activeReports} active)` : ''}
                </span>
                <span>
                  <Clock size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                  {formatRelativeTime(topUrgentHotspot.lastUpdated)}
                </span>
              </div>
            </div>
          </div>

          {/* Suggested Action Line */}
          <div className={styles.urgentActionBox}>
            <span className={styles.urgentActionLabel}>Suggested action</span>
            <p style={{ margin: 0 }}>
              {SUGGESTED_ACTIONS[(topUrgentHotspot.riskBand || 'UNKNOWN').toUpperCase()] || SUGGESTED_ACTIONS.UNKNOWN}
            </p>
          </div>

          <div className={styles.urgentHeroFooter}>
            <button
              type="button"
              className={styles.urgentFocusBtn}
              onClick={() => onSelectHotspot(topUrgentHotspot)}
              aria-label={`Focus #1 priority zone ${topUrgentHotspot.wardName || topUrgentHotspot.district || ''} on map`}
            >
              <MapPin size={14} aria-hidden="true" />
              <span>Focus on map</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* ── District Summary Cards ───────────────────────────────────────────── */}
      {districtSummaries.length > 0 && (
        <section className={styles.districtSummarySection} aria-label="District summary filters">
          <span className={styles.districtSummaryHeader}>District Breakdown</span>
          <div className={styles.districtCardsScroll} role="group" aria-label="Filter by district">
            <button
              type="button"
              className={`${styles.districtCard} ${selectedDistrict === 'ALL' ? styles.districtCardActive : ''}`}
              onClick={() => setSelectedDistrict('ALL')}
              aria-pressed={selectedDistrict === 'ALL'}
            >
              <strong className={styles.districtCardName}>All districts</strong>
              <span className={styles.districtCardMeta}>{rankedHotspots.length} total zones</span>
            </button>
            {districtSummaries.map((summary) => (
              <button
                key={summary.name}
                type="button"
                className={`${styles.districtCard} ${selectedDistrict === summary.name ? styles.districtCardActive : ''}`}
                onClick={() => setSelectedDistrict(selectedDistrict === summary.name ? 'ALL' : summary.name)}
                aria-pressed={selectedDistrict === summary.name}
              >
                <strong className={styles.districtCardName}>{summary.name}</strong>
                <span className={styles.districtCardMeta}>
                  <span
                    className={styles.districtCardDot}
                    style={{ background: getBandColor(summary.topBand) }}
                    aria-hidden="true"
                  />
                  {summary.count} zone{summary.count !== 1 ? 's' : ''}
                  {summary.severeCount > 0 ? ` (${summary.severeCount} severe)` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Band Filter Chips ────────────────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.bandChipsGroup} role="group" aria-label="Filter by risk severity">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'SEVERE', label: 'Severe' },
            { id: 'HIGH', label: 'High' },
            { id: 'MODERATE', label: 'Moderate' },
            { id: 'LOW', label: 'Low' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.filterChip} ${selectedBand === item.id ? styles.filterChipActive : ''}`}
              onClick={() => setSelectedBand(item.id)}
              aria-pressed={selectedBand === item.id}
            >
              <span>{item.label}</span>
              <span className={styles.filterChipBadge}>{bandCounts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {(selectedBand !== 'ALL' || selectedDistrict !== 'ALL') && (
          <button
            type="button"
            className={styles.filterResetBtn}
            onClick={() => {
              setSelectedBand('ALL');
              setSelectedDistrict('ALL');
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* ── Ranked Hotspot List ──────────────────────────────────────────────── */}
      <div className={styles.listBody} role="list" aria-label="Hotspots ranked by risk score">
        {filteredHotspots.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#85A2B9', background: '#0E2233', borderRadius: '10px' }}>
            No hotspots match the selected filter criteria.
          </div>
        ) : (
          filteredHotspots.map((h, index) => {
            const rank = index + 1;
            const locationName =
              h.wardName ||
              (h.wardNo ? `Ward ${h.wardNo}` : (h.district ? `${h.district} sector` : '—'));
            const districtName = h.district || '—';
            const timeAgo = formatRelativeTime(h.lastUpdated);
            const exactTime = formatExactTime(h.lastUpdated);
            const isSelected = selectedHotspotId === h.hotspotId;
            const score = Number.isFinite(h.riskScore) ? h.riskScore : 0;
            const bandColor = getBandColor(h.riskBand);
            
            // Operational status stepper: open -> dispatched -> resolved
            const currentStatus = statusOverrides[h.hotspotId] || h.opsStatus || h.status || 'open';

            return (
              <div
                key={h.hotspotId || `rank-${rank}`}
                role="listitem"
                className={`${styles.priorityRow} ${isSelected ? styles.priorityRowActive : ''}`}
                onClick={() => onSelectHotspot(h)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectHotspot(h);
                  }
                }}
                tabIndex={0}
                aria-label={`Rank ${rank}: ${locationName}, ${districtName}, Risk score ${h.riskScore ?? 0}, ${h.reportCount ?? 0} reports, Updated ${timeAgo}`}
              >
                {/* Rank Column */}
                <div className={styles.rankBadgeCol}>
                  <span
                    className={`${styles.rankNumber} ${
                      rank === 1 ? styles.topRank1 : rank === 2 ? styles.topRank2 : rank === 3 ? styles.topRank3 : ''
                    }`}
                  >
                    #{rank}
                  </span>
                </div>

                {/* Score Ring Column */}
                <div className={styles.scoreCol}>
                  <ScoreRing score={score} size={48} strokeWidth={5} />
                </div>

                {/* Main Info Column */}
                <div className={styles.infoCol}>
                  <div className={styles.nameRow}>
                    <strong className={styles.locationName}>{locationName}</strong>
                    <RiskBadge band={h.riskBand} size="sm" />
                  </div>

                  {/* Horizontal Severity Bar with tabular numerals */}
                  <div className={styles.severityBarWrap} aria-hidden="true">
                    <div className={styles.severityTrack}>
                      <div
                        className={styles.severityFill}
                        style={{
                          width: `${Math.max(4, Math.min(100, score))}%`,
                          backgroundColor: bandColor,
                        }}
                      />
                    </div>
                    <span className={styles.severityScoreNum}>
                      {Number.isFinite(h.riskScore) ? `${h.riskScore}/100` : '—'}
                    </span>
                  </div>

                  <div className={styles.metaRow}>
                    <span className={styles.districtName}>
                      <MapPin size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                      {districtName}
                    </span>
                    <span className={styles.reportCount}>
                      <ClipboardList size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                      {Number.isFinite(h.reportCount) ? h.reportCount : '—'} report{h.reportCount !== 1 ? 's' : ''}
                      {Number.isFinite(h.activeReports) ? ` (${h.activeReports} active)` : ''}
                    </span>
                  </div>

                  {/* Operational Status Stepper (open -> dispatched -> resolved) */}
                  <div
                    className={styles.statusStepper}
                    role="group"
                    aria-label={`Operational status for ${locationName}`}
                  >
                    <button
                      type="button"
                      className={`${styles.statusStepBtn} ${currentStatus === 'open' ? styles.statusStepBtnActive : ''}`}
                      onClick={(e) => handleStatusChange(e, h.hotspotId, 'open')}
                      title="Mark status as Open"
                      aria-pressed={currentStatus === 'open'}
                    >
                      <AlertOctagon size={10} aria-hidden="true" />
                      <span>Open</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusStepBtn} ${currentStatus === 'dispatched' ? styles.statusStepBtnActiveDispatched : ''}`}
                      onClick={(e) => handleStatusChange(e, h.hotspotId, 'dispatched')}
                      title="Mark status as Dispatched"
                      aria-pressed={currentStatus === 'dispatched'}
                    >
                      <Truck size={10} aria-hidden="true" />
                      <span>Dispatched</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusStepBtn} ${currentStatus === 'resolved' ? styles.statusStepBtnActiveResolved : ''}`}
                      onClick={(e) => handleStatusChange(e, h.hotspotId, 'resolved')}
                      title="Mark status as Resolved"
                      aria-pressed={currentStatus === 'resolved'}
                    >
                      <Check size={10} aria-hidden="true" />
                      <span>Resolved</span>
                    </button>
                  </div>
                </div>

                {/* Time Column & Focus Action */}
                <div className={styles.actionCol}>
                  <span
                    className={styles.timeTag}
                    title={exactTime}
                    aria-label={`Latest report ${timeAgo}. Exact timestamp: ${exactTime}`}
                  >
                    <Clock size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                    {timeAgo}
                  </span>
                  <span className={styles.focusHint} aria-hidden="true">
                    <span>View map</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
