/**
 * The production-target safety rail. Built first, per implementation prompt §0:
 * a simulator that can touch production data is worse than no simulator.
 *
 * Three independent gates, all of which must pass:
 *   1. `SIMULATOR_ALLOW=true` — only ever set in test contexts.
 *   2. `NODE_ENV` is a non-production environment.
 *   3. The target host is explicitly allow-listed. Default is local-only.
 *
 * No new named environments are introduced; the harness runs against whichever
 * dev/test/staging environment it is pointed at.
 */

const ALLOWED_NODE_ENVS = new Set(['development', 'test', 'testing', 'staging']);

/** Loopback plus anything the operator has explicitly opted into. */
const DEFAULT_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export class SafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyError';
  }
}

export interface SafetyVerdict {
  allowed: boolean;
  host: string;
  reasons: string[];
}

/** Parse a target URL and decide whether the harness may run against it. */
export function checkTarget(target: string, env: Record<string, string | undefined>): SafetyVerdict {
  const reasons: string[] = [];
  let host = '';

  try {
    host = new URL(target).hostname.toLowerCase();
  } catch {
    reasons.push(`target "${target}" is not a valid URL`);
    return { allowed: false, host, reasons };
  }

  if (env['SIMULATOR_ALLOW'] !== 'true') {
    reasons.push('SIMULATOR_ALLOW is not "true"');
  }

  const nodeEnv = (env['NODE_ENV'] ?? '').toLowerCase();
  const envOverride = (env['SIMULATOR_ALLOW_ENV'] ?? '').toLowerCase();
  const envOk = envOverride ? envOverride === nodeEnv || envOverride === 'any' : ALLOWED_NODE_ENVS.has(nodeEnv);
  if (!envOk) {
    reasons.push(
      `NODE_ENV="${nodeEnv || '(unset)'}" is not a test environment` +
        ' (set SIMULATOR_ALLOW_ENV to override)',
    );
  }

  const extra = (env['SIMULATOR_ALLOW_HOSTS'] ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const allowedHosts = new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);

  const hostOk =
    allowedHosts.has(host) || host.endsWith('.local') || host.endsWith('.localhost') || extra.includes(host);
  if (!hostOk) {
    reasons.push(
      `host "${host}" is not allow-listed (add it to SIMULATOR_ALLOW_HOSTS if it really is a test target)`,
    );
  }

  return { allowed: reasons.length === 0, host, reasons };
}

/** Throw unless the target is allow-listed. Call this before anything else. */
export function assertTargetAllowed(
  target: string,
  env: Record<string, string | undefined> = process.env,
): void {
  const verdict = checkTarget(target, env);
  if (!verdict.allowed) {
    throw new SafetyError(
      `Refusing to run the simulator against "${target}":\n  - ${verdict.reasons.join('\n  - ')}`,
    );
  }
}
