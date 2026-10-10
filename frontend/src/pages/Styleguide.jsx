/**
 * Styleguide — comprehensive living showcase of the PARVAT design system.
 * Gated behind import.meta.env.DEV || ?dev=1.
 *
 * Demonstrates:
 *   • Brand palette (Ink, Water, Mist, Line, Muted) & Risk bands (Low, Moderate, High, Severe, Unknown)
 *   • Dark "Ops" theme [data-theme="ops"] (bg #07141F, surface #0E2233, accent #3CC8E6)
 *   • Typography scale (Hero 44-56px max, line-height 1.1, Tabular Numerals)
 *   • Motion tokens (150/250/400 ms, ease-out, reduced-motion safe)
 *   • Custom SVG Hazard icons (Flood, Landslide, Waterlogging, Road Damage)
 *   • All UI components: GlassPanel, Chip, SegmentedControl, Stat, Button, Card, RiskBadge,
 *     BottomSheet / SidePanel, Skeleton, EmptyState, ErrorState, Toast, ScoreRing (count-up), DepthGauge v2
 */

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Smartphone,
  PanelRight,
  Waves,
  AlertTriangle,
  RotateCcw,
  Shield,
  Activity,
  Check,
  Moon,
  Sun,
  Flame,
} from 'lucide-react';
import {
  Button,
  Card,
  GlassPanel,
  Chip,
  SegmentedControl,
  Stat,
  RiskBadge,
  BottomSheet,
  SidePanel,
  Skeleton,
  EmptyState,
  ErrorState,
  ScoreRing,
  DepthGauge,
  useToast,
} from '../components/ui/index.js';
import {
  FloodIcon,
  LandslideIcon,
  WaterloggingIcon,
  RoadDamageIcon,
  HazardIcon,
} from '../components/icons/HazardIcons.jsx';
import styles from './Styleguide.module.css';

