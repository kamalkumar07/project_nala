/**
 * DemoControlPanel.jsx — Interactive demonstration panel for PARVAT (?demo=1).
 *
 * Requirements:
 *   • Small "Sample data" chip
 *   • "Run demo story" button scripting:
 *     1. report submitted
 *     2. Analysis Moment plays
 *     3. map flies to a rippling pin
 *     4. district turns HIGH
 *     5. Priority list re-ranks
 *     6. alert toast appears
 *   • Keyboard shortcuts: D opens demo panel, R replays
 *   • Respects reduced motion
 */

import React from 'react';
import { 
  Play, 
  RotateCcw, 
  X, 
  Sliders, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Activity, 
  Bell, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button, GlassPanel } from '../../components/ui/index.js';
import styles from './HimachalMap.module.css';

const STORY_STEPS = [
  { id: 'submitting', label: '1. Citizen report submitted', desc: 'Photo captured at Dharamshala Bypass, Kangra with GPS lock.' },
  { id: 'analyzing', label: '2. Analysis moment plays', desc: 'Multimodal AI gives a knee-deep water-depth reading.' },
  { id: 'flying', label: '3. Map flies to rippling pin', desc: 'Camera centers on coordinates with expanding wave pulse.' },
  { id: 'district_high', label: '4. District turns HIGH', desc: 'Kangra district boundary updates fill color to HIGH (#E5742B).' },
  { id: 'reranking', label: '5. Priority list re-ranks', desc: 'Kangra incident jumps to the top of the prioritized ward feed.' },
  { id: 'alert_toast', label: '6. Alert toast appears', desc: 'Emergency hazard warning toast dispatches to nearby residents.' },
];

export function DemoControlPanel({
  isOpen,
  onClose,
  onRunStory,
  onResetDemo,
  storyStep = 'idle', // 'idle' | 'submitting' | 'analyzing' | 'flying' | 'district_high' | 'reranking' | 'alert_toast' | 'complete'
  isStoryRunning = false,
  totalHotspotsCount = 12,
}) {
  if (!isOpen) return null;

  return (
    <div 
      className={styles.demoPanelBackdrop} 
      onClick={onClose}
      role="presentation"
    >
      <div 
        className={styles.demoPanelModal} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Demo mode controls and story script"
      >
        <GlassPanel variant="elevated" padding="lg" className={styles.demoGlassInner}>
          {/* Header */}
          <div className={styles.demoPanelHeader}>
            <div className={styles.demoPanelTitleRow}>
              <Sliders size={18} aria-hidden="true" className={styles.demoPanelIcon} />
              <h2 className={styles.demoPanelTitle}>Demo controls</h2>
              <span className={styles.sampleDataChip}>
                <span className={styles.sampleDataDot} aria-hidden="true" />
                Sample data
              </span>
            </div>

            <button
              type="button"
              className={styles.demoCloseBtn}
              onClick={onClose}
              aria-label="Close demo panel (Press D or Escape)"
              title="Close panel [D / Esc]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className={styles.demoPanelSubtitle}>
            Test PARVAT's hazard intake and risk ranking flow with demonstration data across Himachal Pradesh.
          </p>

          {/* Primary Action Buttons */}
          <div className={styles.demoActionRow}>
            <button
              type="button"
              className={`${styles.runDemoStoryBtn} ${styles.runDemoStoryBtnLarge}`}
              onClick={onRunStory}
              disabled={isStoryRunning}
              aria-label="Run demo story (Press R to run)"
            >
              <Play size={15} fill="currentColor" aria-hidden="true" />
              <span>{isStoryRunning ? 'Playing story...' : 'Run demo story'}</span>
              <kbd className={styles.shortcutKbd}>R</kbd>
            </button>

            <button
              type="button"
              className={styles.resetDemoBtn}
              onClick={onResetDemo}
              disabled={isStoryRunning}
              aria-label="Reset demo to seeded state"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset state</span>
            </button>
          </div>

          {/* Scripted Sequence Stepper */}
          <div className={styles.storyStepperWrap}>
            <h3 className={styles.storyStepperTitle}>Scripted sequence breakdown:</h3>
            <div className={styles.storyStepsList}>
              {STORY_STEPS.map((step, idx) => {
                const isCurrent = storyStep === step.id;
                const isDone =
                  storyStep === 'complete' ||
                  (storyStep === 'alert_toast' && idx <= 5) ||
                  (storyStep === 'reranking' && idx <= 4) ||
                  (storyStep === 'district_high' && idx <= 3) ||
                  (storyStep === 'flying' && idx <= 2) ||
                  (storyStep === 'analyzing' && idx <= 1) ||
                  (storyStep === 'submitting' && idx === 0);

                return (
                  <div 
                    key={step.id} 
                    className={`${styles.storyStepCard} ${isCurrent ? styles.storyStepActive : ''} ${isDone ? styles.storyStepDone : ''}`}
                  >
                    <div className={styles.storyStepIconCol}>
                      {isDone ? (
                        <CheckCircle2 size={16} color="#2E9E5B" aria-hidden="true" />
                      ) : (
                        <span className={styles.storyStepNum}>{idx + 1}</span>
                      )}
                    </div>
                    <div className={styles.storyStepContent}>
                      <strong className={styles.storyStepLabel}>{step.label}</strong>
                      <p className={styles.storyStepDesc}>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seeded Data Status & Shortcuts Footer */}
          <div className={styles.demoFooterMeta}>
            <div className={styles.seededDistrictsBadge}>
              <Layers size={14} aria-hidden="true" />
              <span>12 Himachal districts seeded (clearly sample values)</span>
            </div>
            <div className={styles.shortcutHintsRow}>
              <span>Press <kbd className={styles.miniKbd}>D</kbd> to toggle panel</span>
              <span>•</span>
              <span>Press <kbd className={styles.miniKbd}>R</kbd> to replay story</span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
