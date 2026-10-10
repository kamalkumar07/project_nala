/**
 * WardDashboard — protected ward officer control screen.
 *
 * Layout:
 *   • Sticky primary header  — ward name, username, refresh, logout
 *   • Sticky tab bar         — "Hotspots" | "Reports"
 *   • Scrollable body        — active tab content
 *
 * Data:
 *   Both hotspots and reports are fetched on mount and then refreshed
 *   manually (refresh button in header) or after a status PATCH succeeds
 *   (so the feed reflects the new opsStatus immediately).
 *
 * The ward officer token comes from useWardAuth and is passed to every
 * API call — works transparently in mock mode (any string) and with real
 * Cognito JWTs in production.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate }    from 'react-router-dom';
import { useWardAuth }    from '../../store/useWardAuth.js';
import {
  getWardHotspots,
  getWardReports,
  patchWardReportStatus,
}                         from '../../services/api.js';
import { AlertOctagon, ClipboardList, RotateCcw } from 'lucide-react';
import { HotspotList }   from './HotspotList.jsx';
import { ReportFeed }    from './ReportFeed.jsx';
import { Spinner }       from '../../components/ui/Spinner.jsx';
import styles from './WardDashboard.module.css';

// ── Tab configuration ─────────────────────────────────────────────────────

const TABS = [
  { id: 'hotspots', label: 'Hotspots', Icon: AlertOctagon },
  { id: 'reports',  label: 'Reports',  Icon: ClipboardList },
];

// ── Component ─────────────────────────────────────────────────────────────

export function WardDashboard() {
  const navigate           = useNavigate();
  const { token, user, logout } = useWardAuth();

  const [activeTab, setActiveTab] = useState('hotspots');
  const [feedFilter, setFeedFilter] = useState('all');

  // ── Hotspots state ──────────────────────────────────────────────────────
  const [hotspots,        setHotspots]        = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(true);
  const [hotspotsError,   setHotspotsError]   = useState(null);

  // ── Reports state ───────────────────────────────────────────────────────
  const [reports,        setReports]        = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError,   setReportsError]   = useState(null);

  // ── Global refresh loading (header spinner) ────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  const abortRef = useRef(null);

  // ── Fetch hotspots ──────────────────────────────────────────────────────

  const fetchHotspots = useCallback(async (signal) => {
    setHotspotsLoading(true);
    try {
      const data = await getWardHotspots({}, token, signal);
      setHotspots(data ?? []);
      setHotspotsError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setHotspotsError(err);
    } finally {
      setHotspotsLoading(false);
    }
  }, [token]);

  // ── Fetch ward reports ──────────────────────────────────────────────────

  const fetchReports = useCallback(async (signal) => {
    setReportsLoading(true);
    try {
      const data = await getWardReports({}, token, signal);
      setReports(data ?? []);
      setReportsError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setReportsError(err);
    } finally {
      setReportsLoading(false);
    }
  }, [token]);

  // ── Initial load ────────────────────────────────────────────────────────

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchHotspots(controller.signal);
    fetchReports(controller.signal);

    return () => controller.abort();
  }, [fetchHotspots, fetchReports]);

  // ── Manual refresh ──────────────────────────────────────────────────────

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    await Promise.allSettled([
      fetchHotspots(controller.signal),
      fetchReports(controller.signal),
    ]);
    setRefreshing(false);
  }

  // ── Status PATCH ────────────────────────────────────────────────────────

  async function handlePatchStatus(reportId, opsStatus) {
    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r.reportId === reportId ? { ...r, opsStatus } : r,
      ),
    );
    try {
      await patchWardReportStatus(reportId, opsStatus, token);
      // Refresh both panels so hotspot open-counts reflect the change
      await fetchHotspots();
      await fetchReports();
    } catch (err) {
      // Revert optimistic update on failure — re-fetch to get truth
      await fetchReports();
      throw err; // let ReportCard show the error
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────

  function handleLogout() {
    logout();
    navigate('/ward/login', { replace: true });
  }

  // ── Open report count (for tab badge) ───────────────────────────────────

  const openCount = reports.filter((r) => r.opsStatus === 'open').length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.screen}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className={styles.header}>
        <button
          className={styles.headerBack}
          onClick={() => navigate('/')}
          aria-label="Back to map"
        >
          ←
        </button>

        <div className={styles.headerInfo}>
          <p className={styles.headerTitle}>Ward Dashboard</p>
          <p className={styles.headerSub}>
            {user?.username ?? 'officer'} · {user?.email ?? ''}
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Refresh */}
          <button
            className={styles.headerBtn}
            onClick={handleRefresh}
            aria-label="Refresh dashboard"
            disabled={refreshing}
          >
            {refreshing
              ? <Spinner size={16} color="#fff" />
              : <span aria-hidden="true">↻</span>
            }
          </button>

          {/* Logout */}
          <button
            className={styles.headerLogout}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Sticky tab bar ────────────────────────────────────────────── */}
      <nav className={styles.tabBar} aria-label="Dashboard sections">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            {Icon && <Icon size={14} aria-hidden="true" style={{ marginRight: '6px' }} />}
            {label}
            {id === 'reports' && openCount > 0 && (
              <span className={styles.tabBadge}>{openCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <main className={styles.body}>

        {activeTab === 'hotspots' && (
          <>
            <p className={styles.sectionTitle}>
              Pump dispatch priority — ranked by risk score
            </p>
            <HotspotList
              hotspots={hotspots}
              loading={hotspotsLoading}
              error={hotspotsError}
              onRetry={() => fetchHotspots()}
            />
          </>
        )}

        {activeTab === 'reports' && (
          <>
            <p className={styles.sectionTitle}>
              Flood reports in your ward
            </p>
            <ReportFeed
              reports={reports}
              loading={reportsLoading}
              error={reportsError}
              onRetry={() => fetchReports()}
              onPatch={handlePatchStatus}
              filter={feedFilter}
              onFilter={setFeedFilter}
            />
          </>
        )}

      </main>
    </div>
  );
}
