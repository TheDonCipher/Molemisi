'use client';

/**
 * Crafting data layer — wires the UI to the finished P3 backend
 * (05 §P3; 03 §3 crafting; 02 §6.3 values).
 *
 * The server is authoritative on everything that is money or time (I7): fees,
 * margins, unlocks, durations and ready-at timestamps all come down the wire and
 * are never recomputed here. What this module computes is only *eligibility* —
 * "could I afford this right now?" — which is a question about the player's own
 * bag and is exactly what 03 §3.6 asks the screen to lead with.
 *
 * One deliberate design note: `chosenInputs` sent to `POST /start` is expressed
 * PER UNIT ("2 clay per brick"); the server scales it by the batch. That was not
 * always true and getting it wrong is what made batching mint goods from nothing —
 * see the regression test in `crafting.service.spec.ts`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, useGame } from './gameState';

export const BATCH_SIZES = [1, 3, 6] as const;
export type BatchSize = (typeof BATCH_SIZES)[number];

export interface InputGroup {
  anyOf: string[];
  qty: number;
}

export interface RecipeEconomics {
  inputValue: number;
  fee: number;
  totalCost: number;
  saleGross: number;
  netAfterTax: number;
  profit: number;
  roi: number;
}

export interface CraftingRecipe {
  slug: string;
  name: string;
  setswana: string;
  outputSlug: string;
  outputQty: number;
  inputs: InputGroup[];
  feePula: number;
  batchFees: Record<string, number>;
  durationMinutes: number;
  unlock: { bothoGte: number } | null;
  isUnlocked: boolean;
  economics: RecipeEconomics;
}

export interface CraftingJob {
  id: string;
  recipeSlug: string;
  qty: number;
  slotIndex: number;
  startedAt: string;
  readyAt: string;
  collected: boolean;
}

export interface StartResult {
  jobId: string;
  slotIndex: number;
  readyAt: string;
  fee: number;
}

export interface CollectResult {
  recipeSlug: string;
  outputSlug: string;
  quantity: number;
  bonus: boolean;
  overflow: number;
}

/** A shortfall: how much of `slug` the player is missing for a given batch. */
export interface Shortfall {
  slug: string;
  need: number;
  have: number;
}

