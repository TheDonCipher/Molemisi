/**
 * Population construction and registration.
 *
 * Every simulated player is a real row in `auth.users` / `profiles` / `farms`,
 * created through the real registration flow — not a synthetic bypass. That is
 * what makes the ownership and threshold checks mean something.
 *
 * Registration grants P250, 4 plots and sorghum/maize seed stock; the actors
 * start from there rather than a fabricated state.
 */

import { ApiClient } from './client';
import { Rng } from './rng';
import { isPayer } from './config';
import { provisionPlayer, loginForToken, type AdminCreds } from './provision';
import type { Player, ProfileName, ProfileSpec, RunConfig } from './types';

export const ADVERSARY_COUNT = 1;

export interface Roster {
  /** Requested profile for each slot, before registration. */
  slots: ProfileName[];
}

/**
 * Allocate profiles across the population. Weights are relative and normalised
 * here; the adversary account is added on top and tagged synthetic so the
 * economy/ARPU report never counts it as real population.
 */
export function buildRoster(config: RunConfig, rng: Rng): Roster {
  const specs: ProfileSpec[] = config.profiles.filter((p) => p.weight > 0);
  const totalWeight = specs.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) throw new Error('buildRoster: total profile weight must be positive');

  const slots: ProfileName[] = [];
  const population = Math.max(0, config.players - ADVERSARY_COUNT);

  for (const spec of specs) {
    const share = spec.weight / totalWeight;
    const count = Math.round(share * population);
    for (let i = 0; i < count && slots.length < population; i++) slots.push(spec.name);
  }
  // Rounding drift: fill any remainder with the heaviest profile.
  while (slots.length < population) {
    const heaviest = specs.reduce((a, b) => (a.weight >= b.weight ? a : b));
    slots.push(heaviest.name);
  }
  // Shuffle so the API does not see 97 identical players in a row.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = slots[i]!;
    slots[i] = slots[j]!;
    slots[j] = tmp;
  }
  slots.push('adversary');
  return { slots };
}

export function countByProfile(slots: readonly ProfileName[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of slots) out[s] = (out[s] ?? 0) + 1;
  return out;
}

export function payerShareOf(slots: readonly ProfileName[]): number {
  const real = slots.filter((s) => s !== 'adversary');
  if (real.length === 0) return 0;
  return real.filter(isPayer).length / real.length;
}

/**
 * Register one player and resolve its farm.
 *
 * Prefers the real `/auth/register` flow. When that is unavailable (the cloud project
 * rate-limits signup emails), and a service-role key was supplied, falls back to
 * admin provisioning — see `provision.ts` for why and for the fidelity caveat.
 */
export async function registerPlayer(
  api: ApiClient,
  index: number,
  profile: ProfileName,
  rng: Rng,
  runToken: string,
  creds?: AdminCreds | null,
): Promise<Player> {
  // GoTrue rejects `+` aliases and reserved TLDs like `.test`. Use an RFC 2606
  // reserved domain: valid format, never deliverable, and identifiable by prefix
  // so synthetic accounts can be swept later.
  //
  // `runToken` — not the RNG — supplies uniqueness: the RNG is seeded for
  // reproducibility, so deriving the address from it made every run with the same
  // seed collide with the previous run's accounts.
  const email = `sim-${runToken}-${index}@example.com`;
  const password = `Sim-${rng.int(10000000, 99999999)}-x`;
  const displayName = `Sim ${index}`;

  const reg = await api.post<Record<string, unknown>>('/auth/register', {
    email,
    password,
    displayName,
  });

  if (reg.ok) {
    const token = extractToken(reg.data, reg.raw);
    const userId = extractUserId(reg.data, reg.raw) ?? '';
    const farm = await api.get<Record<string, unknown>>('/farms/current', token);
    const farmId = typeof farm.data?.['id'] === 'string' ? (farm.data['id'] as string) : '';
    return {
      index,
      profile,
      email,
      password,
      token,
      userId,
      farmId,
      synthetic: profile === 'adversary',
      provisionedVia: 'register',
    };
  }

  const reason = `HTTP ${reg.status} ${JSON.stringify(reg.raw).slice(0, 200)}`;

  if (!creds) {
    throw new Error(
      `registration failed for ${email}: ${reason}. ` +
        'No service-role key was supplied, so the admin-provisioning fallback is ' +
        'unavailable. Either enable "Confirm email" off in the project Auth settings, ' +
        'or pass --supabase-url/--supabase-key.',
    );
  }

  // Fallback: admin-create the confirmed user, then log in through the real API.
  const { userId, farmId } = await provisionPlayer(creds, email, password, displayName);
  const token = await loginForToken(api, email, password);
  return {
    index,
    profile,
    email,
    password,
    token,
    userId,
    farmId,
    synthetic: profile === 'adversary',
    provisionedVia: 'admin',
  };
}

interface MaybeToken {
  token?: unknown;
  access_token?: unknown;
  session?: { access_token?: unknown } | null;
  user?: { id?: unknown } | null;
  profile?: { id?: unknown } | null;
  id?: unknown;
}

function extractToken(data: unknown, raw: unknown): string {
  for (const src of [data, raw]) {
    const o = src as MaybeToken | null;
    if (!o || typeof o !== 'object') continue;
    if (typeof o['token'] === 'string') return o['token'] as string;
    if (typeof o['access_token'] === 'string') return o['access_token'] as string;
    const s = o['session'];
    if (s && typeof s.access_token === 'string') return s.access_token;
  }
  return '';
}

function extractUserId(data: unknown, raw: unknown): string | null {
  for (const src of [data, raw]) {
    const o = src as MaybeToken | null;
    if (!o || typeof o !== 'object') continue;
    if (typeof o['id'] === 'string') return o['id'] as string;
    if (o['user'] && typeof o['user'].id === 'string') return o['user'].id;
    if (o['profile'] && typeof o['profile'].id === 'string') return o['profile'].id;
  }
  return null;
}
