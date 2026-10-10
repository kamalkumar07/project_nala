/**
 * WardLogin — ward officer sign-in screen.
 *
 * Two modes controlled by VITE_USE_MOCK_AUTH (default "true"):
 *
 * Mock mode (default, USE_MOCK=true on the backend):
 *   Any non-empty string in the token field is accepted.
 *   The frontend calls GET /api/v1/auth/me with that token; the backend
 *   ignores it and returns the synthetic demo_officer identity.
 *   A "Quick login (demo)" button fills the field automatically.
 *
 * Production mode:
 *   The token field accepts a real Cognito access token.
 *   Paste it from the Cognito hosted UI / Amplify Auth flow.
 *   Full Amplify UI integration is a post-hackathon task.
 *
 * On success: stores token + user in useWardAuth and navigates to
 * /ward/dashboard (or the page the user was trying to reach).
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Wrench, Zap } from 'lucide-react';
import { getWardMe }   from '../services/api.js';
import { useWardAuth } from '../store/useWardAuth.js';
import { Button }      from '../components/ui/Button.jsx';
import { ErrorBanner } from '../components/ui/ErrorBanner.jsx';
import { PageHeader }  from '../components/ui/PageHeader.jsx';
import styles from './WardLogin.module.css';

const IS_MOCK = import.meta.env.VITE_USE_MOCK_AUTH !== 'false';
const MOCK_TOKEN = 'mock-ward-officer-token';

export function WardLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useWardAuth();

  // Where to go after successful login
  const from = location.state?.from ?? '/ward/dashboard';

  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSignIn(tokenValue) {
    const t = (tokenValue ?? token).trim();
    if (!t) {
      setError('Please enter a token to sign in.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await getWardMe(t);

      if (!user?.groups?.includes('ward_officer')) {
        setError(
          'This account does not have ward officer access. ' +
          'Contact your administrator.',
        );
        return;
      }

      login(t, user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError('Invalid or expired token. Please try again.');
      } else {
        setError(err.message ?? 'Sign-in failed. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleQuickLogin() {
    setToken(MOCK_TOKEN);
    handleSignIn(MOCK_TOKEN);
  }

  return (
    <div className={styles.screen}>
      <PageHeader title="Ward Officer Login" onBack={() => navigate('/')} />

      <main className={styles.body}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className={styles.hero}>
          <span className={styles.icon} aria-hidden="true">
            <Building2 size={36} color="var(--color-water)" />
          </span>
          <h2 className={styles.heading}>Ward Officer Sign In</h2>
          <p className={styles.sub}>
            Access the flood management dashboard for your ward.
          </p>
        </div>

        {/* ── Mock quick-login notice ───────────────────────────────────── */}
        {IS_MOCK && (
          <div className={styles.mockNotice} role="note" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>
              <strong>Demo mode</strong> — tap "Quick login" to sign in with
              the demo ward officer account. No real credentials needed.
            </span>
          </div>
        )}

        {/* ── Token form ───────────────────────────────────────────────── */}
        <form
          className={styles.form}
          onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}
          noValidate
        >
          <label className={styles.label} htmlFor="ward-token">
            Access token
          </label>
          <input
            id="ward-token"
            type="password"
            className={styles.input}
            placeholder={IS_MOCK ? 'Any value, or use Quick login' : 'Paste Cognito access token'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="current-password"
            aria-describedby={error ? 'ward-login-error' : undefined}
            disabled={loading}
          />

          {error && (
            <ErrorBanner
              message={error}
              onDismiss={() => setError('')}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Sign in
          </Button>
        </form>

        {/* ── Quick-login shortcut (mock mode only) ────────────────────── */}
        {IS_MOCK && (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleQuickLogin}
          >
            <Zap size={16} aria-hidden="true" style={{ marginRight: '6px' }} />
            Quick login (demo)
          </Button>
        )}

        <p className={styles.hint}>
          {IS_MOCK
            ? 'Mock mode is active — the backend accepts any token.'
            : 'Production mode — enter a valid Cognito access token.'}
        </p>
      </main>
    </div>
  );
}
