/**
 * ScoreRing — accessible SVG circular ring displaying a 0–100 risk score
 * with animated count-up and tabular numerals.
 *
 * Props:
 *   score       number — 0 to 100
 *   size        number — diameter in pixels (default 80)
 *   strokeWidth number — circle stroke width (default 7)
 *   showLabel   bool — show numeric score inside ring (default true)
 *   animate     bool — whether to run count-up animation (default true)
 */

import React, { useState, useEffect, useRef } from 'react';
import styles from './ScoreRing.module.css';

function getBandColor(score) {
  if (score >= 75) return 'var(--color-risk-severe)';
  if (score >= 50) return 'var(--color-risk-high)';
  if (score >= 25) return 'var(--color-risk-moderate)';
  return 'var(--color-risk-low)';
}

function getBandLabel(score) {
  if (score >= 75) return 'Severe';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

export function ScoreRing({
  score = 0,
  size = 80,
  strokeWidth = 7,
  showLabel = true,
  animate = true,
  className = '',
}) {
  const targetScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const [displayScore, setDisplayScore] = useState(() => (animate ? 0 : targetScore));
  const animRef = useRef(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!animate || prefersReducedMotion) {
      setDisplayScore(targetScore);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();
    const startScore = displayScore;

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startScore + (targetScore - startScore) * eased);
      setDisplayScore(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame);
      }
    }

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetScore, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const strokeColor = getBandColor(targetScore);
  const bandName = getBandLabel(targetScore);

  return (
    <div
      className={`${styles.ringWrap} ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={targetScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Risk score: ${targetScore} out of 100 (${bandName} risk)`}
    >
      <svg
        className={styles.svg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track */}
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress fill */}
        <circle
          className={styles.progress}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <div className={styles.labelWrap}>
          <span className={`${styles.scoreText} tabular-nums`} style={{ color: strokeColor }}>
            {displayScore}
          </span>
          <span className={styles.subText}>/100</span>
        </div>
      )}
    </div>
  );
}
