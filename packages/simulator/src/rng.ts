/**
 * Seeded RNG — re-exported from `@molemisi/game-config`.
 *
 * A run must be reproducible from `--seed`, or a failing run cannot be
 * investigated. The generator itself lives in the shared config package so the
 * simulator and the live API draw from ONE implementation and cannot drift
 * (09 §10 / NFR-SIM-009). See `packages/game-config/src/rng.ts`.
 */
export { Rng, createRng, hashSeed, tickSeed, seededRng } from '@molemisi/game-config';
export type { RngSource, CallableRng } from '@molemisi/game-config';
