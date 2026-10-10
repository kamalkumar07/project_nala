/**
 * InteractiveDemo — 3-step interactive widget demonstrating PARVAT's core loop:
 *   Photo -> AI reads the hazard -> Pin appears on a mini map.
 *
 * Uses local sample scenarios from Himachal Pradesh.
 * Zero invented statistics; pure functional demonstration.
 */

import { useState } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  MapPin, 
  Compass, 
  Bell, 
  Truck, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { Card, Button, RiskBadge, DepthGauge, ScoreRing } from '../../components/ui/index.js';
import { HimachalMiniMap } from './HimachalMiniMap.jsx';
import styles from './LandingPage.module.css';

// 3 Real Himachal Pradesh Local Scenarios
const SAMPLE_SCENARIOS = [
  {
    id: 'kangra',
    name: 'Dharamshala Road, Kangra',
    district: 'Kangra District',
    coords: '32.18°N, 76.32°E',
    hazardType: 'Waterlogging & Runoff',
    photoDescription: 'Vehicle wheels half submerged at road junction near Dharamshala bypass',
    depthClass: 'knee',
    passable: 'no',
    passableLabel: 'Not passable for two-wheelers',
    confidence: 88,
    rationale: 'Waterline reaches car tyre wheel hubs. Pedestrian and two-wheeler passage unsafe.',
    riskBand: 'HIGH',
    riskScore: 78,
    pinColor: '#E5742B',
    scene: 'town',
    waterlineY: 174,
  },
  {
    id: 'kullu',
    name: 'Akhara Bazar, Kullu',
    district: 'Kullu District',
    coords: '31.96°N, 77.11°E',
    hazardType: 'Flash Flooding & Debris',
    photoDescription: 'Swift flowing mountain runoff inundating shop fronts along river approach',
    depthClass: 'waist',
    passable: 'no',
    passableLabel: 'Impassable — severe flood surge',
    confidence: 94,
    rationale: 'Deep flooding with rapid surface current. Immediate municipal pump diversion required.',
    riskBand: 'SEVERE',
    riskScore: 92,
    pinColor: '#D64545',
    scene: 'valley',
    waterlineY: 145,
  },
  {
    id: 'shimla',
    name: 'Cart Road Crossing, Shimla',
    district: 'Shimla District',
    coords: '31.10°N, 77.17°E',
    hazardType: 'Street Pooling',
    photoDescription: 'Monsoon puddle pooling around stormwater grate under Cart Road bridge',
    depthClass: 'ankle',
    passable: 'caution',
    passableLabel: 'Passable with caution',
    confidence: 79,
    rationale: 'Shallow pooling under 30 cm depth. Light vehicles should reduce speed.',
    riskBand: 'MODERATE',
    riskScore: 42,
    pinColor: '#E8A317',
    scene: 'bridge',
    waterlineY: 202,
  },
];

