'use client';

import { getSupabase } from './supabase';

/**
 * Client-side auth session helpers.
 *
 * The API remains the orchestration authority for login/register (it performs
 * the Supabase sign-in, the ban check, and account provisioning), and returns
 * the Supabase session. These helpers hand that session to the browser
 * Supabase client so IT owns the session lifecycle — refresh + logout.
 *
 * We keep a copy of the access token in localStorage under `molemisi_token`
 * because the API helper (apiFetch) reads it from there. onAuthStateChange
 * keeps it fresh as Supabase rotates the JWT.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TOKEN_KEYS = ['molemisi_token', 'token'];
const ROLE_KEY = 'molemisi_role';

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  for (const k of TOKEN_KEYS) localStorage.setItem(k, token);
}

function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
  localStorage.removeItem(ROLE_KEY);
}

/**
 * Establish the browser Supabase session from an API-issued token pair.
 * Also mirrors the access token into localStorage for apiFetch.
 */
export async function establishSession(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await getSupabase().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.warn('[Auth] Could not establish Supabase session', err);
  }
  setToken(accessToken);
}

/** Fetch the current account tier from the API and cache the role. */
export async function fetchRole(): Promise<MeResponse | null> {
  try {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('molemisi_token') || localStorage.getItem('token')
        : null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const json = await res.json();
    const me = (json?.data ?? json) as MeResponse;
    if (typeof window !== 'undefined' && me?.role) localStorage.setItem(ROLE_KEY, me.role);
    return me;
  } catch (err) {
    console.warn('[Auth] Could not fetch role', err);
    return null;
  }
}

export function getStoredRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

/**
 * Real Supabase logout: invalidates the session server-side, then clears the
 * local token mirror.
 */
export async function supabaseLogout(): Promise<void> {
  try {
    await getSupabase().auth.signOut();
  } catch (err) {
    console.warn('[Auth] Supabase signOut failed', err);
  }
  clearStoredAuth();
}

/**
 * Keep the localStorage token mirror in sync with the live Supabase session.
 * Refreshes `molemisi_token` when Supabase rotates the JWT, and clears it on
 * sign-out. Returns an unsubscribe function.
 */
export function initAuthSync(onSignedOut?: () => void): () => void {
  let unsubscribe = () => {};
  try {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (typeof window === 'undefined') return;
      if (session?.access_token) {
        setToken(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        clearStoredAuth();
        onSignedOut?.();
      }
    });
    unsubscribe = () => data.subscription.unsubscribe();
  } catch (err) {
    console.warn('[Auth] Could not subscribe to Supabase auth state', err);
  }
  return unsubscribe;
}

/**
 * If localStorage has no token but the browser Supabase session is still valid,
 * hydrate the token mirror. Used by the game guard so a hard refresh (or a
 * token cleared elsewhere) doesn't bounce the player to /auth/login.
 */
export async function hydrateTokenFromSession(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token ?? null;
    if (token) setToken(token);
    return token;
  } catch {
    return null;
  }
}
