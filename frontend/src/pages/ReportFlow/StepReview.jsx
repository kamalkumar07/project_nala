/**
 * StepReview.jsx — Step 3: Hazard details, review, client-side validation, and upload.
 *
 * Implements:
 *   • Hazard type chips from backend allowed values:
 *       ["flood", "landslide", "waterlogging", "road_damage", "other"] (default flood)
 *   • Optional description with character counter matching backend 500-char limit
 *   • Client-side validation before submission
 *   • Granular upload progress indicator (presign -> S3 PUT -> create report)
 *   • Never displays or logs tokens
 *   • Error handling: network timeout with retry, validation errors, upload failed
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportStore } from './useReportStore.js';
import { AlertTriangle, MapPin, Loader2, RotateCcw } from 'lucide-react';
import { HazardIcon } from '../../components/icons/HazardIcons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StepIndicator } from '../../components/ui/StepIndicator.jsx';
import styles from './ReportFlow.module.css';

const HAZARD_TYPES = [
  { id: 'flood', label: 'Flooding' },
  { id: 'landslide', label: 'Landslide' },
  { id: 'waterlogging', label: 'Waterlogging' },
  { id: 'road_damage', label: 'Road damage' },
  { id: 'other', label: 'Other hazard' },
];

const MAX_NOTE_LENGTH = 500;

const SUBMIT_STEPS = [
  { id: 'presign', label: 'Acquiring secure upload authorization…' },
  { id: 'upload', label: 'Uploading photo binary directly to storage…' },
  { id: 'create', label: 'Registering hazard report with PARVAT…' },
];

export function StepReview() {
  const navigate = useNavigate();
  const abortRef = useRef(null);

  const {
    photo,
    compressedFile,
    photoPreview,
    lat,
    lng,
    locationLabel,
    hazardType,
    note,
    outsideHpConfirmed,
    setHazardType,
    setNote,
    setReportId,
  } = useReportStore();

  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState(null);

  // File to upload (use compressed file if available)
  const uploadPayload = compressedFile || photo;

  // Client-side validation checks
  const hasPhoto = Boolean(uploadPayload);
  const hasCoords = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
  const isNoteValid = (note?.length ?? 0) <= MAX_NOTE_LENGTH;
  const isFormValid = hasPhoto && hasCoords && isNoteValid;

  async function handleSubmit() {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setStepIndex(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ── Step 1: Presign upload URL ──────────────────────────────────────────
      setStepIndex(0);
      const presignRes = await apiRequest('/api/v1/uploads/presign', {
        method: 'POST',
        body: {
          contentType: uploadPayload.type || 'image/jpeg',
          sizeBytes: uploadPayload.size,
        },
        signal: controller.signal,
      });

      const { photoKey, uploadUrl } = presignRes || {};
      if (!photoKey || !uploadUrl) {
        throw new Error('Invalid upload authorization received from server.');
      }

      // ── Step 2: Direct browser PUT to S3 ────────────────────────────────────
      setStepIndex(1);
      await putToS3(uploadUrl, uploadPayload, controller.signal);

      // ── Step 3: Register report with Express backend ────────────────────────
      setStepIndex(2);
      const createRes = await apiRequest('/api/v1/reports', {
        method: 'POST',
        body: {
          photoKey,
          lat: Number(lat),
          lng: Number(lng),
          hazardType: hazardType || 'flood',
          note: note ? note.trim().slice(0, MAX_NOTE_LENGTH) : undefined,
          clientTimestamp: new Date().toISOString(),
        },
        signal: controller.signal,
      });

      // Secure: Never log or display reportToken
      const newReportId = createRes?.reportId;
      if (!newReportId) {
        throw new Error('Server did not return a valid report identifier.');
      }

      setReportId(newReportId);

      // Advance to analyzing poll screen
      navigate(`/report/analyzing?id=${encodeURIComponent(newReportId)}`);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ABORTED') return;
      setSubmitError(
        err.message || 'Failed to submit report. Please check your internet connection and retry.',
      );
      setSubmitting(false);
    }
  }

  function handleCancelSubmit() {
    abortRef.current?.abort();
    setSubmitting(false);
    setSubmitError(null);
  }

  return (
    <div className={styles.flow}>
      <PageHeader title="Report a hazard" onBack={() => navigate('/report/location')} />
      <StepIndicator total={3} current={3} />

      <main className={styles.body}>
        <h2 className={styles.heading}>Review & hazard details</h2>
        <p className={styles.sub}>
          Select the hazard category, optionally add details, and submit for an AI water-depth reading.
        </p>

        {/* ── Photo & Location Summary Cards ───────────────────────────────── */}
        <div className={styles.reviewSummaryGrid}>
          {/* Photo Thumbnail */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryLabel}>Captured photo</span>
              <button
                type="button"
                className={styles.changeLink}
                onClick={() => navigate('/report')}
                disabled={submitting}
              >
                Change photo
              </button>
            </div>
            {photoPreview ? (
              <div className={styles.reviewThumbWrap}>
                <img
                  src={photoPreview}
                  alt="Incident preview"
                  className={styles.reviewImg}
                />
              </div>
            ) : (
              <p className={styles.reviewMissing}>
                <AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                No photo captured
              </p>
            )}
          </div>

          {/* Coordinates Summary */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryLabel}>Incident location</span>
              <button
                type="button"
                className={styles.changeLink}
                onClick={() => navigate('/report/location')}
                disabled={submitting}
              >
                Change location
              </button>
            </div>
            {hasCoords ? (
              <div className={styles.coordsReadout}>
                <p className={styles.coordsText}>
                  <MapPin size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                  {lat}°N, {lng}°E
                </p>
                {locationLabel && (
                  <p className={styles.coordsAccuracy}>{locationLabel}</p>
                )}
                {outsideHpConfirmed && (
                  <span className={styles.outsideHpTag}>
                    <AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                    Location confirmed outside HP
                  </span>
                )}
              </div>
            ) : (
              <p className={styles.reviewMissing}>
                <AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                Missing location coordinates
              </p>
            )}
          </div>
        </div>

        {/* ── Hazard Type Chips (Backend Allowed Enums) ────────────────────── */}
        <section className={styles.hazardSection} aria-label="Hazard type selection">
          <label className={styles.fieldLabel} id="hazard-type-group-label">
            Hazard type
          </label>
          <div
            className={styles.hazardChipGroup}
            role="radiogroup"
            aria-labelledby="hazard-type-group-label"
          >
            {HAZARD_TYPES.map((ht) => (
              <button
                key={ht.id}
                type="button"
                role="radio"
                aria-checked={hazardType === ht.id}
                className={`${styles.hazardChip} ${hazardType === ht.id ? styles.hazardChipActive : ''}`}
                onClick={() => setHazardType(ht.id)}
                disabled={submitting}
              >
                <span className={styles.hazardChipIcon} aria-hidden="true">
                  <HazardIcon type={ht.id} size={18} />
                </span>
                <span>{ht.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Optional Description with Character Counter (Max 500) ───────── */}
        <section className={styles.noteSection}>
          <div className={styles.noteHeader}>
            <label htmlFor="report-description" className={styles.fieldLabel}>
              Optional description
            </label>
            <span
              className={`${styles.charCounter} ${note?.length >= MAX_NOTE_LENGTH ? styles.charCounterLimit : ''}`}
              aria-live="polite"
            >
              {note?.length ?? 0} / {MAX_NOTE_LENGTH}
            </span>
          </div>

          <textarea
            id="report-description"
            rows={3}
            className={styles.textareaField}
            placeholder="e.g., Road blocked by overflow, water rising near bridge pier, power line down…"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            maxLength={MAX_NOTE_LENGTH}
            disabled={submitting}
          />
        </section>

        {/* ── Submission Progress Bar & Indicator ──────────────────────────── */}
        {submitting && (
          <div className={styles.submitProgressCard} role="status" aria-live="polite">
            <div className={styles.progressHeader}>
              <span className={styles.progressSpinner} aria-hidden="true">
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              </span>
              <strong>{SUBMIT_STEPS[stepIndex]?.label}</strong>
            </div>

            <div className={styles.submitProgressBar}>
              <div
                className={styles.submitProgressFill}
                style={{ width: `${((stepIndex + 1) / SUBMIT_STEPS.length) * 100}%` }}
              />
            </div>

            <p className={styles.progressHint}>
              Do not close your browser. Uploading your photo securely…
            </p>
          </div>
        )}

        {/* ── Error Banner & Retry ─────────────────────────────────────────── */}
        {submitError && (
          <div className={styles.errorContainer}>
            <ErrorBanner message={submitError} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSubmit}
              className={styles.retryBtn}
            >
              <RotateCcw size={14} aria-hidden="true" style={{ marginRight: '6px' }} />
              Retry submission
            </Button>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        {submitting ? (
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={handleCancelSubmit}
          >
            Cancel submission
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isFormValid}
            onClick={handleSubmit}
          >
            Submit hazard report →
          </Button>
        )}
      </footer>
    </div>
  );
}