export function Styleguide() {
  const navigate = useNavigate();
  const toast = useToast();

  // Security & hygiene gate: dev only
  const isDevAllowed =
    Boolean(import.meta.env.DEV) ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('dev') === '1');

  if (!isDevAllowed) {
    return <Navigate to="/" replace />;
  }

  // Component state toggles
  const [theme, setTheme] = useState('light');
  const [btnLoading, setBtnLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [scoreVal, setScoreVal] = useState(72);
  const [depthSelection, setDepthSelection] = useState('knee');
  const [activeSegment, setActiveSegment] = useState('all');
  const [activeChip, setActiveChip] = useState('severe');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'ops' ? 'light' : 'ops'));
  };

  return (
    <div className={styles.container} data-theme={theme === 'ops' ? 'ops' : undefined}>
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/')}
            aria-label="Back to home"
          >
            &larr; Back to home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle ops dark theme"
            >
              {theme === 'ops' ? <Sun size={14} style={{ marginRight: '6px' }} /> : <Moon size={14} style={{ marginRight: '6px' }} />}
              {theme === 'ops' ? 'Theme: Ops (Dark)' : 'Theme: Light'}
            </Button>
            <span className={styles.versionBadge}>Dev Only &middot; PARVAT UI v2.1</span>
          </div>
        </div>
        <h1 className={styles.pageTitle}>Design System &amp; Styleguide</h1>
        <p className={styles.pageSubtitle}>
          Living tokens, accessible components, and custom SVG iconography for Himachal Pradesh hazard monitoring.
        </p>
      </header>

      <main className={styles.main}>
        {/* ── 0. Dark Ops Theme Showcase ────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>0. Theme Switcher &amp; Dark "Ops" Mode</h2>
          <p className={styles.sectionDesc}>
            Applied under the <code>[data-theme="ops"]</code> attribute. Dark tactical monitoring palette
            with background <code>#07141F</code>, surface <code>#0E2233</code>, and accent cyan <code>#3CC8E6</code>.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant={theme === 'light' ? 'primary' : 'outline'}
              onClick={() => setTheme('light')}
            >
              Default Light Mode
            </Button>
            <Button
              variant={theme === 'ops' ? 'primary' : 'outline'}
              onClick={() => setTheme('ops')}
            >
              Dark "Ops" Theme [data-theme="ops"]
            </Button>
          </div>
        </section>

        {/* ── 1. Color Palette ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Color Palette</h2>
          <p className={styles.sectionDesc}>
            Curated palette designed for outdoor contrast in monsoon conditions. Status colors are strictly paired with icons and text.
          </p>

          <h3 className={styles.subheading}>Core Brand &amp; Neutral Tokens</h3>
          <div className={styles.colorGrid}>
            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#0B1F33' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Ink</span>
                <span className={styles.colorHex}>#0B1F33</span>
                <span className={styles.colorRole}>Primary text &amp; contrast</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#1688A8' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Water</span>
                <span className={styles.colorHex}>#1688A8</span>
                <span className={styles.colorRole}>River teal / primary accent</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#F3F8FA', border: '1px solid #D8E4EA' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Mist</span>
                <span className={styles.colorHex}>#F3F8FA</span>
                <span className={styles.colorRole}>Soft background neutral</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#D8E4EA' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Line</span>
                <span className={styles.colorHex}>#D8E4EA</span>
                <span className={styles.colorRole}>Divider &amp; border stroke</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#5B7184' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Muted</span>
                <span className={styles.colorHex}>#5B7184</span>
                <span className={styles.colorRole}>Secondary text &amp; metadata</span>
              </div>
            </div>
          </div>

          <h3 className={styles.subheading}>Risk Severity Palette (Always paired with icon &amp; label)</h3>
          <div className={styles.colorGrid}>
            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#2E9E5B' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Low Risk</span>
                <span className={styles.colorHex}>#2E9E5B</span>
                <span className={styles.colorRole}>Safe / passable pooling</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#E8A317' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Moderate Risk</span>
                <span className={styles.colorHex}>#E8A317</span>
                <span className={styles.colorRole}>Ankle-deep; use caution</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#E5742B' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>High Risk</span>
                <span className={styles.colorHex}>#E5742B</span>
                <span className={styles.colorRole}>Knee-deep; impassable 2-wheelers</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#D64545' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Severe Risk</span>
                <span className={styles.colorHex}>#D64545</span>
                <span className={styles.colorRole}>Waist-deep flood surge</span>
              </div>
            </div>

            <div className={styles.colorCard}>
              <div className={styles.swatch} style={{ background: '#8A99A6' }} />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>Unknown</span>
                <span className={styles.colorHex}>#8A99A6</span>
                <span className={styles.colorRole}>Uncalibrated telemetry</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Custom SVG Hazard Category Icons ───────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Custom Hazard Category SVG Icons</h2>
          <p className={styles.sectionDesc}>
            Scalable, stroke-aligned SVG vector icons designed specifically for monsoon emergencies.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', background: 'var(--color-water-light)', borderRadius: '10px', color: 'var(--color-water)' }}>
                <FloodIcon size={28} />
              </div>
              <div>
                <strong>Flood</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)' }}>Rising river &amp; surge</p>
              </div>
            </Card>

            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(229, 116, 43, 0.15)', borderRadius: '10px', color: 'var(--color-risk-high)' }}>
                <LandslideIcon size={28} />
              </div>
              <div>
                <strong>Landslide</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)' }}>Mountain rockfall</p>
              </div>
            </Card>

            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(232, 163, 23, 0.15)', borderRadius: '10px', color: 'var(--color-risk-moderate)' }}>
                <WaterloggingIcon size={28} />
              </div>
              <div>
                <strong>Waterlogging</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)' }}>Street ponding</p>
              </div>
            </Card>

            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(214, 69, 69, 0.15)', borderRadius: '10px', color: 'var(--color-risk-severe)' }}>
                <RoadDamageIcon size={28} />
              </div>
              <div>
                <strong>Road Damage</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted)' }}>Pavement fracture</p>
              </div>
            </Card>
          </div>
        </section>

        {/* ── 3. GlassPanel, Chips, SegmentedControl, Stats ─────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Upgraded UI Surfaces &amp; Controls</h2>
          <p className={styles.sectionDesc}>
            Translucent blurred glassmorphism, 44px accessible chips, segmented linear switches, and metric stat cards.
          </p>

          <h3 className={styles.subheading}>GlassPanel &amp; Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <GlassPanel padding="md">
              <h4 style={{ margin: '0 0 8px' }}>GlassPanel (Blurred Translucent)</h4>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-muted)' }}>
                Features <code>backdrop-filter: blur(12px)</code> with theme-adaptive border and elevation.
              </p>
              <Stat value="89" label="Risk Index" subtext="Top priority hotspot in Shimla" trend={{ direction: 'up', label: '+14% vs yesterday' }} />
            </GlassPanel>

            <Card padding="md">
              <h4 style={{ margin: '0 0 8px' }}>Standard Metric Stat</h4>
              <Stat value="14" label="Active Reports" subtext="Crowdsourced field reports" icon={<Activity size={20} />} />
            </Card>
          </div>

          <h3 className={styles.subheading}>SegmentedControl &amp; Chips</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SegmentedControl
              options={[
                { id: 'all', label: 'All zones', badge: '28' },
                { id: 'severe', label: 'Severe risk', badge: '3' },
                { id: 'high', label: 'High risk', badge: '6' },
                { id: 'moderate', label: 'Moderate', badge: '12' },
              ]}
              value={activeSegment}
              onChange={setActiveSegment}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label="Severe risk"
                icon={<AlertTriangle size={14} />}
                active={activeChip === 'severe'}
                variant="filter"
                onClick={() => setActiveChip('severe')}
              />
              <Chip
                label="High risk"
                icon={<AlertTriangle size={14} />}
                active={activeChip === 'high'}
                variant="filter"
                onClick={() => setActiveChip('high')}
              />
              <Chip
                label="Flood surge"
                icon={<FloodIcon size={14} />}
                active={activeChip === 'flood'}
                variant="filter"
                onClick={() => setActiveChip('flood')}
              />
              <Chip
                label="Landslide"
                icon={<LandslideIcon size={14} />}
                active={activeChip === 'landslide'}
                variant="filter"
                onClick={() => setActiveChip('landslide')}
              />
            </div>
          </div>
        </section>

        {/* ── 4. RiskBadges with Lucide Icons ────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. RiskBadges (Strict Icon + Text Pairing)</h2>
          <p className={styles.sectionDesc}>
            WCAG 1.4.1 compliance: color is never used alone. Lucide icons are paired with explicit sentence case text.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <RiskBadge band="LOW" size="lg" />
            <RiskBadge band="MODERATE" size="lg" />
            <RiskBadge band="HIGH" size="lg" />
            <RiskBadge band="SEVERE" size="lg" />
            <RiskBadge band="UNKNOWN" size="lg" />
          </div>
        </section>

        {/* ── 5. ScoreRing with Count-up & Tabular Numerals ──────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. ScoreRing with Count-Up Animation</h2>
          <p className={styles.sectionDesc}>
            Animated radial score meter using <code>requestAnimationFrame</code> with tabular numerals.
          </p>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ScoreRing score={scoreVal} size={96} strokeWidth={8} />
            <ScoreRing score={88} size={80} strokeWidth={7} />
            <ScoreRing score={35} size={64} strokeWidth={6} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" onClick={() => setScoreVal(22)}>Set 22 (Low)</Button>
              <Button size="sm" variant="secondary" onClick={() => setScoreVal(64)}>Set 64 (High)</Button>
              <Button size="sm" variant="secondary" onClick={() => setScoreVal(94)}>Set 94 (Severe)</Button>
            </div>
          </div>
        </section>

        {/* ── 6. Water-depth reading ───────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Water-depth reading (human silhouette &amp; waterline)</h2>
          <p className={styles.sectionDesc}>
            Anatomical person silhouette with dynamic water height, oscillating wave, metric centimeters, and rich aria-label.
          </p>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <DepthGauge depthClass={depthSelection} height={200} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button size="sm" variant={depthSelection === 'ankle' ? 'primary' : 'secondary'} onClick={() => setDepthSelection('ankle')}>
                Ankle deep (~30 cm)
              </Button>
              <Button size="sm" variant={depthSelection === 'knee' ? 'primary' : 'secondary'} onClick={() => setDepthSelection('knee')}>
                Knee deep (~60 cm)
              </Button>
              <Button size="sm" variant={depthSelection === 'waist' ? 'primary' : 'secondary'} onClick={() => setDepthSelection('waist')}>
                Waist deep (&gt;60 cm)
              </Button>
              <Button size="sm" variant={depthSelection === 'unknown' ? 'primary' : 'secondary'} onClick={() => setDepthSelection('unknown')}>
                Undetermined
              </Button>
            </div>
          </div>
        </section>

        {/* ── 7. Modals & Drawers ───────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Responsive Modals &amp; Side Panels</h2>
          <p className={styles.sectionDesc}>
            Mobile bottom sheets automatically transition into desktop side drawers with keyboard focus trapping.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              <Smartphone size={16} style={{ marginRight: '6px' }} />
              Open bottom sheet
            </Button>
            <Button variant="secondary" onClick={() => setSidePanelOpen(true)}>
              <PanelRight size={16} style={{ marginRight: '6px' }} />
              Open side panel drawer
            </Button>
          </div>
        </section>

        {/* ── 8. Empty & Error States ────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Loading, Empty &amp; Error States</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <Card padding="md">
              <h4 style={{ margin: '0 0 12px' }}>Loading skeleton</h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <Skeleton variant="circle" width="44px" height="44px" />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="45%" />
                </div>
              </div>
              <Skeleton variant="card" height="80px" />
            </Card>

            <EmptyState
              icon={<Waves size={32} />}
              title="No flooded streets reported"
              description="All drainage routes in this ward are operating normally."
              actionLabel="Report a hazard"
              onAction={() => toast.info('Navigating to report hazard flow')}
            />

            <ErrorState
              title="Could not load hazard feed"
              message="Unable to reach the network service. Please check your connection."
              onRetry={() => toast.info('Retrying feed fetch…')}
              retryLabel="Retry"
            />
          </div>
        </section>

        {/* ── 9. Toast Notifications ────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Toast Notifications (with Lucide SVGs)</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => toast.success('Report registered! Thank you for helping neighbors stay safe.')}>
              Success Toast
            </Button>
            <Button variant="secondary" onClick={() => toast.warn('Approaching moderate hazard perimeter near Beas river.')}>
              Warning Toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Emergency dispatch connection timed out. Retrying...')}>
              Error Toast
            </Button>
          </div>
        </section>
      </main>

      {/* Sheet & Drawer Demos */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Hazard Incident Details">
        <div style={{ padding: '8px 0' }}>
          <p>Sample incident drawer content demonstrating 44px touch targets and full keyboard focus dismiss.</p>
          <Button variant="primary" onClick={() => setSheetOpen(false)}>Done</Button>
        </div>
      </BottomSheet>

      <SidePanel isOpen={sidePanelOpen} onClose={() => setSidePanelOpen(false)} title="District Risk Hotspots">
        <div style={{ padding: '8px 0' }}>
          <p>Desktop side panel drawer view for ward incident coordination.</p>
          <Button variant="primary" onClick={() => setSidePanelOpen(false)}>Close drawer</Button>
        </div>
      </SidePanel>
    </div>
  );
}
