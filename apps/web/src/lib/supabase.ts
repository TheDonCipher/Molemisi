'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client (singleton).
 *
 * Auth is Supabase on both ends: the API verifies the Supabase JWT
 * (SupabaseService.verifyToken), and this client owns the browser session —
 * login, token refresh, and logout all flow through here.
 *
 * Configured from NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'molemisi_supabase_auth',
    },
  });

  return browserClient;
}

/** True when the browser Supabase client can be constructed. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
