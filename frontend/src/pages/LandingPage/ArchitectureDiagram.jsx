/**
 * ArchitectureDiagram.jsx — animated SVG architecture diagram for PARVAT.
 *
 * Requirements:
 *   • 7 nodes: Phone, S3, Bedrock, DynamoDB, Risk engine, Cloud API, Map and alerts
 *   • Short plain captions for every node
 *   • Animated SVG connection lines (pulses)
 *   • Respects prefers-reduced-motion
 *   • Accessible with role="img" and descriptive aria-label
 */

import React from 'react';
import { 
  Smartphone, 
  HardDrive, 
  Sparkles, 
  Database, 
  Activity, 
  Server, 
  Bell,
  ArrowRight
} from 'lucide-react';
import styles from './LandingPage.module.css';

const ARCH_NODES = [
  {
    id: 'phone',
    name: 'Phone',
    badge: 'Citizen sensor',
    caption: 'Citizen photographs street with mandatory GPS coordinates.',
    Icon: Smartphone,
    x: 80,
    y: 80,
  },
  {
    id: 's3',
    name: 'S3',
    badge: 'Direct upload',
    caption: 'Direct presigned PUT upload bypasses server bottlenecks during surges.',
    Icon: HardDrive,
    x: 340,
    y: 80,
  },
  {
    id: 'bedrock',
    name: 'Bedrock',
    badge: 'Multimodal AI',
    caption: 'Analyzes visual markers (tyres, kerbs) to estimate depth & passability.',
    Icon: Sparkles,
    x: 600,
    y: 80,
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    badge: 'Geospatial store',
    caption: 'Millisecond-latency store indexing reports by geohash and ward.',
    Icon: Database,
    x: 860,
    y: 80,
  },
  {
    id: 'api',
    name: 'Cloud API',
    badge: 'Backend gateway',
    caption: 'Express gateway validating schemas, rate limits, and authentication.',
    Icon: Server,
    x: 200,
    y: 270,
  },
  {
    id: 'risk',
    name: 'Risk engine',
    badge: 'Hotspot ranking',
    caption: 'Synthesizes terrain slope, rainfall forecast, and report density.',
    Icon: Activity,
    x: 520,
    y: 270,
  },
  {
    id: 'output',
    name: 'Map and alerts',
    badge: 'Community action',
    caption: 'Early warnings to nearby citizens and ward officer dispatch feed.',
    Icon: Bell,
    x: 840,
    y: 270,
  },
];

export function ArchitectureDiagram() {
  return (
    <div className={styles.archWrapper} aria-label="PARVAT architecture diagram">
      {/* SVG Canvas for Desktop / Tablet */}
      <div className={styles.archSvgContainer}>
        <svg
          viewBox="0 0 940 370"
          className={styles.archSvg}
          role="img"
          aria-label="Interactive architecture flow connecting Phone, S3, Bedrock, DynamoDB, Cloud API, Risk engine, and Map & alerts"
        >
          <defs>
            <linearGradient id="pathGradientCyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1688A8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3CC8E6" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="pathGradientOrange" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3CC8E6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E5742B" stopOpacity="0.9" />
            </linearGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection Lines (Paths) */}
          <g className={styles.archConnections}>
            {/* 1. Phone -> S3 */}
            <path
              d="M 130 80 L 290 80"
              className={styles.archTrack}
            />
            <path
              d="M 130 80 L 290 80"
              className={`${styles.archPulse} ${styles.pulseCyan}`}
            />

            {/* 2. S3 -> Bedrock */}
            <path
              d="M 390 80 L 550 80"
              className={styles.archTrack}
            />
            <path
              d="M 390 80 L 550 80"
              className={`${styles.archPulse} ${styles.pulseCyan}`}
            />

            {/* 3. Bedrock -> DynamoDB */}
            <path
              d="M 650 80 L 810 80"
              className={styles.archTrack}
            />
            <path
              d="M 650 80 L 810 80"
              className={`${styles.archPulse} ${styles.pulseCyan}`}
            />

            {/* 4. Phone -> Cloud API (metadata) */}
            <path
              d="M 80 130 C 80 200, 140 270, 150 270"
              className={styles.archTrack}
            />
            <path
              d="M 80 130 C 80 200, 140 270, 150 270"
              className={`${styles.archPulse} ${styles.pulseCyan}`}
            />

            {/* 5. Cloud API -> Risk Engine */}
            <path
              d="M 250 270 L 470 270"
              className={styles.archTrack}
            />
            <path
              d="M 250 270 L 470 270"
              className={`${styles.archPulse} ${styles.pulseOrange}`}
            />

            {/* 6. DynamoDB -> Risk Engine (curved) */}
            <path
              d="M 860 130 C 860 200, 580 200, 550 240"
              className={styles.archTrack}
            />
            <path
              d="M 860 130 C 860 200, 580 200, 550 240"
              className={`${styles.archPulse} ${styles.pulseCyan}`}
            />

            {/* 7. Risk Engine -> Map and Alerts */}
            <path
              d="M 570 270 L 790 270"
              className={styles.archTrack}
            />
            <path
              d="M 570 270 L 790 270"
              className={`${styles.archPulse} ${styles.pulseOrange}`}
            />
          </g>

          {/* Animated Traveling Signal Dots */}
          <g className={styles.archSignalDots}>
            <circle r="4" fill="#3CC8E6" filter="url(#glow)">
              <animateMotion
                path="M 130 80 L 290 80"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="4" fill="#3CC8E6" filter="url(#glow)">
              <animateMotion
                path="M 390 80 L 550 80"
                dur="2.4s"
                begin="0.8s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="4" fill="#3CC8E6" filter="url(#glow)">
              <animateMotion
                path="M 650 80 L 810 80"
                dur="2.4s"
                begin="1.6s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="4" fill="#E5742B" filter="url(#glow)">
              <animateMotion
                path="M 570 270 L 790 270"
                dur="2.4s"
                begin="1.2s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </svg>

        {/* Node Overlays Positioned Absolutely */}
        <div className={styles.archNodesGrid}>
          {ARCH_NODES.map((node) => {
            const Icon = node.Icon;
            return (
              <div
                key={node.id}
                className={`${styles.archNodeCard} ${styles[`node_${node.id}`]}`}
                style={{
                  left: `${(node.x / 940) * 100}%`,
                  top: `${(node.y / 370) * 100}%`,
                }}
              >
                <div className={styles.archNodeHeader}>
                  <div className={styles.archNodeIconWrap}>
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <strong className={styles.archNodeName}>{node.name}</strong>
                    <span className={styles.archNodeBadge}>{node.badge}</span>
                  </div>
                </div>
                <p className={styles.archNodeCaption}>{node.caption}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stacked Step Flow (< 768px) */}
      <div className={styles.archMobileList} aria-label="Step-by-step architecture flow">
        {ARCH_NODES.map((node, index) => {
          const Icon = node.Icon;
          return (
            <div key={node.id} className={styles.archMobileItem}>
              <div className={styles.archMobileIconCol}>
                <div className={styles.archNodeIconWrap}>
                  <Icon size={18} aria-hidden="true" />
                </div>
                {index < ARCH_NODES.length - 1 && (
                  <div className={styles.archMobileLine} aria-hidden="true" />
                )}
              </div>
              <div className={styles.archMobileContent}>
                <div className={styles.archMobileHead}>
                  <strong className={styles.archNodeName}>{node.name}</strong>
                  <span className={styles.archNodeBadge}>{node.badge}</span>
                </div>
                <p className={styles.archNodeCaption}>{node.caption}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
