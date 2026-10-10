/**
 * HotspotDetailPanel.jsx — detailed breakdown panel for an inspected hazard hotspot.
 *
 * Implements:
 *   • ScoreRing with count-up animation
 *   • RiskBadge with riskBand
 *   • District and place name
 *   • Report counts (active & total)
 *   • "Updated X ago" with exact local timestamp on hover
 *   • Suggested action line derived from the band (labeled as a suggestion)
 *   • Risk-factor bars with plain labels (only what backend returns; otherwise quiet note)
 *   • Recent citizen reports with photos and AI assessment
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  Clock, 
  MapPin, 
  BarChart3, 
  Camera, 
  Loader2, 
  ClipboardList,
  Sparkles,
  Info
} from 'lucide-react';
import { HazardIcon } from '../../components/icons/HazardIcons.jsx';
import { ScoreRing, RiskBadge, DepthGauge, Button } from '../../components/ui/index.js';
import styles from './HotspotDetailPanel.module.css';

const FACTOR_LABELS = {
  rainfall: 'Rainfall accumulation',
  reports: 'Citizen reports volume',
  lowness: 'Low-lying terrain & drainage',
  slope: 'Slope steepness',
  elevation: 'Elevation vulnerability',
  soil_moisture: 'Soil moisture saturation',
  water_accumulation: 'Water accumulation index',
  infrastructure: 'Drainage infrastructure load',
};

const SUGGESTED_ACTIONS = {
  SEVERE: {
    label: 'Suggested action',
    text: 'Dispatch emergency response crews, deploy high-capacity dewatering pumps, and barricade submerged roads.',
    variant: 'actionSevere',
  },
  HIGH: {
    label: 'Suggested action',
    text: 'Notify nearby residents, dispatch dewatering equipment, and inspect drainage culverts.',
    variant: 'actionHigh',
  },
  MODERATE: {
    label: 'Suggested action',
    text: 'Monitor culvert inflow, clear debris from road shoulders, and caution motorists.',
    variant: 'actionModerate',
  },
  LOW: {
    label: 'Suggested action',
    text: 'Routine monitoring and maintain unobstructed storm runoff channels.',
    variant: 'actionLow',
  },
  UNKNOWN: {
    label: 'Suggested action',
    text: 'Deploy municipal inspection team to assess localized water accumulation.',
    variant: 'actionModerate',
  },
};

const DEPTH_PLAIN_WORDS = {
  ankle: 'Ankle-deep, about 30 cm',
  knee: 'Knee-deep, about 60 cm',
  waist: 'Waist-deep, over 60 cm',
  unknown: 'Depth undetermined',
};

const PASSABLE_BADGES = {
  yes: { label: 'Passable', Icon: CheckCircle2, color: '#2E9E5B' },
  caution: { label: 'Use caution', Icon: AlertTriangle, color: '#E8A317' },
  no: { label: 'Not passable', Icon: AlertOctagon, color: '#D64545' },
  unknown: { label: 'Passability unknown', Icon: HelpCircle, color: '#8A99A6' },
};

function formatFactorLabel(key) {
  if (FACTOR_LABELS[key]) return FACTOR_LABELS[key];
  const words = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
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
  return `Updated ${days} day${days !== 1 ? 's' : ''} ago`;
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

export function HotspotDetailPanel({
  hotspot,
  matchingReports = [],
  onNavigateToOfficer,
}) {
  const navigate = useNavigate();
  const [failedThumbnails, setFailedThumbnails] = useState({});

  if (!hotspot) return null;

  const locationName =
    hotspot.wardName ||
    (hotspot.wardNo ? `Ward ${hotspot.wardNo}` : (hotspot.district ? `${hotspot.district} sector` : '—'));
  const districtName = hotspot.district || '—';
  const timeAgo = formatRelativeTime(hotspot.lastUpdated);
  const exactTime = formatExactTime(hotspot.lastUpdated);

  // Suggested action derived from risk band
  const normBand = (hotspot.riskBand || 'UNKNOWN').toUpperCase();
  const actionPlan = SUGGESTED_ACTIONS[normBand] || SUGGESTED_ACTIONS.UNKNOWN;

  // Parse risk factors (render ONLY what backend returns)
  const riskFactors = hotspot.riskFactors;
  const factorEntries = riskFactors && typeof riskFactors === 'object'
    ? Object.entries(riskFactors).filter(([_, val]) => val !== null && val !== undefined)
    : [];

  return (
    <div className={styles.panelContainer}>
      {/* ── Top Overview Card ──────────────────────────────────────────────── */}
      <section className={styles.overviewSection} aria-label="Hotspot overview">
        <div className={styles.overviewHeader}>
          <div className={styles.scoreWrap}>
            <ScoreRing score={hotspot.riskScore} size={76} strokeWidth={7} />
          </div>

          <div className={styles.titleGroup}>
            <div className={styles.badgeRow}>
              <RiskBadge band={hotspot.riskBand} size="md" />
              <span
                className={styles.timeTag}
                title={exactTime}
                aria-label={`Updated ${timeAgo}. Exact timestamp: ${exactTime}`}
              >
                <Clock size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                {timeAgo}
              </span>
            </div>

            <h3 className={styles.locationTitle}>{locationName}</h3>
            <p className={styles.districtSubtitle}>
              <MapPin size={12} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: '4px' }} />
              {districtName}
              {hotspot.lat && hotspot.lng && (
                <span className={styles.coordinates}>
                  {' '}• {hotspot.lat.toFixed(4)}°N, {hotspot.lng.toFixed(4)}°E
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Suggested Action Line (Derived from Band) ──────────────────────── */}
        <div className={`${styles.suggestedActionBox} ${styles[actionPlan.variant]}`} role="note">
          <div className={styles.actionIconWrap}>
            <Sparkles size={16} aria-hidden="true" />
          </div>
          <div className={styles.actionContent}>
            <span className={styles.actionLabel}>Suggested action</span>
            <p className={styles.actionText}>{actionPlan.text}</p>
          </div>
        </div>

        {/* ── Quick Stats Grid ─────────────────────────────────────────────── */}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>
              {Number.isFinite(hotspot.activeReports) ? hotspot.activeReports : '—'}
            </span>
            <span className={styles.statLabel}>Active reports</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>
              {Number.isFinite(hotspot.reportCount) ? hotspot.reportCount : '—'}
            </span>
            <span className={styles.statLabel}>Total reports</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>
              {Number.isFinite(hotspot.riskScore) ? `${hotspot.riskScore}/100` : '—'}
            </span>
            <span className={styles.statLabel}>Risk index</span>
          </div>
        </div>
      </section>

      {/* ── Risk Factors Section (Render only what backend returns) ────────── */}
      <section className={styles.sectionBlock} aria-label="Risk assessment drivers">
        <h4 className={styles.sectionHeading}>Risk factors</h4>

        {factorEntries.length > 0 ? (
          <div className={styles.factorList}>
            {factorEntries.map(([key, val]) => {
              const label = formatFactorLabel(key);
              const numVal = typeof val === 'number' ? val : Number(val);
              const isNumeric = !Number.isNaN(numVal) && Number.isFinite(numVal);

              let pct = 0;
              let displayVal = val === null || val === undefined || Number.isNaN(val) ? '—' : String(val);

              if (isNumeric) {
                if (numVal <= 1 && numVal >= 0) {
                  pct = Math.round(numVal * 100);
                  displayVal = `${pct}%`;
                } else if (numVal <= 100 && numVal > 1) {
                  pct = Math.round(numVal);
                  displayVal = `${pct}%`;
                } else {
                  pct = Math.min(100, Math.round(numVal));
                  displayVal = `${numVal}`;
                }
              }

              return (
                <div key={key} className={styles.factorItem}>
                  <div className={styles.factorRow}>
                    <span className={styles.factorLabel}>{label}</span>
                    <strong className={styles.factorValue}>{displayVal}</strong>
                  </div>

                  {isNumeric && (
                    <div
                      className={styles.factorTrack}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${label}: ${displayVal}`}
                    >
                      <div
                        className={styles.factorFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyFactorsBox} role="status">
            <span className={styles.emptyIcon} aria-hidden="true">
              <BarChart3 size={20} />
            </span>
            <p className={styles.emptyFactorsText}>
              Risk factors appear when the risk model is connected
            </p>
          </div>
        )}
      </section>

      {/* ── Recent Citizen Reports Section ─────────────────────────────────── */}
      <section className={styles.sectionBlock} aria-label="Recent hazard reports">
        <div className={styles.sectionHeaderRow}>
          <h4 className={styles.sectionHeading}>Recent citizen reports</h4>
          <span className={styles.reportCountBadge}>
            {matchingReports.length} report{matchingReports.length !== 1 ? 's' : ''}
          </span>
        </div>

        {matchingReports.length > 0 ? (
          <div className={styles.reportsFeed}>
            {matchingReports.map((report) => {
              const reportTime = formatRelativeTime(report.createdAt);
              const reportExact = formatExactTime(report.createdAt);
              const assessment = report.assessment;
              const hasAssessment = Boolean(assessment && assessment.depthClass);
              const passMeta = PASSABLE_BADGES[assessment?.passable] ?? PASSABLE_BADGES.unknown;
              const depthWord = assessment?.depthClass
                ? DEPTH_PLAIN_WORDS[assessment.depthClass] ?? assessment.depthClass
                : null;
              const confidencePct = Number.isFinite(assessment?.confidence)
                ? Math.round(assessment.confidence * 100)
                : null;

              const hasImage = Boolean(report.photoKey || report.photoPreview);
              const isThumbFailed = failedThumbnails[report.reportId];
              const hazardLabel = report.hazardType === 'landslide'
                ? 'Landslide'
                : report.hazardType === 'waterlogging'
                  ? 'Waterlogging'
                  : report.hazardType === 'road_damage'
                    ? 'Road damage'
                    : 'Flood hazard';

              return (
                <article key={report.reportId} className={styles.reportCard}>
                  {/* Photo, assessment and depth gauge share a fixed-height row. */}
                  <div
                    className={styles.thumbnailWrap}
                    role={!hasImage || isThumbFailed ? 'img' : undefined}
                    aria-label={!hasImage || isThumbFailed ? `No photo available. ${hazardLabel} report` : undefined}
                  >
                    {hasImage && !isThumbFailed ? (
                      <img
                        src={report.photoPreview || `/${report.photoKey}`}
                        alt={`Citizen submitted ${hazardLabel.toLowerCase()} photo`}
                        className={styles.thumbnailImg}
                        onError={() => {
                          setFailedThumbnails((prev) => ({
                            ...prev,
                            [report.reportId]: true,
                          }));
                        }}
                      />
                    ) : (
                      <div className={styles.thumbnailFallback} aria-hidden="true">
                        <HazardIcon type={report.hazardType} size={30} />
                      </div>
                    )}
                  </div>

                  <div className={styles.cardMainRow}>
                    {hasAssessment ? (
                      <div className={styles.assessmentBox}>
                        <div className={styles.depthTitle}>{depthWord}</div>
                        <div className={styles.assessmentMeta}>
                          <span className={styles.confidenceRow}>
                            {confidencePct !== null ? `${confidencePct}% sure` : 'Confidence unavailable'}
                          </span>
                          <span
                            className={styles.passBadge}
                            style={{ color: passMeta.color }}
                          >
                            <passMeta.Icon size={14} aria-hidden="true" />
                            <span>{passMeta.label}</span>
                          </span>
                        </div>
                        <time
                          className={styles.reportTime}
                          dateTime={report.createdAt}
                          title={reportExact}
                          aria-label={`Reported ${reportTime}. Exact time: ${reportExact}`}
                        >
                          <Clock size={14} aria-hidden="true" />
                          {reportTime}
                        </time>
                      </div>
                    ) : (
                      <div className={styles.pendingAssessment}>
                        <p className={styles.pendingText}>
                          <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 1s linear infinite', marginRight: '4px', display: 'inline-block', verticalAlign: '-1px' }} />
                          Water depth assessment in progress…
                          <time
                            className={styles.reportTime}
                            dateTime={report.createdAt}
                            title={reportExact}
                            aria-label={`Reported ${reportTime}. Exact time: ${reportExact}`}
                          >
                            {reportTime}
                          </time>
                        </p>
                      </div>
                    )}
                  </div>

                  {hasAssessment && (
                    <div className={styles.gaugeContainer} aria-label="Estimated water depth gauge">
                      <DepthGauge
                        depthClass={assessment.depthClass}
                        height={40}
                        showLabels={false}
                        className={styles.compactDepthGauge}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyReportsBox} role="status">
            <span className={styles.emptyIcon} aria-hidden="true">
              <ClipboardList size={24} />
            </span>
            <p className={styles.emptyReportsText}>
              No recent citizen reports linked directly to this hotspot yet.
            </p>
            <div className={styles.emptyActionRow}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/report')}
              >
                <Camera size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
                Report a hazard here
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Ward Officer CTA ─────────────────────────────────────────────────── */}
      {onNavigateToOfficer && (
        <div className={styles.footerAction}>
          <Button
            variant="primary"
            size="md"
            className={styles.actionBtn}
            onClick={onNavigateToOfficer}
          >
            Ward officer dispatch & triage →
          </Button>
        </div>
      )}
    </div>
  );
}