function StreetScene({ scenario, animateWater = false }) {
  const sceneTitle = `${scenario.name} street scene with a car, person, kerb, road, and water`;

  return (
    <svg
      className={styles.streetScene}
      viewBox="0 0 440 250"
      role="img"
      aria-label={sceneTitle}
      data-testid="street-scene"
    >
      <defs>
        <linearGradient id={`street-sky-${scenario.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scenario.scene === 'valley' ? '#9CCBD0' : '#BBD7D7'} />
          <stop offset="100%" stopColor="#E4E9DD" />
        </linearGradient>
        <linearGradient id={`street-water-${scenario.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#61B7C8" stopOpacity="0.74" />
          <stop offset="100%" stopColor="#167B9B" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      <rect width="440" height="250" fill={`url(#street-sky-${scenario.id})`} />
      {scenario.scene === 'valley' ? (
        <>
          <path d="M0 112 62 40l43 48 57-65 77 89 48-57 87 64v31H0Z" fill="#759B91" />
          <path d="m20 118 45-52 20 23 21-25 31 54M239 121l49-58 24 29 22-34 55 55" fill="none" stroke="#E7EEE7" strokeWidth="6" opacity=".7" />
          <path d="M0 135q60-22 120 0t120 0 120 0 80 0v40H0Z" fill="#9BB79A" />
        </>
      ) : (
        <>
          <path d="M0 127h440v-54l-55 0-15-38h-54l-12 38h-58l-18-47h-64l-16 47H95L80 55H30L18 73H0Z" fill="#B8C4B3" />
          <path d="M22 127V79h57v48m14 0V91h61v36m18 0V80h53v47m14 0V92h44v35m18 0V76h66v51" fill="#D6D9CA" />
          <path d="M34 92h12m17 0h8m34 15h12m19 0h10m45-15h10m17 0h9m27 15h10m18-15h11m20 0h11m19 15h11" stroke="#91A89F" strokeWidth="4" />
        </>
      )}

      <path d="M58 119h324L440 250H0Z" fill="#59656A" />
      <path d="M57 115h328l8 10H49Z" fill="#D6D0B8" />
      <path d="M49 125h336" stroke="#F5F0DD" strokeWidth="3" />
      <path d="m218 143-7 20h17l7-20m-27 43-8 22h21l8-22" fill="#E4D7AC" opacity=".9" />

      {scenario.scene === 'bridge' && (
        <>
          <path d="M0 103h112v38H0Zm328 0h112v38H328Z" fill="#65736D" />
          <path d="M12 103v38m28-38v38m28-38v38m28-38v38m264-38v38m28-38v38m28-38v38m28-38v38" stroke="#E3E1D1" strokeWidth="4" opacity=".8" />
        </>
      )}

      <g aria-hidden="true">
        <path d="M157 145q5-19 22-22h59q18 4 28 22l11 3v27H143v-21q1-7 14-9Z" fill="#D97748" stroke="#693F36" strokeWidth="3" />
        <path d="m185 128 8-12h39l15 12Z" fill="#C8E1E2" stroke="#693F36" strokeWidth="2" />
        <path d="M202 117v12m18-12v12" stroke="#839FA0" strokeWidth="2" />
        <circle cx="170" cy="174" r="16" fill="#26343B" />
        <circle cx="170" cy="174" r="7" fill="#CFD6D1" />
        <circle cx="258" cy="174" r="16" fill="#26343B" />
        <circle cx="258" cy="174" r="7" fill="#CFD6D1" />
        <path d="M155 151h-9v12h9m131-9h7v10h-7" fill="#F4D17A" />
      </g>

      <g aria-hidden="true" stroke="#31444A" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="356" cy="102" r="11" fill="#805D48" strokeWidth="2" />
        <path d="M355 114v43m0-30-15 17m15-17 14 13m-14 17-12 29m12-29 13 29" fill="none" strokeWidth="8" />
        <path d="M347 128h17" stroke="#D7A86E" strokeWidth="9" />
      </g>

      <g
        className={animateWater ? styles.streetWaterRise : undefined}
        data-testid={animateWater ? 'rising-water' : undefined}
      >
        <rect
          x="0"
          y={scenario.waterlineY}
          width="440"
          height={250 - scenario.waterlineY}
          fill={`url(#street-water-${scenario.id})`}
        />
        <path
          d={`M0 ${scenario.waterlineY}q27-7 55 0t55 0 55 0 55 0 55 0 55 0 55 0 55 0 55 0`}
          fill="none"
          stroke="#D6F2F1"
          strokeWidth="3"
          opacity=".9"
        />
        <path d={`M20 ${scenario.waterlineY + 15}h54m33 9h38m190-11h44m-95 18h33`} stroke="#D5F1EF" strokeWidth="2" opacity=".5" />
      </g>
    </svg>
  );
}

export function InteractiveDemo() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(1); // 1 = Photo, 2 = AI, 3 = Map

  const scenario = SAMPLE_SCENARIOS[selectedScenarioIndex];

  function handleNextStep() {
    setActiveStep((curr) => (curr < 3 ? curr + 1 : 1));
  }

  return (
    <div className={styles.demoWidget}>
      {/* Scenario Selector Tabs */}
      <div className={styles.scenarioBar} role="group" aria-label="Select sample hazard scenario">
        <span className={styles.scenarioBarTitle}>Sample scenario:</span>
        <div className={styles.scenarioChips}>
          {SAMPLE_SCENARIOS.map((sc, idx) => (
            <button
              key={sc.id}
              type="button"
              className={`${styles.scenarioChip} ${idx === selectedScenarioIndex ? styles.scenarioChipActive : ''}`}
              onClick={() => {
                setSelectedScenarioIndex(idx);
                setActiveStep(1);
              }}
              aria-pressed={idx === selectedScenarioIndex}
            >
              {sc.name.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Step Process Stepper */}
      <div className={styles.demoStepper} role="tablist" aria-label="Interactive demonstration steps">
        <button
          type="button"
          role="tab"
          aria-selected={activeStep === 1}
          className={`${styles.stepTab} ${activeStep === 1 ? styles.stepTabActive : ''}`}
          onClick={() => setActiveStep(1)}
        >
          <span className={styles.stepNum}>1</span>
          <span className={styles.stepLabel}>Photo capture</span>
        </button>

        <span className={styles.stepArrow} aria-hidden="true">→</span>

        <button
          type="button"
          role="tab"
          aria-selected={activeStep === 2}
          className={`${styles.stepTab} ${activeStep === 2 ? styles.stepTabActive : ''}`}
          onClick={() => setActiveStep(2)}
        >
          <span className={styles.stepNum}>2</span>
          <span className={styles.stepLabel}>AI reads hazard</span>
        </button>

        <span className={styles.stepArrow} aria-hidden="true">→</span>

        <button
          type="button"
          role="tab"
          aria-selected={activeStep === 3}
          className={`${styles.stepTab} ${activeStep === 3 ? styles.stepTabActive : ''}`}
          onClick={() => setActiveStep(3)}
        >
          <span className={styles.stepNum}>3</span>
          <span className={styles.stepLabel}>Pin on district map</span>
        </button>
      </div>

      {/* Main Demo Stage Card */}
      <Card variant="elevated" padding="lg" className={styles.stageCard}>
        {/* STEP 1: Photo Captured */}
        {activeStep === 1 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}>
              <div>
                <span className={styles.stepBadge}>Step 1 · Citizen report</span>
                <h3 className={styles.paneHeading}>{scenario.name}</h3>
              </div>
              <span className={styles.metaTag}>GPS locked</span>
            </div>

            <div className={styles.photoSimBox}>
              <div className={styles.photoGraphicWrap}>
                <div className={styles.cameraFrame}>
                  <StreetScene scenario={scenario} />
                  <div className={styles.framingGuideOverlay}>
                    <span>Include a tyre, kerb, road edge or a person for scale</span>
                  </div>
                  <span className={styles.hazardGraphicBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} aria-hidden="true" />
                    {scenario.hazardType}
                  </span>
                </div>
              </div>

              <div className={styles.photoMetaInfo}>
                <p className={styles.photoDescription}>"{scenario.photoDescription}"</p>
                <div className={styles.detailRow}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} aria-hidden="true" />
                    Coordinates:
                  </span>
                  <strong>{scenario.coords}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Compass size={14} aria-hidden="true" />
                    Location:
                  </span>
                  <strong>{scenario.district}</strong>
                </div>
              </div>
            </div>

            <div className={styles.stepFooter}>
              <p className={styles.stepTip}>Next: The AI estimates water depth from visible objects in the photo.</p>
              <Button variant="primary" size="md" onClick={() => setActiveStep(2)}>
                See what the AI reads →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: AI Reads Hazard */}
        {activeStep === 2 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}>
              <div>
                <span className={styles.stepBadge}>Step 2 · Water-depth reading</span>
                <h3 className={styles.paneHeading}>AI water-depth reading</h3>
              </div>
              <span className={styles.aiPill}>{scenario.confidence}% sure</span>
            </div>

            <div className={styles.aiAssessmentGrid}>
              <div className={styles.streetSceneColumn}>
                <span className={styles.resultLabel}>Photo scene</span>
                <StreetScene scenario={scenario} animateWater />
              </div>
              {/* Depth Silhouette Visual */}
              <div className={styles.gaugeColumn}>
                <DepthGauge depthClass={scenario.depthClass} height={170} animateFill />
              </div>

              {/* Parsed Findings */}
              <div className={styles.findingsColumn}>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Road access</span>
                  <div className={styles.passChip} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {scenario.passable === 'no' ? (
                      <AlertOctagon size={16} aria-hidden="true" color="#D64545" />
                    ) : scenario.passable === 'caution' ? (
                      <AlertTriangle size={16} aria-hidden="true" color="#E8A317" />
                    ) : (
                      <CheckCircle2 size={16} aria-hidden="true" color="#2E9E5B" />
                    )}
                    <span>{scenario.passableLabel}</span>
                  </div>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Why this reading</span>
                  <p className={styles.rationaleBox}>"{scenario.rationale}"</p>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Risk level</span>
                  <div style={{ marginTop: '4px' }}>
                    <RiskBadge band={scenario.riskBand} size="md" />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.stepFooter}>
              <p className={styles.stepTip}>Next: The assessed incident transforms into a real-time risk hotspot on the district map.</p>
              <Button variant="primary" size="md" onClick={() => setActiveStep(3)}>
                Plot on district map →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Pin Plotted on District Mini Map */}
        {activeStep === 3 && (
          <div className={styles.stepPane}>
            <div className={styles.stepHeader}>
              <div>
                <span className={styles.stepBadge}>Step 3 · Proactive warning & dispatch</span>
                <h3 className={styles.paneHeading}>Live Regional Hotspot Plotted</h3>
              </div>
              <RiskBadge band={scenario.riskBand} size="md" />
            </div>

            <div className={styles.mapGridWrap}>
              {/* SVG Vector Mini Map */}
              <div className={styles.mapColumn}>
                <HimachalMiniMap
                  activeDistrict={scenario.id}
                  activePin={{
                    district: scenario.district,
                    coords: scenario.coords,
                    color: scenario.pinColor,
                  }}
                />
              </div>

              {/* Action and Dispatch Details */}
              <div className={styles.dispatchColumn}>
                <div className={styles.scoreRow}>
                  <ScoreRing score={scenario.riskScore} size={68} strokeWidth={6} />
                  <div>
                    <h4 className={styles.dispatchHeader}>District risk score: {scenario.riskScore}/100</h4>
                    <p className={styles.dispatchSub}>Combined terrain slope, rain forecast & live report</p>
                  </div>
                </div>

                <div className={styles.actionCard}>
                  <span className={styles.actionIcon}><Bell size={20} aria-hidden="true" /></span>
                  <div>
                    <strong>Proactive alert dispatched</strong>
                    <p>Subscribed residents within 1 km receive instant push and email warnings.</p>
                  </div>
                </div>

                <div className={styles.actionCard}>
                  <span className={styles.actionIcon}><Truck size={20} aria-hidden="true" /></span>
                  <div>
                    <strong>Municipal pump priority queue</strong>
                    <p>Ranked on ward officer dashboard for immediate drain clearing.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.stepFooter}>
              <p className={styles.stepTip}>Loop complete: from citizen photo to actionable early warning in seconds.</p>
              <Button variant="secondary" size="md" onClick={handleNextStep}>
                <RotateCcw size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
                Reset demo
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
