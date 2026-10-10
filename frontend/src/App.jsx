/**
 * App.jsx — root component.
 *
 * Route map:
 *   /                        DelhiMap  (production flood-monitoring dashboard)
 *   /map                     DelhiMap  (alias)
 *   /home                    Home      (landing / CTA)
 *   /report                  StepPhoto   (step 1)
 *   /report/location         StepLocation (step 2)
 *   /report/review           StepReview  (step 3)
 *   /report/analyzing        StepAnalyzing (step 4, ?id=)
 *   /result                  ResultScreen (?id=)
 *   /ward/login              WardLogin
 *   /ward/dashboard          WardDashboard (protected)
 *   *                        404 → /
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { OfflineBanner }       from './components/ui/OfflineBanner.jsx';
import { ProtectedWardRoute }  from './components/ui/ProtectedWardRoute.jsx';
import { ToastProvider }       from './components/ui/Toast.jsx';
import { LandingPage }         from './pages/LandingPage/LandingPage.jsx';
import { HimachalMap }         from './pages/HimachalMap/HimachalMap.jsx';
import { ReportFlowPage }     from './pages/ReportFlow/ReportFlowPage.jsx';
import { ResultScreen }        from './pages/ResultScreen/ResultScreen.jsx';
import { WardLogin }           from './pages/WardLogin.jsx';
import { WardDashboard }       from './pages/WardDashboard/WardDashboard.jsx';
import { Styleguide }          from './pages/Styleguide.jsx';
import styles from './App.module.css';

export default function App() {
  return (
    <ToastProvider>
      <OfflineBanner />
      <div className={styles.appShell}>
        <Routes>
          <Route path="/"                  element={<LandingPage />} />
          <Route path="/home"              element={<Navigate to="/" replace />} />
          <Route path="/app"               element={<HimachalMap />} />
          <Route path="/map"               element={<HimachalMap />} />
          <Route path="/app/report"        element={<ReportFlowPage />} />
          <Route path="/report"            element={<ReportFlowPage />} />
          <Route path="/app/report/*"      element={<ReportFlowPage />} />
          <Route path="/report/*"          element={<ReportFlowPage />} />
          <Route path="/result"            element={<ResultScreen />} />
          <Route path="/ward/login"        element={<WardLogin />} />
          <Route path="/ward/dashboard"    element={
            <ProtectedWardRoute>
              <WardDashboard />
            </ProtectedWardRoute>
          } />
          <Route path="/styleguide"        element={<Styleguide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}
