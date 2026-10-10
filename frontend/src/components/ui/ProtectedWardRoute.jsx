/**
 * ProtectedWardRoute — renders children when the ward officer is
 * authenticated, redirects to /ward/login otherwise.
 *
 * Usage (in App.jsx):
 *   <Route path="/ward/dashboard" element={
 *     <ProtectedWardRoute><WardDashboard /></ProtectedWardRoute>
 *   } />
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useWardAuth } from '../../store/useWardAuth.js';

export function ProtectedWardRoute({ children }) {
  const { token, user } = useWardAuth();
  const location = useLocation();

  const authenticated = !!(token && user);

  if (!authenticated) {
    // Preserve the intended destination so login can redirect back
    return (
      <Navigate
        to="/ward/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
