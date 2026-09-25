/**
 * Service-role account provisioning — a FIDELITY COMPROMISE, not the preferred path.
 *
 * WHY THIS EXISTS
 * `/auth/register` is the only API path that builds a complete player, but it calls
 * GoTrue's `signUp`, and the cloud project runs with `mailer_autoconfirm: false`.
 * Every signup therefore attempts to send a confirmation email through Supabase's
 * built-in SMTP, which permits only a handful of messages per hour. Measured on
 * 2026-09-24: six registrations with valid addresses, six `email rate limit exceeded`.
 * Bulk provisioning through the real endpoint is simply impossible while that setting
 * is off.
 *
 * So when a service-role key is available we build the fixture directly:
 *   1. GoTrue admin `createUser` with `email_confirm: true` — no email is sent, so no
 *      rate limit applies.
 *   2. Log in through the REAL API (`/auth/login`) to obtain a genuine JWT. Nothing
 *      about authentication is faked; only the account's creation is.
 *   3. Replicate the bootstrap writes `AuthService.register` performs.
 *
 * THE MIRROR IS `apps/api/src/auth/auth.service.ts`. If that method changes, this must
 * change with it. The order matters: inserting `profiles` fires
 * `trg_profile_seed_wallet`, which seeds `player_wallets` from `profiles.currency`.
 * Without that column the wallet starts at the trigger's 250 fallback rather than the
 * configured `STARTING_PULA`.
 *
 * Players created this way are tagged `provisionedVia: 'admin'` and every report says
 * so, so a reader is never misled into thinking the register endpoint was exercised.
 *
 * Prefer flipping "Confirm email" off in the project's Auth settings and deleting this
 * module's use — see the implementation prompt's verification status.
 */

import { STARTING_PLOTS, STARTING_PULA } from '@molemisi/game-config';
import type { ApiClient } from './client';

/** Starter kit, mirroring `AuthService.register` exactly. */
const STARTER_SEEDS: readonly { slug: string; qty: number }[] = [
  { slug: 'sorghum_seed', qty: 10 },
  { slug: 'maize_seed', qty: 5 },
];

const STARTER_TOOLS: readonly string[] = ['mogoma', 'selepe', 'watering_can', 'pickaxe'];

/** The starter Jojo tank every farm gets so growth isn't softlocked behind 800 Pula. */
const STARTER_TANK = {
  building_type: 'water_source',
  level: 1,
  state: 'ACTIVE',
  capacity: 60,
  wear: 0,
  water_level: 60,
} as const;

export interface AdminCreds {
  supabaseUrl: string;
  serviceKey: string;
}

export class ProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvisionError';
  }
}

function restHeaders(creds: AdminCreds): Record<string, string> {
  return {
    apikey: creds.serviceKey,
    authorization: `Bearer ${creds.serviceKey}`,
    'content-type': 'application/json',
  };
}

function base(creds: AdminCreds): string {
  return creds.supabaseUrl.replace(/\/+$/, '');
}

async function fail(res: Response, what: string): Promise<never> {
  const body = await res.text().catch(() => '');
  throw new ProvisionError(`${what}: HTTP ${res.status} ${body.slice(0, 300)}`);
}

/** Step 1 — create a confirmed auth user. No email is sent, so no rate limit. */
export async function adminCreateUser(
  creds: AdminCreds,
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  const res = await fetch(`${base(creds)}/auth/v1/admin/users`, {
    method: 'POST',
    headers: restHeaders(creds),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    }),
  });
  if (!res.ok) await fail(res, 'admin createUser');
  const data = (await res.json()) as { id?: string; user?: { id?: string } };
  const id = data.id ?? data.user?.id;
  if (!id) throw new ProvisionError('admin createUser returned no user id');
  return id;
}

