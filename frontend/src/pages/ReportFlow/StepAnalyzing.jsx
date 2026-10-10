/**
 * StepAnalyzing — Step 4: polls /reports/:id until status = "assessed" | "failed".
 *
 * Shows:
 *   • Animated wave illustration while polling
 *   • Estimated time hint ("usually under 10 seconds")
 *   • Elapsed seconds counter so the user knows progress is happening
 *   • Error state with retry if polling fails
 *   • Navigates to /result?id=<reportId> once assessed
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReportPoller }   from '../../hooks/useReportPoller.js';
import { Waves }             from 'lucide-react';
import { Spinner }           from '../../components/ui/Spinner.jsx';
import { ErrorBanner }       from '../../components/ui/ErrorBanner.jsx';
import { Button }            from '../../components/ui/Button.jsx';
import { PageHeader }        from '../../components/ui/PageHeader.jsx';
import styles from './ReportFlow.module.css';

export function StepAnalyzing() {
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();
  const reportId             = searchParams.get('id');

  const { report, error } = useReportPoller(reportId);

  // Elapsed timer — shows "x seconds" for reassurance
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Navigate once we have an assessed or failed result
  useEffect(() => {
    if (!report) return;
    if (report.status === 'assessed') {
      clearInterval(timerRef.current);
      navigate(`/result?id=${reportId}`, { state: { report } });
    }
    if (report.status === 'failed') {
      clearInterval(timerRef.current);
      // Show in-page error — no good result to navigate to
    }
  }, [report, reportId, navigate]);

  // Guard — no reportId means user landed here directly
  if (!reportId) {
    return (
      <div className={styles.flow}>
        <PageHeader title="Analyzing" onBack={null} />
        <main className={styles.body}>
          <ErrorBanner message="No report ID found. Please start a new report." />
          <Button variant="primary" fullWidth onClick={() => navigate('/report')}>
            Start over
          </Button>
        </main>
      </div>
    );
  }

  const failed = report?.status === 'failed';

  return (
    <div className={styles.flow}>
      <PageHeader title="Analyzing photo" onBack={null} />

      <main className={`${styles.body} ${styles.analyzingBody}`}>
        {/* ── Illustration ─────────────────────────────────────────────── */}
        <div className={styles.analyzingIllustration} aria-hidden="true">
          <Waves size={36} color="var(--color-water)" className={styles.waterWave} />
          <Waves size={48} color="var(--color-water)" className={styles.waterWave} />
          <Waves size={36} color="var(--color-water)" className={styles.waterWave} />
        </div>

        {failed ? (
          <>
            <h2 className={styles.heading}>Analysis failed</h2>
            <p className={styles.sub}>
              We couldn't assess this photo. Please try submitting again.
            </p>
            <Button variant="primary" fullWidth onClick={() => navigate('/report')}>
              Start over
            </Button>
          </>
        ) : (
          <>
            <div className={styles.analyzingSpinner}>
              <Spinner size={48} />
            </div>
            <h2 className={styles.heading}>Assessing flood depth…</h2>
            <p className={styles.sub} aria-live="polite">
              Our AI is analysing your photo.
              Usually under 10 seconds.
            </p>
            <p className={styles.elapsed} aria-live="polite" aria-atomic="true">
              {elapsed}s
            </p>
          </>
        )}

        {/* Network/API error */}
        {error && !failed && (
          <ErrorBanner
            message={error.message ?? 'Could not reach the server.'}
          />
        )}
      </main>
    </div>
  );
}
