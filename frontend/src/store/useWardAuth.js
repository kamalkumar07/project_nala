/**
 * useWardAuth — Zustand store for ward officer authentication.
 *
 * Shape:
 *   token    string | null  — Bearer token (mock string or real Cognito JWT)
 *   user     { sub, username, email, groups } | null
 *   login(token, user)     — set both, persist to sessionStorage
 *   logout()               — clear both, remove from sessionStorage
 *   isAuthenticated        — derived: token != null && user != null
 *
 * sessionStorage is used (not localStorage) so the session expires when the
 * browser tab is closed — appropriate for a ward officer tool.
 *
 * Key: 'nw_ward_auth'
 */

import { create } from 'zustand';

const SESSION_KEY = 'nw_ward_auth';

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { token: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { token: null, user: null };
  }
}

const initial = loadFromSession();

export const useWardAuth = create((set) => ({
  token: initial.token,
  user:  initial.user,

  get isAuthenticated() {
    return !!(this.token && this.user);
  },

  login(token, user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },

  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    set({ token: null, user: null });
  },
}));