async function restInsert(
  creds: AdminCreds,
  table: string,
  rows: unknown,
  returning: boolean,
): Promise<unknown[]> {
  const res = await fetch(`${base(creds)}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...restHeaders(creds),
      prefer: returning ? 'return=representation' : 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) await fail(res, `insert ${table}`);
  if (!returning) return [];
  const out = (await res.json()) as unknown;
  return Array.isArray(out) ? out : [out];
}

async function itemDefId(creds: AdminCreds, slug: string): Promise<string> {
  const res = await fetch(
    `${base(creds)}/rest/v1/item_definitions?slug=eq.${encodeURIComponent(slug)}&select=id`,
    { headers: restHeaders(creds) },
  );
  if (!res.ok) await fail(res, `lookup item ${slug}`);
  const rows = (await res.json()) as { id: string }[];
  const id = rows[0]?.id;
  if (!id) throw new ProvisionError(`unknown item slug "${slug}" — is the catalogue seeded?`);
  return id;
}

/**
 * Step 3 — replicate `AuthService.register`'s bootstrap writes.
 * Returns the new farm id.
 */
export async function bootstrapPlayer(
  creds: AdminCreds,
  userId: string,
  displayName: string,
): Promise<string> {
  const farmName = `${displayName}'s Farm`;

  // profiles — the AFTER INSERT trigger seeds player_wallets from `currency`.
  await restInsert(
    creds,
    'profiles',
    { id: userId, display_name: displayName, farm_name: farmName, currency: STARTING_PULA },
    false,
  );

  // farms
  const farms = await restInsert(
    creds,
    'farms',
    { user_id: userId, name: farmName, plot_count: STARTING_PLOTS },
    true,
  );
  const farmId = (farms[0] as { id?: string } | undefined)?.id;
  if (!farmId) throw new ProvisionError('farm insert returned no id');

  // farm_plots
  const plots = Array.from({ length: STARTING_PLOTS }, (_, i) => ({
    farm_id: farmId,
    slot_index: i,
    state: 'EMPTY',
  }));
  await restInsert(creds, 'farm_plots', plots, false);

  // buildings — starter Jojo tank, full and ACTIVE
  await restInsert(
    creds,
    'buildings',
    { farm_id: farmId, ...STARTER_TANK, last_maintained_at: new Date().toISOString() },
    false,
  );

  // player_inventory — seeds then tools (tools are equipment, never occupy a slot)
  const rows: { player_id: string; item_def_id: string; quantity: number }[] = [];
  for (const { slug, qty } of STARTER_SEEDS) {
    rows.push({ player_id: userId, item_def_id: await itemDefId(creds, slug), quantity: qty });
  }
  for (const slug of STARTER_TOOLS) {
    rows.push({ player_id: userId, item_def_id: await itemDefId(creds, slug), quantity: 1 });
  }
  await restInsert(creds, 'player_inventory', rows, false);

  return farmId;
}

async function findUserByEmail(creds: AdminCreds, email: string): Promise<string | null> {
  const res = await fetch(
    `${base(creds)}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: restHeaders(creds) },
  );
  if (!res.ok) await fail(res, 'admin listUsers');
  const data = (await res.json()) as { users?: { id: string; email?: string }[] };
  const match = (data.users ?? []).find(
    (u) => (u.email ?? '').toLowerCase() === email.toLowerCase(),
  );
  return match?.id ?? null;
}

/** Keep the password in step so a reused account can still log in. */
async function setUserPassword(creds: AdminCreds, userId: string, password: string): Promise<void> {
  const res = await fetch(`${base(creds)}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: restHeaders(creds),
    body: JSON.stringify({ password }),
  });
  if (!res.ok) await fail(res, 'admin updateUser password');
}

async function findFarmId(creds: AdminCreds, userId: string): Promise<string | null> {
  const res = await fetch(
    `${base(creds)}/rest/v1/farms?user_id=eq.${encodeURIComponent(userId)}&select=id`,
    { headers: restHeaders(creds) },
  );
  if (!res.ok) await fail(res, 'lookup farm');
  const rows = (await res.json()) as { id: string }[];
  return rows[0]?.id ?? null;
}

/**
 * Steps 1–3 in order. Does not log in — the caller does that through the API.
 *
 * Idempotent: if the address already exists (a deliberate re-run with an explicit
 * `--run-token`), the existing user is reused and its password reset rather than
 * failing. A user that already owns a farm keeps it, so re-running does not
 * duplicate plots or starter inventory.
 */
export async function provisionPlayer(
  creds: AdminCreds,
  email: string,
  password: string,
  displayName: string,
): Promise<{ userId: string; farmId: string; reused: boolean }> {
  let userId: string;
  let reused = false;

  try {
    userId = await adminCreateUser(creds, email, password, displayName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/email_exists|already been registered/i.test(msg)) throw err;

    const existing = await findUserByEmail(creds, email);
    if (!existing) throw err;
    userId = existing;
    reused = true;
    await setUserPassword(creds, userId, password);
  }

  const existingFarm = await findFarmId(creds, userId);
  if (existingFarm) return { userId, farmId: existingFarm, reused: true };

  const farmId = await bootstrapPlayer(creds, userId, displayName);
  return { userId, farmId, reused };
}

/** Step 2 — obtain a genuine JWT through the real API login endpoint. */
export async function loginForToken(
  api: ApiClient,
  email: string,
  password: string,
): Promise<string> {
  const res = await api.post<Record<string, unknown>>('/auth/login', { email, password });
  if (!res.ok) {
    throw new ProvisionError(
      `login failed for ${email}: HTTP ${res.status} ${JSON.stringify(res.raw).slice(0, 200)}`,
    );
  }
  const d = res.data as { token?: string; access_token?: string } | null;
  const token = d?.token ?? d?.access_token ?? '';
  if (!token) throw new ProvisionError(`login for ${email} returned no token`);
  return token;
}
