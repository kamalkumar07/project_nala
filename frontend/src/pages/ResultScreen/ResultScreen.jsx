/**
 * ResultScreen.jsx — Success screen displaying AI hazard assessment and citizen confirmation.
 *
 * Implements:
 *   • Prominently displays Report ID (never displays or logs tokens)
 *   • Multimodal AI assessment breakdown:
 *       - DepthGauge component
 *       - Depth in plain words ("Ankle deep", "Knee deep", "Waist deep", etc.)
 *       - Multimodal AI confidence percentage
 *       - Passability status (Passable / Caution / Not passable)
 *       - AI rationale
 *   • "Is this right?" citizen confirmation & depth correction (PATCH /reports/:id/confirm)
 *   • Action button: "See it on the map" focusing on the new hazard location
 *   • Friendly polling state if reached while status is "analyzing"
 */

import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useReportPoller } from '../../hooks/useReportPoller.js';
import { apiRequest } from '../../api/client.js';
import { useReportStore } from '../ReportFlow/useReportStore.js';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  Bot, 
  Map 
} from 'lucide-react';
import { DepthGauge } from '../../components/ui/DepthGauge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { AlertOptIn } from '../../components/ui/AlertOptIn.jsx';
import styles from './ResultScreen.module.css';

const DEPTH_PLAIN_WORDS = {
  ankle: { label: 'Ankle deep', desc: 'Up to ~30 cm — passable for most vehicles' },
  knee: { label: 'Knee deep', desc: 'Up to ~60 cm — hazardous for two-wheelers and pedestrians' },
  waist: { label: 'Waist deep', desc: 'Over 60 cm — severe flood danger, impassable' },
  unknown: { label: 'Depth undetermined', desc: 'No clear visual scale reference found' },
};

const PASSABLE_META = {
  yes: { label: 'Passable', Icon: CheckCircle2, color: '#2E9E5B', bg: '#EDF8F1' },
  caution: { label: 'Use caution', Icon: AlertTriangle, color: '#E8A317', bg: '#FEF8EA' },
  no: { label: 'Not passable', Icon: AlertOctagon, color: '#D64545', bg: '#FDF2F2' },
  unknown: { label: 'Passability unclear', Icon: HelpCircle, color: '#8A99A6', bg: '#F3F8FA' },
};

const DEPTH_OPTIONS = [
  { id: 'ankle', label: 'Ankle (~30 cm)' },
  { id: 'knee', label: 'Knee (~60 cm)' },
  { id: 'waist', label: 'Waist (>60 cm)' },
  { id: 'unknown', label: 'Uncertain' },
];

