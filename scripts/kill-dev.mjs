#!/usr/bin/env node
/**
 * Molemisi — dev port cleanup.
 *
 * Kills whatever is listening on the standard Molemisi dev ports so that
 * `pnpm dev` (turbo) can start cleanly instead of dying with EADDRINUSE.
 *
 * Usage:  node scripts/kill-dev.mjs            (defaults to 3000 3001 3002)
 *         node scripts/kill-dev.mjs 3000 3001 3002 3003
 */
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

const DEFAULT_PORTS = [3000, 3001, 3002];
const ports = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : DEFAULT_PORTS;

const isWin = platform() === 'win32';

function pidsOnPort(port) {
  let out = '';
  try {
    out = execSync(
      isWin
        ? `netstat -ano | findstr :${port} | findstr LISTENING`
        : `lsof -ti tcp:${port} || true`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    // findstr returns exit 1 when no match — that's fine, means port is free
    return [];
  }
  const pids = out
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).pop())
    .filter((p) => p && /^\d+$/.test(p));
  return [...new Set(pids)];
}

for (const port of ports) {
  const pids = pidsOnPort(port);
  if (pids.length === 0) {
    console.log(`[kill-dev] port ${port}: free`);
    continue;
  }
  for (const pid of pids) {
    try {
      if (isWin) {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      }
      console.log(`[kill-dev] port ${port}: killed pid ${pid}`);
    } catch (err) {
      console.log(`[kill-dev] port ${port}: could not kill pid ${pid} (${err.message})`);
    }
  }
}

console.log('[kill-dev] done — ports are clear for `pnpm dev`.');
