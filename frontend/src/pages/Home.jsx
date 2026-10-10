/**
 * Home — secondary landing page at /home.
 * The default route "/" now renders the live MapView.
 * This page is kept for the ward officer login CTA and as a fallback
 * for users who bookmark /home.
 */

import { useNavigate } from 'react-router-dom';
import { Waves, Map, Camera, Building2 } from 'lucide-react';
import { Button }      from '../components/ui/Button.jsx';
import styles from './Home.module.css';

export function Home() {
  const navigate = useNavigate();
  return (
    <div className={styles.home}>
      <div className={styles.hero}>
        <span className={styles.logo} aria-hidden="true">
          <Waves size={36} color="var(--color-water)" />
        </span>
        <h1 className={styles.title}>PARVAT</h1>
        <p className={styles.tagline}>
          Predictive Analytics for Risk, Vulnerability and Terrain
        </p>
      </div>

      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/')}
        >
          <Map size={18} aria-hidden="true" style={{ marginRight: '8px' }} />
          Open live hazard map
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/report')}
        >
          <Camera size={18} aria-hidden="true" style={{ marginRight: '8px' }} />
          Report flooding near me
        </Button>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => navigate('/ward/login')}
        >
          <Building2 size={18} aria-hidden="true" style={{ marginRight: '8px' }} />
          Ward officer login
        </Button>
      </div>
    </div>
  );
}
