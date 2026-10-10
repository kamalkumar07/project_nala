/**
 * DemoAnalysisMoment.jsx — Short, plain-language photo analysis sequence
 * during the scripted demo story (?demo=1).
 *
 * Sequence: Photo received, reading the water level, placing on the map.
 *
 * Respects prefers-reduced-motion.
 */

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  Sparkles, 
  MapPin
} from 'lucide-react';
import { DepthGauge } from '../../components/ui/index.js';
import styles from './HimachalMap.module.css';

function createInitialTimeline() {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    uploaded: reducedMotion,
    reading: reducedMotion,
    depth: reducedMotion,
    placing: reducedMotion,
  };
}

export function DemoAnalysisMoment({ onComplete, scenario = null }) {
  const [timeline, setTimeline] = useState(createInitialTimeline);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      const timer = setTimeout(() => onComplete?.(), 900);
      return () => clearTimeout(timer);
    }

    const t1 = setTimeout(() => {
      setTimeline((prev) => ({ ...prev, uploaded: true, reading: true }));
    }, 350);

    const t2 = setTimeout(() => {
      setTimeline((prev) => ({ ...prev, depth: true }));
    }, 750);

    const t3 = setTimeout(() => {
      setTimeline((prev) => ({ ...prev, placing: true }));
    }, 1200);

    const t4 = setTimeout(() => {
      onComplete?.();
    }, 1700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div 
      className={styles.analysisOverlay} 
      role="dialog" 
      aria-modal="true" 
      aria-label="Reading submitted hazard photo"
    >
      <div className={styles.analysisCard}>
        {/* Header */}
        <div className={styles.analysisHeader}>
          <div className={styles.analysisHeaderBadge}>
            <Sparkles size={14} aria-hidden="true" />
            <span>Reading the photo</span>
          </div>
          <span className={styles.analysisGpsChip}>
            <MapPin size={12} aria-hidden="true" />
            {scenario?.coords
              ? `${scenario.coords.lat}°N, ${scenario.coords.lng}°E (Kangra)`
              : 'Dharamshala, Kangra'}
          </span>
        </div>

        {/* Visual photo scanning box with framing */}
        <div className={styles.analysisPhotoWrap}>
          <div className={styles.analysisGraphicScene} aria-hidden="true">
            <div className={styles.waterFloodGraphic} />
            <div className={styles.roadSilhouette} />
            <div className={styles.wheelHubMarker}>
              <span className={styles.wheelHubText}>Waterline: wheel hub</span>
            </div>
            <div className={styles.scanBeamLine} />
          </div>

          <div className={styles.analysisGaugeWrap}>
            <DepthGauge
              depthClass={timeline.depth ? scenario?.report?.assessment?.depthClass || 'knee' : 'unknown'}
              height={140}
            />
          </div>
        </div>

        {/* Vertical Live Status Timeline */}
        <div className={styles.timelineList} role="status" aria-live="polite">
          <div
            className={`${styles.timelineItem} ${
              timeline.uploaded ? styles.timelineItemCompleted : styles.timelineItemActive
            }`}
          >
            <div className={styles.timelineIcon}>
              {timeline.uploaded ? <CheckCircle2 size={16} /> : <Loader2 size={16} className={styles.spinIcon} />}
            </div>
            <span>Photo received</span>
          </div>

          <div
            className={`${styles.timelineItem} ${
              timeline.reading
                ? timeline.depth ? styles.timelineItemCompleted : styles.timelineItemActive
                : ''
            }`}
          >
            <div className={styles.timelineIcon}>
              {timeline.depth ? <CheckCircle2 size={16} /> : <Loader2 size={16} className={styles.spinIcon} />}
            </div>
            <span>Reading the water level</span>
          </div>

          <div
            className={`${styles.timelineItem} ${
              timeline.depth
                ? timeline.placing ? styles.timelineItemCompleted : styles.timelineItemActive
                : ''
            }`}
          >
            <div className={styles.timelineIcon}>
              {timeline.placing ? <CheckCircle2 size={16} /> : <Loader2 size={16} className={styles.spinIcon} />}
            </div>
            <span>Placing on the map</span>
          </div>
        </div>

        {/* Plain-language reading */}
        {timeline.depth && (
          <div className={styles.analysisFindingBox}>
            <div className={styles.findingPill}>
              <AlertTriangle size={14} aria-hidden="true" color="#E5742B" />
              <strong>Knee-deep water · about 60 cm</strong>
            </div>
            <p className={styles.findingRationale}>Not passable for two-wheelers. Advisory only.</p>
          </div>
        )}
      </div>
    </div>
  );
}
