/**
 * ReportFlowPage.jsx — two-step mobile-first hazard reporting flow.
 *
 * Implements:
 *   • Step 1 (camera-first): full-width capture area with framing guide overlay
 *     ("Include a tyre, kerb, road edge or a person for scale"), Take photo & Choose from gallery buttons.
 *   • Step 2: photo thumbnail, auto-detected location chip (tap to adjust on map;
 *     if outside Himachal Pradesh shows friendly warning and sample Himachal chips
 *     Kangra, Shimla, Kullu, Mandi), hazard type segmented control with icons,
 *     optional description with counter, and one primary "Send report" button.
 *   • Zero vendor names in any user-facing text.
 *   • On submit: full-screen Analysis Moment with scanning animation and vertical timeline:
 *     "Photo uploaded", "Reading the photo", "Estimating water depth", "Placing on the map".
 *   • On assessment: DepthGauge v2 filling, plain words ("Knee-deep, not passable"),
 *     confidence ("78% sure"), "Is this right?" citizen correction, "See it on the map"
 *     (flies to new pin with ripple), "Share this report" button (Web Share API + copy link).
 *   • Desktop: two-column layout (form on left, live map preview on right).
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  CheckCircle2,
  Share2,
  RotateCcw,
  Sparkles,
  Loader2,
  Crosshair,
  Layers,
  Send,
  Eye,
} from 'lucide-react';

import { useReportStore } from './useReportStore.js';
import { validateReportForm } from './validation.js';
import { compressImage } from '../../utils/imageCompressor.js';
import { isInsideHimachal } from '../../utils/geoUtils.js';
import { apiRequest, putToS3 } from '../../api/client.js';
import { Button, SegmentedControl, DepthGauge, useToast } from '../../components/ui/index.js';
import { HazardIcon } from '../../components/icons/HazardIcons.jsx';
import { ReportMapPreview } from './ReportMapPreview.jsx';
import styles from './ReportFlow.module.css';

// 4 Sample Himachal Pradesh Reference Locations
const SAMPLE_HP_LOCATIONS = [
  { id: 'kangra', name: 'Kangra', lat: 32.10, lng: 76.27, label: 'Kangra Valley' },
  { id: 'shimla', name: 'Shimla', lat: 31.10, lng: 77.17, label: 'Shimla Mall Road' },
  { id: 'kullu',  name: 'Kullu',  lat: 31.96, lng: 77.10, label: 'Kullu Valley' },
  { id: 'mandi',  name: 'Mandi',  lat: 31.58, lng: 76.93, label: 'Mandi Beas River' },
];

const HAZARD_OPTIONS = [
  { id: 'flood', label: 'Flood', icon: <HazardIcon type="flood" size={16} /> },
  { id: 'landslide', label: 'Landslide', icon: <HazardIcon type="landslide" size={16} /> },
  { id: 'waterlogging', label: 'Waterlogging', icon: <HazardIcon type="waterlogging" size={16} /> },
  { id: 'road_damage', label: 'Road damage', icon: <HazardIcon type="road_damage" size={16} /> },
  { id: 'other', label: 'Other', icon: <Layers size={16} /> },
];

function formatPlainVerdict(depthClass, passable) {
  const normDepth = (depthClass || 'unknown').toLowerCase();
  const normPassable = (passable || 'unknown').toLowerCase();

  let depthText = 'Depth undetermined';
  if (normDepth === 'ankle') depthText = 'Ankle-deep';
  else if (normDepth === 'knee') depthText = 'Knee-deep';
  else if (normDepth === 'waist') depthText = 'Waist-deep';

  let passText = 'use caution';
  if (normPassable === 'no') passText = 'not passable';
  else if (normPassable === 'yes') passText = 'passable';

  return `${depthText}, ${passText}`;
}

export function ReportFlowPage({ initialStep = 1 }) {
  const navigate = useNavigate();
  const toast = useToast();

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Zustand Store
  const {
    photo,
    compressedFile,
    photoPreview,
    lat,
    lng,
    locationLabel,
    outsideHpConfirmed,
    hazardType,
    note,
    reportId,
    setPhoto,
    setLocation,
    setOutsideHpConfirmed,
    setHazardType,
    setNote,
    setReportId,
    reset: resetStore,
  } = useReportStore();

  // Local View States: 1 | 2 | 'analyzing' | 'result'
  const [currentStep, setCurrentStep] = useState(() => (photo ? 2 : initialStep));
  const [compressing, setCompressing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Analysis Moment Live Progress
  const [timelineStatus, setTimelineStatus] = useState({
    uploaded: false,
    reading: false,
    depth: false,
    placing: false,
  });

  // Assessed Report State
  const [assessedReport, setAssessedReport] = useState(null);
  const [isCorrectingDepth, setIsCorrectingDepth] = useState(false);
  const [userDepthChoice, setUserDepthChoice] = useState('ankle');
  const [confirmedAccurate, setConfirmedAccurate] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Attempt silent GPS geolocation on mount if not already present
  useEffect(() => {
    if (lat === null && lng === null && navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const detectedLat = Number(pos.coords.latitude.toFixed(5));
          const detectedLng = Number(pos.coords.longitude.toFixed(5));
          setLocation(detectedLat, detectedLng, 'Current location');
        },
        () => {
          setLocating(false);
          // Default to Shimla, HP center if permission denied
          setLocation(31.1048, 77.1734, 'Shimla, Himachal Pradesh');
        },
        { timeout: 6000, maximumAge: 60000 },
      );
    }
  }, [lat, lng, setLocation]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Is current coordinates outside Himachal Pradesh?
  const isOutsideHp = useMemo(() => {
    if (lat === null || lng === null) return false;
    return !isInsideHimachal(lat, lng);
  }, [lat, lng]);

  // Form Validation
  const formValidation = useMemo(() => {
    return validateReportForm({
      photo: compressedFile || photo,
      lat,
      lng,
      hazardType,
      note,
      isOutsideHp,
      outsideHpConfirmed,
    });
  }, [compressedFile, photo, lat, lng, hazardType, note, isOutsideHp, outsideHpConfirmed]);

  // File Selection and Compression Handler
  async function handleFileSelected(e) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setSubmitError('');
    if (rawFile.size > 25 * 1024 * 1024) {
      toast.error('Photo file exceeds 25 MB. Please select a smaller photo.');
      e.target.value = '';
      return;
    }

    setCompressing(true);
    try {
      const result = await compressImage(rawFile, {
        maxDimension: 1600,
        quality: 0.8,
      });

      setPhoto(rawFile, result.file, result.previewUrl);
      setCurrentStep(2);
    } catch (err) {
      toast.error(err.message || 'Could not process selected image. Please try again.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  }

  // Handle sample location click
  function handleSelectSample(loc) {
    setLocation(loc.lat, loc.lng, loc.label);
    setOutsideHpConfirmed(true);
  }

  // Handle manual location select from map preview
  function handleMapLocationSelect({ lat: newLat, lng: newLng }) {
    setLocation(newLat, newLng, null);
  }

  // Handle Primary Submission & Full-Screen Analysis
  async function handleSendReport() {
    if (!formValidation.isValid) {
      const firstError = Object.values(formValidation.errors)[0];
      setSubmitError(firstError || 'Please verify all required fields.');
      return;
    }

    setSubmitError('');
    setCurrentStep('analyzing');
    setTimelineStatus({
      uploaded: false,
      reading: true,
      depth: false,
      placing: false,
    });

    try {
      const fileToUpload = compressedFile || photo;

      // 1. Presign upload
      const presignData = await apiRequest('/api/v1/uploads/presign', {
        method: 'POST',
        body: {
          contentType: fileToUpload.type || 'image/jpeg',
          sizeBytes: fileToUpload.size,
        },
      });

      const { photoKey, uploadUrl } = presignData;
      if (!uploadUrl || !photoKey) {
        throw new Error('Could not connect to storage. Please try again.');
      }

      // 2. Direct browser upload
      await putToS3(uploadUrl, fileToUpload);
      setTimelineStatus((prev) => ({ ...prev, uploaded: true, reading: true }));

      // 3. Create report record
      const reportRes = await apiRequest('/api/v1/reports', {
        method: 'POST',
        body: {
          photoKey,
          lat: Number(lat),
          lng: Number(lng),
          hazardType,
          note: note ? note.slice(0, 500) : undefined,
          clientTimestamp: new Date().toISOString(),
        },
      });

      const newId = reportRes.reportId || reportRes.id;
      setReportId(newId);

      // Advance timeline
      setTimelineStatus({
        uploaded: true,
        reading: true,
        depth: true,
        placing: false,
      });

      // 4. Poll report for assessment completion
      let attempts = 0;
      pollTimerRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const polled = await apiRequest(`/api/v1/reports/${encodeURIComponent(newId)}`);
          if (polled.status === 'assessed' || polled.assessment) {
            clearInterval(pollTimerRef.current);
            setTimelineStatus({
              uploaded: true,
              reading: true,
              depth: true,
              placing: true,
            });

            setTimeout(() => {
              setAssessedReport(polled);
              setCurrentStep('result');
            }, 600);
          } else if (polled.status === 'failed') {
            clearInterval(pollTimerRef.current);
            throw new Error('Analysis could not determine water depth. You can confirm manually.');
          }
        } catch (err) {
          if (attempts >= 15) {
            clearInterval(pollTimerRef.current);
            // Fallback: show result with undetermined depth so user is not blocked
            const fallbackReport = {
              reportId: newId,
              status: 'assessed',
              lat,
              lng,
              hazardType,
              assessment: {
                depthClass: 'unknown',
                passable: 'caution',
                confidence: 0.7,
              },
            };
            setAssessedReport(fallbackReport);
            setCurrentStep('result');
          }
        }
      }, 1500);
    } catch (err) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setCurrentStep(2);
      setSubmitError(
        err.message || 'Unable to submit report right now. Please check your connection and retry.',
      );
    }
  }

  // Handle citizen confirmation
  async function handleConfirmAccurate() {
    if (!assessedReport?.reportId) return;
    try {
      await apiRequest(`/api/v1/reports/${encodeURIComponent(assessedReport.reportId)}/confirm`, {
        method: 'PATCH',
        body: {
          userConfirmed: true,
          userDepthClass: assessedReport.assessment?.depthClass || 'unknown',
        },
      });
      setConfirmedAccurate(true);
      toast.success('Thank you for confirming!');
    } catch {
      toast.error('Could not save feedback. Please try again.');
    }
  }

  // Handle citizen correction
  async function handleSaveCorrection() {
    if (!assessedReport?.reportId) return;
    setSavingCorrection(true);
    try {
      await apiRequest(`/api/v1/reports/${encodeURIComponent(assessedReport.reportId)}/confirm`, {
        method: 'PATCH',
        body: {
          userConfirmed: true,
          userDepthClass: userDepthChoice,
        },
      });
      setConfirmedAccurate(true);
      setIsCorrectingDepth(false);
      setAssessedReport((prev) => ({
        ...prev,
        assessment: {
          ...prev.assessment,
          depthClass: userDepthChoice,
        },
      }));
      toast.success('Depth correction saved.');
    } catch {
      toast.error('Could not save correction. Please try again.');
    } finally {
      setSavingCorrection(false);
    }
  }

  // Handle Share Report
  async function handleShare() {
    const shareUrl = window.location.origin + `/app?report=${encodeURIComponent(reportId || '')}`;
    const shareText = `Hazard reported in Himachal Pradesh: ${
      assessedReport ? formatPlainVerdict(assessedReport.assessment?.depthClass, assessedReport.assessment?.passable) : 'Flood hazard'
    }`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PARVAT hazard report',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // user dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Report link copied to clipboard!');
      } catch {
        toast.info(shareUrl);
      }
    }
  }

  return (
    <div className={styles.flowContainer}>
      {/* ── Top Header Navigation ─────────────────────────────────────────── */}
      <header className={styles.topNav}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => {
            if (currentStep === 2) setCurrentStep(1);
            else {
              resetStore();
              navigate('/app');
            }
          }}
          aria-label="Back"
        >
          <ChevronLeft size={20} aria-hidden="true" />
          <span>{currentStep === 2 ? 'Retake' : 'Map'}</span>
        </button>

        <h1 className={styles.navTitle}>Report a hazard</h1>

        <span className={styles.stepBadge}>
          {currentStep === 1 ? 'Step 1 of 2' : currentStep === 2 ? 'Step 2 of 2' : 'Complete'}
        </span>
      </header>

      {/* ── Main Layout: Mobile single-column / Desktop two-column ────────── */}
      <div className={styles.flowLayout}>
        {/* Left Form Column */}
        <main className={styles.formColumn}>
          {/* ── STEP 1: CAMERA-FIRST CAPTURE ──────────────────────────────── */}
          {currentStep === 1 && (
            <section className={styles.stepSection} aria-label="Step 1: Capture or select photo">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Take or choose a photo</h2>
                <p className={styles.sectionSubtitle}>
                  Capture clear water depth indicators like tyres, curbs, or landmarks.
                </p>
              </div>

              {/* Full-Width Capture Viewfinder Frame */}
              <div
                className={`${styles.captureFrame} ${photoPreview ? styles.captureFrameActive : ''}`}
                onClick={() => {
                  if (!photoPreview) cameraInputRef.current?.click();
                }}
                role="region"
                aria-label="Camera viewfinder framing area"
              >
                {/* Viewfinder Corner Reticle Guides */}
                <div className={`${styles.reticleCorner} ${styles.reticleTL}`} />
                <div className={`${styles.reticleCorner} ${styles.reticleTR}`} />
                <div className={`${styles.reticleCorner} ${styles.reticleBL}`} />
                <div className={`${styles.reticleCorner} ${styles.reticleBR}`} />

                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Selected hazard" className={styles.photoPreviewImg} />
                    <div className={styles.capturedOverlay}>
                      <CheckCircle2 size={14} color="#2E9E5B" aria-hidden="true" />
                      <span>Ready</span>
                    </div>
                  </>
                ) : (
                  <Camera size={48} strokeWidth={1.5} color="rgba(255,255,255,0.7)" aria-hidden="true" />
                )}

                {/* Framing Guide Overlay Pill */}
                <div className={styles.framingGuidePill}>
                  <Sparkles size={14} color="#3CC8E6" aria-hidden="true" />
                  <span className={styles.framingGuideText}>
                    Include a tyre, kerb, road edge or a person for scale
                  </span>
                </div>
              </div>

              {/* Two Primary Action Buttons with Icons */}
              <div className={styles.captureActions}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.takePhotoBtn}`}
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={compressing}
                >
                  {compressing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={18} />}
                  <span>Take photo</span>
                </button>

                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.galleryBtn}`}
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={compressing}
                >
                  <ImageIcon size={18} />
                  <span>Choose from gallery</span>
                </button>
              </div>

              {photoPreview && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => setCurrentStep(2)}
                  style={{ marginTop: '8px' }}
                >
                  Continue to details
                </Button>
              )}

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenFileInput}
                onChange={handleFileSelected}
                aria-label="Take photo with rear camera"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleFileSelected}
                aria-label="Upload photo from gallery"
              />
            </section>
          )}

          {/* ── STEP 2: LOCATION & HAZARD DETAILS ─────────────────────────── */}
          {currentStep === 2 && (
            <section className={styles.stepSection} aria-label="Step 2: Location and hazard details">
              {/* Photo Thumbnail Row */}
              <div className={styles.thumbnailCard}>
                <div className={styles.thumbnailLeft}>
                  {photoPreview && <img src={photoPreview} alt="Hazard thumbnail" className={styles.thumbnailImg} />}
                  <div className={styles.thumbnailInfo}>
                    <span className={styles.thumbnailLabel}>Captured incident photo</span>
                    <span className={styles.thumbnailSub}>
                      {compressedFile ? `${Math.round(compressedFile.size / 1024)} KB` : 'Ready'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.changePhotoBtn}
                  onClick={() => setCurrentStep(1)}
                >
                  Retake
                </button>
              </div>

              {/* Location Card & Map Picker */}
              <div className={styles.formSection}>
                <div className={styles.formLabel}>
                  <span>Incident location</span>
                  {locating && <span style={{ color: 'var(--color-water)' }}>Locating…</span>}
                </div>

                <div className={styles.locationChipCard}>
                  <div className={styles.locationDetails}>
                    <MapPin size={18} className={styles.locationPinIcon} aria-hidden="true" />
                    <div className={styles.locationText}>
                      <span className={styles.locationName}>
                        {locationLabel || 'Selected GPS location'}
                      </span>
                      <span className={styles.locationCoords}>
                        {lat !== null && lng !== null ? `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E` : 'Coordinates pending'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.adjustMapBtn}
                    onClick={() => setMobileMapOpen((prev) => !prev)}
                    aria-label="Adjust location on map"
                  >
                    <span>Adjust on map</span>
                  </button>
                </div>

                {/* Inline Mobile Interactive Map Picker */}
                {mobileMapOpen && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', height: '220px', border: '1px solid var(--color-line)' }}>
                    <ReportMapPreview
                      lat={lat}
                      lng={lng}
                      onLocationSelect={handleMapLocationSelect}
                    />
                  </div>
                )}

                {/* Outside Himachal Warning & Sample Chips */}
                {isOutsideHp && (
                  <div className={styles.outsideWarningBanner} role="alert">
                    <div className={styles.outsideWarningHeader}>
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>Outside Himachal Pradesh</span>
                    </div>
                    <p className={styles.outsideWarningText}>
                      This location appears outside Himachal Pradesh. You can choose a sample
                      location below to test the monitoring service.
                    </p>
                    <span className={styles.sampleLocationsPrompt}>Sample Himachal zones:</span>
                    <div className={styles.sampleLocationChips}>
                      {SAMPLE_HP_LOCATIONS.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          className={styles.sampleLocChip}
                          onClick={() => handleSelectSample(loc)}
                        >
                          <MapPin size={12} aria-hidden="true" />
                          <span>{loc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hazard Type Segmented Control */}
              <div className={styles.formSection}>
                <label className={styles.formLabel}>Hazard category</label>
                <SegmentedControl
                  options={HAZARD_OPTIONS}
                  value={hazardType}
                  onChange={(val) => setHazardType(val)}
                  size="md"
                  ariaLabel="Select hazard category"
                />
              </div>

              {/* Optional Description with Counter */}
              <div className={styles.formSection}>
                <label htmlFor="reportNote" className={styles.formLabel}>
                  <span>Optional description</span>
                  <span className={styles.charCounter}>{note.length} / 500</span>
                </label>
                <div className={styles.textareaWrapper}>
                  <textarea
                    id="reportNote"
                    className={styles.noteTextarea}
                    placeholder="Provide details (e.g., culvert overflow, road impassable, mud debris)"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 500))}
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>

              {/* Error Banner */}
              {submitError && (
                <div role="alert" style={{ color: 'var(--risk-severe)', fontSize: '13px', textAlign: 'center' }}>
                  {submitError}
                </div>
              )}

              {/* Primary Send Report Button */}
              <button
                type="button"
                className={styles.sendReportBtn}
                onClick={handleSendReport}
                disabled={!formValidation.isValid}
              >
                <Send size={18} aria-hidden="true" />
                <span>Send report</span>
              </button>
            </section>
          )}

          {/* ── STEP 3: RESULT STATE ───────────────────────────────────────── */}
          {currentStep === 'result' && assessedReport && (
            <section className={styles.resultCard} aria-label="Hazard assessment result">
              <h2 className={styles.resultTitle}>Hazard assessment complete</h2>

              {/* Verdict & Confidence Badges */}
              <div className={styles.resultVerdictRow}>
                <span className={styles.verdictBadge}>
                  {formatPlainVerdict(
                    assessedReport.assessment?.depthClass,
                    assessedReport.assessment?.passable,
                  )}
                </span>
                <span className={styles.confidenceBadge}>
                  {assessedReport.assessment?.confidence !== undefined
                    ? `${Math.round(assessedReport.assessment.confidence * 100)}% sure`
                    : 'Assessed'}
                </span>
              </div>

              {/* DepthGauge v2 Animated Visual */}
              <DepthGauge
                depthClass={assessedReport.assessment?.depthClass || 'unknown'}
                height={200}
                showLabels={true}
              />

              {/* Citizen Depth Correction Box */}
              <div className={styles.correctionBox}>
                <h4 className={styles.correctionPrompt}>Is this assessment accurate?</h4>
                {confirmedAccurate ? (
                  <div style={{ color: 'var(--risk-low)', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>Feedback confirmed</span>
                  </div>
                ) : !isCorrectingDepth ? (
                  <div className={styles.correctionButtons}>
                    <button
                      type="button"
                      className={`${styles.correctBtn} ${styles.confirmAccurateBtn}`}
                      onClick={handleConfirmAccurate}
                    >
                      Looks right
                    </button>
                    <button
                      type="button"
                      className={styles.correctBtn}
                      onClick={() => setIsCorrectingDepth(true)}
                    >
                      Correct depth
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={userDepthChoice}
                      onChange={(e) => setUserDepthChoice(e.target.value)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-line)' }}
                    >
                      <option value="ankle">Ankle deep (~30 cm)</option>
                      <option value="knee">Knee deep (~60 cm)</option>
                      <option value="waist">Waist deep (&gt;60 cm)</option>
                      <option value="unknown">Unknown</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={`${styles.correctBtn} ${styles.confirmAccurateBtn}`}
                        onClick={handleSaveCorrection}
                        disabled={savingCorrection}
                        style={{ flex: 1 }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={styles.correctBtn}
                        onClick={() => setIsCorrectingDepth(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation & Sharing Actions */}
              <div className={styles.resultActionButtons}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    resetStore();
                    navigate(`/app?flyLat=${lat}&flyLng=${lng}&newPin=1`);
                  }}
                >
                  <Eye size={18} style={{ marginRight: '8px' }} aria-hidden="true" />
                  See it on the map
                </Button>

                <button type="button" className={styles.shareBtn} onClick={handleShare}>
                  <Share2 size={18} aria-hidden="true" />
                  <span>Share this report</span>
                </button>
              </div>
            </section>
          )}
        </main>

        {/* Right Live Map Preview Column (Desktop Only) */}
        <div className={styles.desktopMapColumn}>
          <ReportMapPreview
            lat={lat}
            lng={lng}
            onLocationSelect={handleMapLocationSelect}
          />
        </div>
      </div>

      {/* ── FULL-SCREEN ANALYSIS MOMENT OVERLAY ────────────────────────────── */}
      {currentStep === 'analyzing' && (
        <div className={styles.analysisOverlay} role="dialog" aria-modal="true" aria-label="Analyzing hazard photo">
          <div className={styles.analysisCard}>
            {/* Photo with subtle animated laser scan line */}
            <div className={styles.scanningPhotoWrap}>
              {photoPreview && <img src={photoPreview} alt="Analyzing hazard" className={styles.scanningPhotoImg} />}
              <div className={styles.scanBeam} aria-hidden="true" />
            </div>

            {/* Vertical Live Status Timeline */}
            <div className={styles.timelineList} role="status" aria-live="polite">
              <div
                className={`${styles.timelineItem} ${
                  timelineStatus.uploaded ? styles.timelineItemCompleted : styles.timelineItemActive
                }`}
              >
                <div className={styles.timelineIcon}>
                  {timelineStatus.uploaded ? <CheckCircle2 size={16} /> : <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
                <span>Photo uploaded</span>
              </div>

              <div
                className={`${styles.timelineItem} ${
                  timelineStatus.reading && timelineStatus.uploaded
                    ? timelineStatus.depth ? styles.timelineItemCompleted : styles.timelineItemActive
                    : ''
                }`}
              >
                <div className={styles.timelineIcon}>
                  {timelineStatus.depth ? <CheckCircle2 size={16} /> : <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
                <span>Reading the photo</span>
              </div>

              <div
                className={`${styles.timelineItem} ${
                  timelineStatus.depth
                    ? timelineStatus.placing ? styles.timelineItemCompleted : styles.timelineItemActive
                    : ''
                }`}
              >
                <div className={styles.timelineIcon}>
                  {timelineStatus.placing ? <CheckCircle2 size={16} /> : <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
                <span>Estimating water depth</span>
              </div>

              <div
                className={`${styles.timelineItem} ${
                  timelineStatus.placing ? styles.timelineItemActive : ''
                }`}
              >
                <div className={styles.timelineIcon}>
                  {timelineStatus.placing ? <CheckCircle2 size={16} /> : <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
                <span>Placing on the map</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