export function ResultScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const resetStore = useReportStore((s) => s.reset);

  const reportId = searchParams.get('id');

  // Fast path: StepAnalyzing navigated with location.state.report
  const stateReport = location.state?.report ?? null;

  // Polling hook if report is still analyzing or deep-linked
  const needsFetch = !stateReport || stateReport.status !== 'assessed';
  const { report: polledReport, error: pollError, polling } = useReportPoller(
    needsFetch ? reportId : null,
  );

  const report = stateReport?.status === 'assessed' ? stateReport : polledReport;
  const assessment = report?.assessment;

  // Citizen confirmation state
  const [correcting, setCorrecting] = useState(false);
  const [selectedDepth, setSelectedDepth] = useState(assessment?.depthClass || 'unknown');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(Boolean(report?.userConfirmed));
  const [feedbackError, setFeedbackError] = useState('');

  // Handle citizen confirmation
  async function handleConfirmAccurate() {
    if (!reportId) return;
    setSavingFeedback(true);
    setFeedbackError('');
    try {
      await apiRequest(`/api/v1/reports/${encodeURIComponent(reportId)}/confirm`, {
        method: 'PATCH',
        body: {
          userConfirmed: true,
          userDepthClass: assessment?.depthClass || 'unknown',
        },
      });
      setConfirmedSuccess(true);
      setCorrecting(false);
    } catch (err) {
      setFeedbackError(err.message || 'Could not save feedback. Please try again.');
    } finally {
      setSavingFeedback(false);
    }
  }

  // Handle citizen correction
  async function handleSaveCorrection() {
    if (!reportId) return;
    setSavingFeedback(true);
    setFeedbackError('');
    try {
      await apiRequest(`/api/v1/reports/${encodeURIComponent(reportId)}/confirm`, {
        method: 'PATCH',
        body: {
          userConfirmed: true,
          userDepthClass: selectedDepth,
        },
      });
      setConfirmedSuccess(true);
      setCorrecting(false);
    } catch (err) {
      setFeedbackError(err.message || 'Could not save correction. Please try again.');
    } finally {
      setSavingFeedback(false);
    }
  }

  function handleSeeOnMap() {
    resetStore();
    navigate('/app');
  }

  function handleReportAnother() {
    resetStore();
    navigate('/report');
  }

  // Guard: missing report ID
  if (!reportId) {
    return (
      <div className={styles.screen}>
        <PageHeader title="Hazard report" onBack={null} />
        <main className={styles.body}>
          <ErrorBanner message="No report ID found. Please start a new hazard report." />
          <Button variant="primary" fullWidth onClick={() => navigate('/report')}>
            Report a hazard
          </Button>
        </main>
      </div>
    );
  }

  // Polling State: waiting for Bedrock AI to complete assessment
  if (!report || report.status === 'analyzing') {
    return (
      <div className={styles.screen}>
        <PageHeader title="Assessing hazard" onBack={null} />
        <main className={`${styles.body} ${styles.centerBody}`}>
          <div className={styles.analyzingCard}>
            <Spinner size={48} />
            <h2 className={styles.heading}>Evaluating photo…</h2>
            <p className={styles.sub} aria-live="polite">
              {polling ? 'AI is estimating water depth and passability…' : 'Retrieving the water-depth reading…'}
            </p>
          </div>
          {pollError && (
            <ErrorBanner message={pollError.message || 'Error checking report status.'} />
          )}
        </main>
      </div>
    );
  }

  // Failed state
  if (report.status === 'failed') {
    return (
      <div className={styles.screen}>
        <PageHeader title="Assessment result" onBack={null} />
        <main className={styles.body}>
          <div className={styles.failCard}>
            <span className={styles.failEmoji} aria-hidden="true">
              <AlertTriangle size={32} color="#E8A317" />
            </span>
            <h2 className={styles.heading}>Could not assess depth</h2>
            <p className={styles.sub}>
              The AI could not confidently detect water depth or a reference object in this photo.
            </p>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={handleReportAnother}>
            Try another photo
          </Button>
        </main>
      </div>
    );
  }

  const depthClass = (assessment?.depthClass || 'unknown').toLowerCase();
  const depthMeta = DEPTH_PLAIN_WORDS[depthClass] || DEPTH_PLAIN_WORDS.unknown;
  const passable = (assessment?.passable || 'unknown').toLowerCase();
  const passMeta = PASSABLE_META[passable] || PASSABLE_META.unknown;
  const confidencePct = assessment?.confidence !== null && assessment?.confidence !== undefined
    ? Math.round(assessment.confidence * 100)
    : null;

  return (
    <div className={styles.screen}>
      <PageHeader title="Hazard reported" onBack={null} />

      <main className={styles.body}>
        {/* ── Top Report Confirmation Banner ─────────────────────────────────── */}
        <div className={styles.reportHeaderCard}>
          <div className={styles.reportIdRow}>
            <span className={styles.successIcon} aria-hidden="true">
              <CheckCircle2 size={24} color="#2E9E5B" />
            </span>
            <div>
              <h2 className={styles.successTitle}>Report successfully logged</h2>
              <span className={styles.reportIdTag}>Report ID: {report.reportId}</span>
            </div>
          </div>
        </div>

        {/* ── AI Assessment Card with DepthGauge ─────────────────────────────── */}
        <section className={styles.assessmentSection} aria-label="AI assessment results">
          <div className={styles.assessmentCardHeader}>
            <span className={styles.aiBadge} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Bot size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
              AI water-depth reading
            </span>
            {confidencePct !== null && (
              <span className={styles.confidenceChip}>{confidencePct}% confidence</span>
            )}
          </div>

          <div className={styles.assessmentBodyGrid}>
            {/* Visual DepthGauge */}
            <div className={styles.depthGaugeWrap}>
              <DepthGauge
                depthClass={depthClass}
                height={160}
                showLabels={true}
              />
            </div>

            {/* Depth in Plain Words & Passability */}
            <div className={styles.assessmentDetails}>
              <div>
                <span className={styles.depthCategoryLabel}>Estimated water level</span>
                <h3 className={styles.depthWordHeading}>{depthMeta.label}</h3>
                <p className={styles.depthDescText}>{depthMeta.desc}</p>
              </div>

              {/* Passability Status */}
              <div
                className={styles.passabilityBadge}
                style={{ 
                  color: passMeta.color, 
                  background: passMeta.bg,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <passMeta.Icon size={16} aria-hidden="true" />
                <strong>{passMeta.label}</strong>
              </div>

              {/* AI Rationale */}
              {assessment?.rationale && (
                <div className={styles.rationaleBox}>
                  <p className={styles.rationaleText}>
                    &ldquo;{assessment.rationale}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── "Is this right?" Citizen Correction Section ────────────────────── */}
        <section className={styles.feedbackSection} aria-label="Assessment accuracy feedback">
          {feedbackError && (
            <ErrorBanner message={feedbackError} />
          )}

          {confirmedSuccess ? (
            <div className={styles.feedbackSuccessBanner} role="status">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Thank you for validating the assessment! Your input refines local risk scores.
              </span>
            </div>
          ) : !correcting ? (
            <div className={styles.accuracyCheckCard}>
              <h4 className={styles.accuracyHeading}>Is this assessment accurate?</h4>
              <p className={styles.accuracySub}>
                Your on-the-ground verification helps alert emergency services and residents accurately.
              </p>

              <div className={styles.feedbackBtnRow}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmAccurate}
                  loading={savingFeedback}
                >
                  <CheckCircle2 size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
                  Yes, that&apos;s right
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCorrecting(true)}
                  disabled={savingFeedback}
                >
                  No, correct depth
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.correctionCard}>
              <h4 className={styles.accuracyHeading}>Select actual water depth:</h4>
              <div className={styles.depthOptionsGrid} role="radiogroup" aria-label="Actual depth options">
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedDepth === opt.id}
                    className={`${styles.depthOptBtn} ${selectedDepth === opt.id ? styles.depthOptBtnActive : ''}`}
                    onClick={() => setSelectedDepth(opt.id)}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className={styles.feedbackBtnRow}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveCorrection}
                  loading={savingFeedback}
                >
                  Save correction
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setCorrecting(false)}
                  disabled={savingFeedback}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Proactive Early Warning Alert Opt-In */}
        <AlertOptIn
          defaultLat={report?.lat}
          defaultLng={report?.lng}
        />

        {/* ── Primary Action: "See it on the map" ────────────────────────────── */}
        <div className={styles.actionsFooter}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSeeOnMap}
          >
            <Map size={18} aria-hidden="true" style={{ marginRight: '8px' }} />
            See it on the map
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleReportAnother}
          >
            Report another hazard
          </Button>
        </div>
      </main>
    </div>
  );
}