export function useCrafting() {
  const { farmId, inventory, pula, showToast, refresh } = useGame();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [jobs, setJobs] = useState<CraftingJob[]>([]);
  const [slots, setSlots] = useState(1);
  const [loading, setLoading] = useState(false);
  /** Recipe slug or job id currently in flight. */
  const [busy, setBusy] = useState<string | null>(null);
  /** Ticks once a second, but only while something is actually crafting. */
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const [catalog, active] = await Promise.allSettled([
        apiFetch<{ recipes: CraftingRecipe[]; slots: number }>(
          'GET',
          `/farms/${farmId}/crafting`,
        ),
        apiFetch<{ jobs: CraftingJob[] }>('GET', `/farms/${farmId}/crafting/jobs`),
      ]);
      if (catalog.status === 'fulfilled') {
        setRecipes(catalog.value?.recipes ?? []);
        setSlots(catalog.value?.slots ?? 1);
      }
      if (active.status === 'fulfilled') setJobs(active.value?.jobs ?? []);
    } catch (e: any) {
      showToast('Crafting', e?.message || 'Could not load the workshop', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [farmId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Only run the clock when there is something to count down.
  const pending = jobs.filter((j) => !j.collected);
  useEffect(() => {
    if (pending.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending.length]);

  const start = useCallback(
    async (recipeSlug: string, qty: BatchSize, chosenInputs: Record<string, number>) => {
      if (!farmId) return null;
      setBusy(recipeSlug);
      try {
        const data = await apiFetch<StartResult>(
          'POST',
          `/farms/${farmId}/crafting/start`,
          { recipeSlug, qty, chosenInputs },
        );
        showToast('Crafting started', `×${qty} · fee P${data.fee}`, '🔨', 'success');
        await refresh();
        await load();
        return data;
      } catch (e: any) {
        showToast('Cannot craft', e?.message || 'The workshop refused the batch', '⚠️', 'error');
        return null;
      } finally {
        setBusy(null);
      }
    },
    [farmId, load, refresh, showToast],
  );

  const collect = useCallback(
    async (jobId: string) => {
      if (!farmId) return null;
      setBusy(jobId);
      try {
        const data = await apiFetch<CollectResult>(
          'POST',
          `/farms/${farmId}/crafting/${jobId}/collect`,
        );
        const overflowNote = data.overflow > 0 ? ` · ${data.overflow} lost to a full bag` : '';
        showToast(
          data.bonus ? 'A generous batch!' : 'Collected',
          `+${data.quantity} × ${data.outputSlug}${overflowNote}`,
          data.bonus ? '✨' : '🧺',
          'success',
        );
        await refresh();
        await load();
        return data;
      } catch (e: any) {
        showToast('Not yet', e?.message || 'Could not collect', '⚠️', 'error');
        return null;
      } finally {
        setBusy(null);
      }
    },
    [farmId, load, refresh, showToast],
  );

  /** slug -> how many the player is holding. */
  const owned = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of inventory ?? []) {
      const slug = item.itemType;
      if (!slug) continue;
      map[slug] = (map[slug] ?? 0) + item.quantity;
    }
    return map;
  }, [inventory]);

  /** slug -> display name, falling back to a prettified slug. */
  const itemName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of inventory ?? []) {
      if (item.itemType) map[item.itemType] = item.name;
    }
    return map;
  }, [inventory]);

  const nameFor = useCallback(
    (slug: string) =>
      itemName[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    [itemName],
  );

  /**
   * 03 §3.3 — default to whichever the player has MOST of, and let them override.
   * Per-unit quantities, matching what `POST /start` expects.
   */
  const defaultChoice = useCallback(
    (recipe: CraftingRecipe): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const group of recipe.inputs) {
        if (group.anyOf.length === 1) {
          out[group.anyOf[0]!] = group.qty;
          continue;
        }
        const best = [...group.anyOf].sort((a, b) => (owned[b] ?? 0) - (owned[a] ?? 0))[0];
        out[best ?? group.anyOf[0]!] = group.qty;
      }
      return out;
    },
    [owned],
  );

  /**
   * The visible substitution choices for one input group. Two options get the full
   * spread of splits (so Setena's mixed clay+stone pair is offerable); three or
   * more collapse to "all from one", which is the honest reading of the choice.
   */
  const compositionsFor = useCallback((group: InputGroup): Record<string, number>[] => {
    if (group.anyOf.length === 2) {
      const [a, b] = group.anyOf;
      const out: Record<string, number>[] = [];
      for (let k = group.qty; k >= 0; k--) {
        const comp: Record<string, number> = {};
        if (k > 0) comp[a!] = k;
        if (group.qty - k > 0) comp[b!] = group.qty - k;
        out.push(comp);
      }
      return out;
    }
    return group.anyOf.map((slug) => ({ [slug]: group.qty }));
  }, []);

  /** Is this composition actually in the bag? */
  const hasComposition = useCallback(
    (comp: Record<string, number>, batch: BatchSize) => {
      for (const [slug, n] of Object.entries(comp)) {
        if ((owned[slug] ?? 0) < n * batch) return false;
      }
      return true;
    },
    [owned],
  );

  /**
   * 03 §3.6 — "Default the batch to the maximum affordable."
   * Bounded by materials AND by Pula, against the server's own fee table.
   * Returns 0 when even a single craft is out of reach.
   */
  const maxAffordableBatch = useCallback(
    (recipe: CraftingRecipe, chosen: Record<string, number>): BatchSize | 0 => {
      let byMaterial = Number.POSITIVE_INFINITY;
      for (const [slug, n] of Object.entries(chosen)) {
        if (n <= 0) continue;
        byMaterial = Math.min(byMaterial, Math.floor((owned[slug] ?? 0) / n));
      }
      if (!Number.isFinite(byMaterial)) byMaterial = 0;

      let best: BatchSize | 0 = 0;
      for (const b of BATCH_SIZES) {
        if (b > byMaterial) continue;
        const fee = recipe.batchFees?.[b];
        if (fee == null) continue;
        if (fee <= pula) best = b;
      }
      return best;
    },
    [owned, pula],
  );

  /** What the player is short of, for a given batch (03 §3.6 "what am I short of?"). */
  const shortfalls = useCallback(
    (chosen: Record<string, number>, batch: BatchSize): Shortfall[] => {
      const out: Shortfall[] = [];
      for (const [slug, n] of Object.entries(chosen)) {
        const need = n * batch;
        const have = owned[slug] ?? 0;
        if (have < need) out.push({ slug, need, have });
      }
      return out;
    },
    [owned],
  );

  const activeJobs = pending;
  const freeSlots = Math.max(0, slots - activeJobs.length);

  /** 03 §3.6 — "What can I make right now?" Money, materials and a free slot. */
  const readyNow = useMemo(
    () =>
      recipes.filter((r) => {
        if (!r.isUnlocked || freeSlots <= 0) return false;
        return maxAffordableBatch(r, defaultChoice(r)) > 0;
      }),
    [recipes, freeSlots, maxAffordableBatch, defaultChoice],
  );

  return {
    recipes,
    jobs,
    activeJobs,
    pula,
    slots,
    freeSlots,
    readyNow,
    loading,
    busy,
    now,
    owned,
    start,
    collect,
    defaultChoice,
    compositionsFor,
    hasComposition,
    maxAffordableBatch,
    shortfalls,
    nameFor,
    reload: load,
  };
}
