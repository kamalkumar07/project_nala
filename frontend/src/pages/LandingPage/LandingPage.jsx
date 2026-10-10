/**
 * LandingPage.jsx — Product-first landing page for PARVAT.
 *
 * Requirements:
 *   • Hero: Left = headline "Know where hazards are building across Himachal Pradesh."
 *     with subhead and CTAs "Open live map" and "Watch it work";
 *     Right = live mini-map in a phone frame with seeded pins appearing and report arriving.
 *   • Section 1: Scroll-driven 3-step story (photo, AI water-depth reading, pin & alert appear).
 *   • Section 2: Two persona cards (travellers & residents; district response teams).
 *   • Section 3: "Under the hood" animated SVG architecture diagram
 *     (Phone, S3, Bedrock, DynamoDB, Risk engine, Cloud API, Map and alerts) with plain captions.
 *   • Section 4: Clean footer with ONLY Live map, Report a hazard, For ward teams,
 *     and the advisory line: "Community-submitted and AI-assessed. Advisory only. In an emergency call 112."
 *   • Remove "Design system", ports, and track labels.
 *   • No invented statistics, no stock photos.
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Waves, 
  MapPin, 
  Play, 
  Users, 
  ShieldCheck, 
  Camera, 
  ArrowRight,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { Button, Card } from '../../components/ui/index.js';
import { HeroPhoneMap } from './HeroPhoneMap.jsx';
import { InteractiveDemo } from './InteractiveDemo.jsx';
import { ArchitectureDiagram } from './ArchitectureDiagram.jsx';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const navigate = useNavigate();
  const storyRef = useRef(null);

  const handleWatchItWork = () => {
    if (storyRef.current) {
      storyRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.landingShell}>
      {/* ── Background Subtle Water Ripple Canvas ────────────────────────────── */}
      <div className={styles.rippleCanvas} aria-hidden="true">
        <div className={`${styles.rippleRing} ${styles.ripple1}`} />
        <div className={`${styles.rippleRing} ${styles.ripple2}`} />
        <div className={`${styles.rippleRing} ${styles.ripple3}`} />
      </div>

      {/* ── Top Navigation Bar ───────────────────────────────────────────────── */}
      <nav className={styles.navbar} aria-label="Main navigation">
        <div className={styles.navContainer}>
          <div className={styles.brandGroup}>
            <span className={styles.brandIcon} aria-hidden="true"><Waves size={20} /></span>
            <span className={styles.brandLockup}>
              <span className={styles.brandTitle}>PARVAT</span>
              <span className={styles.brandTagline}>
                Predictive Analytics for Risk, Vulnerability and Terrain
              </span>
            </span>
            <span className={styles.regionBadge}>Himachal Pradesh</span>
          </div>

          <div className={styles.navLinks}>
            <button
              type="button"
              className={styles.navLinkBtn}
              onClick={() => navigate('/ward/login')}
            >
              For ward teams
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app')}
            >
              Open map
            </Button>
          </div>
        </div>
      </nav>

      <main className={styles.mainContent}>
        {/* ── HERO SECTION: 2-COLUMN (LEFT TEXT + RIGHT PHONE MINI-MAP) ────────── */}
        <section className={styles.heroSection}>
          <div className={styles.heroTwoCol}>
            {/* Left Column: Headline, Subhead, CTAs */}
            <div className={styles.heroLeft}>
              <div className={styles.heroBadge}>
                <span className={styles.badgePulse} aria-hidden="true" />
                <span>Monsoon hazard monitoring</span>
              </div>

              <h1 className={styles.heroHeadline}>
                Know where hazards are building across Himachal Pradesh.
              </h1>

              <p className={styles.heroSubhead}>
                Report floods and hazards with a photo. PARVAT maps risk by district and warns people nearby.
              </p>

              <div className={styles.heroCtas}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/app')}
                  className={styles.heroPrimaryBtn}
                >
                  <MapPin size={18} style={{ marginRight: '8px' }} aria-hidden="true" />
                  Open live map
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleWatchItWork}
                  className={styles.heroSecondaryBtn}
                >
                  <Play size={16} style={{ marginRight: '8px' }} aria-hidden="true" />
                  Watch it work
                </Button>
              </div>

              <div className={styles.heroMetaRow}>
                <span className={styles.heroMetaChip}>
                  Direct GPS coordinates
                </span>
                <span className={styles.heroMetaDot} aria-hidden="true">•</span>
                <span className={styles.heroMetaChip}>
                  Water-depth estimate
                </span>
                <span className={styles.heroMetaDot} aria-hidden="true">•</span>
                <span className={styles.heroMetaChip}>
                  Real-time ward dispatch
                </span>
              </div>
            </div>

            {/* Right Column: Live mini-map in a phone frame */}
            <div className={styles.heroRight}>
              <HeroPhoneMap />
            </div>
          </div>
        </section>

        {/* ── SECTION 1: SCROLL-DRIVEN 3-STEP STORY ────────────────────────────── */}
        <section ref={storyRef} id="story" className={styles.storySection} aria-label="3-step story">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionOverline}>The 3-step story</span>
            <h2 className={styles.sectionTitle}>From a citizen photo to an early warning</h2>
            <p className={styles.sectionSubtitle}>
              See how AI reads a photo to estimate water depth and maps the result as a risk hotspot.
            </p>
          </div>

          <InteractiveDemo />
        </section>

        {/* ── SECTION 2: TWO PERSONA CARDS ─────────────────────────────────────── */}
        <section className={styles.audienceSection} aria-label="Who it helps">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionOverline}>Community impact</span>
            <h2 className={styles.sectionTitle}>Who it helps</h2>
            <p className={styles.sectionSubtitle}>
              Built for everyday commuters navigating mountainous terrain and municipal teams managing flood relief.
            </p>
          </div>

          <div className={styles.audienceGrid}>
            {/* Persona 1: Travellers and residents */}
            <Card variant="elevated" padding="lg" className={styles.audienceCard}>
              <div className={styles.audienceCardHeader}>
                <div className={styles.audienceIcon} aria-hidden="true"><Users size={26} /></div>
                <div>
                  <span className={styles.personaTag}>For commuters & residents</span>
                  <h3 className={styles.audienceHeading}>Travellers and residents</h3>
                </div>
              </div>
              <p className={styles.audienceBody}>
                Commuters and local families receive clear passability guidance before travelling along inundated routes.
              </p>
              <ul className={styles.audienceList}>
                <li>Check street water depth (ankle, knee, waist) before setting off</li>
                <li>Instant traffic warnings when road damage or landslides block passage</li>
                <li>Location-based alerts delivered automatically to nearby residents</li>
                <li>Real-time passability guidance for two-wheelers and pedestrians</li>
              </ul>
              <div className={styles.personaAction}>
                <Button variant="outline" size="sm" onClick={() => navigate('/app/report')}>
                  <Camera size={14} style={{ marginRight: '6px' }} aria-hidden="true" />
                  Report a hazard
                </Button>
              </div>
            </Card>

            {/* Persona 2: District response teams */}
            <Card variant="elevated" padding="lg" className={styles.audienceCard}>
              <div className={styles.audienceCardHeader}>
                <div className={styles.audienceIcon} aria-hidden="true"><ShieldCheck size={26} /></div>
                <div>
                  <span className={styles.personaTag}>For municipal officers</span>
                  <h3 className={styles.audienceHeading}>District response teams</h3>
                </div>
              </div>
              <p className={styles.audienceBody}>
                Municipal officers and disaster managers triage incoming reports and coordinate emergency machinery.
              </p>
              <ul className={styles.audienceList}>
                <li>Ranked priority hotspots across municipal wards and tehsils</li>
                <li>Direct dispatch queue advancing incidents: open → dispatched → resolved</li>
                <li>Combined terrain slope, rainfall forecast, and citizen report density</li>
                <li>High-capacity pump dispatch coordination and drain bottleneck clearance</li>
              </ul>
              <div className={styles.personaAction}>
                <Button variant="outline" size="sm" onClick={() => navigate('/ward/login')}>
                  <ArrowRight size={14} style={{ marginRight: '6px' }} aria-hidden="true" />
                  For ward teams
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* ── SECTION 3: UNDER THE HOOD (ANIMATED SVG ARCHITECTURE DIAGRAM) ───── */}
        <section className={styles.underTheHoodSection} aria-label="System architecture">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionOverline}>System architecture</span>
            <h2 className={styles.sectionTitle}>Under the hood</h2>
            <p className={styles.sectionSubtitle}>
              A serverless event-driven architecture connecting citizen devices with automated emergency intelligence.
            </p>
          </div>

          <ArchitectureDiagram />
        </section>

        {/* ── SECTION 4: CLEAN FOOTER ─────────────────────────────────────────── */}
        <footer className={styles.cleanFooter} role="contentinfo">
          <div className={styles.cleanFooterContainer}>
            <div className={styles.cleanFooterBrand}>
              <div className={styles.footerBrandTitle}>
                <span className={styles.footerBrandIcon} aria-hidden="true"><Waves size={20} /></span>
                <strong>PARVAT</strong>
              </div>
              <p className={styles.footerTagline}>
                Predictive Analytics for Risk, Vulnerability and Terrain.
              </p>
            </div>

            {/* Strict Clean Navigation: Only Live map, Report a hazard, For ward teams */}
            <nav className={styles.cleanFooterNav} aria-label="Footer navigation">
              <button
                type="button"
                className={styles.footerNavBtn}
                onClick={() => navigate('/app')}
              >
                Live map
              </button>
              <button
                type="button"
                className={styles.footerNavBtn}
                onClick={() => navigate('/app/report')}
              >
                Report a hazard
              </button>
              <button
                type="button"
                className={styles.footerNavBtn}
                onClick={() => navigate('/ward/login')}
              >
                For ward teams
              </button>
            </nav>
          </div>

          {/* Mandatory Advisory Line from U5 */}
          <div className={styles.advisoryFooterBanner}>
            <ShieldAlert size={16} aria-hidden="true" className={styles.advisoryFooterIcon} />
            <p className={styles.advisoryFooterText}>
              Community-submitted and AI-assessed. Advisory only. In an emergency call 112.
            </p>
          </div>

          <div className={styles.footerCopyright}>
            <p>© 2026 PARVAT. All coordinates and district hazards reflect active community report submissions.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
