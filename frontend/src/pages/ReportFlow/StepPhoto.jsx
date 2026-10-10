/**
 * StepPhoto.jsx — Step 1: Capture or select a hazard photo.
 *
 * Implements:
 *   • accept="image/*", capture="environment" for native rear-camera access
 *   • Mandatory hint: "Include a tyre, kerb, road edge or a person for scale"
 *   • Client-side compression to max 1600px JPEG ~0.8 with instant preview
 *   • Failure handling: camera access denied, format errors, size limits
 *   • WCAG AA AA accessible touch targets (≥44px) and sentence case labels
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportStore } from './useReportStore.js';
import { compressImage } from '../../utils/imageCompressor.js';
import { Lightbulb, Loader2, CheckCircle2, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StepIndicator } from '../../components/ui/StepIndicator.jsx';
import styles from './ReportFlow.module.css';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per backend schema limit

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function StepPhoto() {
  const navigate = useNavigate();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const { photo, photoPreview, compressedFile, setPhoto } = useReportStore();

  const [compressing, setCompressing] = useState(false);
  const [compressError, setCompressError] = useState(null);
  const [originalSize, setOriginalSize] = useState(photo?.size ?? 0);
  const [compressedSize, setCompressedSize] = useState(compressedFile?.size ?? 0);

  async function handleFile(e) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setCompressError(null);

    // Initial check: don't accept gigantic non-image payloads
    if (rawFile.size > 25 * 1024 * 1024) {
      setCompressError('Photo file is too large (over 25 MB). Please choose a smaller image.');
      e.target.value = '';
      return;
    }

    setCompressing(true);
    setOriginalSize(rawFile.size);

    try {
      // Compress to max 1600px JPEG quality 0.8
      const result = await compressImage(rawFile, {
        maxDimension: 1600,
        quality: 0.8,
      });

      if (result.compressedSize > MAX_BYTES) {
        throw new Error(
          `Compressed image (${formatBytes(result.compressedSize)}) still exceeds the 5 MB limit. Please choose a different photo.`,
        );
      }

      setCompressedSize(result.compressedSize);
      setPhoto(rawFile, result.file, result.previewUrl);
    } catch (err) {
      setCompressError(err.message || 'Failed to process selected image. Please try again.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  }

  function handleCameraClick() {
    setCompressError(null);
    try {
      cameraRef.current?.click();
    } catch {
      setCompressError('Could not open camera on this device. Please choose from files instead.');
    }
  }

  return (
    <div className={styles.flow}>
      <PageHeader title="Report a hazard" onBack={() => navigate('/app')} />
      <StepIndicator total={3} current={1} />

      <main className={styles.body}>
        <h2 className={styles.heading}>Capture or upload photo</h2>
        <p className={styles.sub}>
          Our AI analyzes water levels and obstruction from your photo to evaluate flood risk.
        </p>

        {/* ── Guidance Hint Box ────────────────────────────────────────────── */}
        <div className={styles.scaleHintBox} role="note">
          <span className={styles.scaleHintIcon} aria-hidden="true">
            <Lightbulb size={20} />
          </span>
          <div>
            <strong className={styles.scaleHintTitle}>Help AI measure depth:</strong>
            <p className={styles.scaleHintText}>
              Include a tyre, kerb, road edge or a person for scale.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {compressError && (
          <ErrorBanner message={compressError} />
        )}

        {compressing ? (
          <div className={styles.compressingCard} role="status" aria-live="polite">
            <span className={styles.compressingSpinner} aria-hidden="true">
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </span>
            <p className={styles.compressingText}>
              Optimizing and compressing photo for AI analysis…
            </p>
          </div>
        ) : photoPreview ? (
          /* ── Photo Preview State ─────────────────────────────────────────── */
          <div className={styles.previewContainer}>
            <div className={styles.previewWrap}>
              <img
                src={photoPreview}
                alt="Selected hazard incident"
                className={styles.previewImg}
              />
            </div>

            <div className={styles.photoMetaRow}>
              <span className={styles.metaBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} aria-hidden="true" />
                Compressed: {formatBytes(compressedSize || compressedFile?.size)}
                {originalSize ? ` (from ${formatBytes(originalSize)})` : ''}
              </span>
              <button
                type="button"
                className={styles.changeLink}
                onClick={() => galleryRef.current?.click()}
              >
                Change photo
              </button>
            </div>
          </div>
        ) : (
          /* ── Photo Capture Selection ─────────────────────────────────────── */
          <div className={styles.pickGrid}>
            {/* Take Photo — triggers device camera */}
            <button
              type="button"
              className={styles.pickCard}
              onClick={handleCameraClick}
              aria-label="Take photo with camera"
            >
              <span className={styles.pickIcon} aria-hidden="true">
                <Camera size={28} />
              </span>
              <span className={styles.pickLabel}>Take photo</span>
              <span className={styles.pickSub}>Rear camera</span>
            </button>

            {/* Choose File / Gallery */}
            <button
              type="button"
              className={styles.pickCard}
              onClick={() => galleryRef.current?.click()}
              aria-label="Choose photo from device gallery"
            >
              <span className={styles.pickIcon} aria-hidden="true">
                <ImageIcon size={28} />
              </span>
              <span className={styles.pickLabel}>Choose file</span>
              <span className={styles.pickSub}>Gallery or files</span>
            </button>
          </div>
        )}

        {/* Hidden HTML input elements */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.hiddenInput}
          onChange={handleFile}
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleFile}
          aria-hidden="true"
          tabIndex={-1}
        />
      </main>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!photo || compressing}
          onClick={() => navigate('/report/location')}
        >
          Next — Location coordinates →
        </Button>
      </footer>
    </div>
  );
}
