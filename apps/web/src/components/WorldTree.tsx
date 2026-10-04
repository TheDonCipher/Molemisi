'use client';

import React, { useState } from 'react';

/**
 * The World Tree — Sesana's restoration centrepiece (08 §2, D2; W9.9 / B5).
 *
 * The macro-goal made visible: as the village's Botho standing and its completed
 * Council Projects rise, the tree comes back. It is deliberately a DIFFERENT
 * meter from the Bushveld's per-scene restoration (`04 §7`): Bushveld
 * restoration is ecological and per-scene, the World Tree is community-wide.
 *
 * STAGES mirror `04 §7.2` — 40% / 70% / 100% restoration, four sprites.
 *
 * The art is NEW (see `Asset_Manifest_MVP.md` §1) and may not be generated yet,
 * so every stage falls back: the missing sprite degrades to a labelled plate
 * with the same silhouette so the panel still reads as a progression and a
 * player can see how far they have to go.
 */

/** Restoration fractions that select a stage (`04 §7.2`). */
export const WORLD_TREE_STAGE_THRESHOLDS = [0.4, 0.7, 1] as const;

/** Botho is weighted above projects: standing is the slower, truer signal. */
export const WORLD_TREE_BOTHO_WEIGHT = 0.6;
export const WORLD_TREE_PROJECTS_WEIGHT = 0.4;

export interface WorldTreeProps {
  /** Canonical Botho standing. */
  botho: number;
  /** Botho considered "restored" — pass the top Botho threshold in use. */
  bothoGoal: number;
  /** Council Projects completed. */
  projectsCompleted: number;
  /** Council Projects in the current year's set. */
  projectsTotal: number;
  className?: string;
}

/** Blended 0..1 community restoration. */
export function communityRestoration(p: {
  botho: number;
  bothoGoal: number;
  projectsCompleted: number;
  projectsTotal: number;
}): number {
  const bothoRatio = p.bothoGoal > 0 ? clamp01(p.botho / p.bothoGoal) : 0;
  const projectsRatio = p.projectsTotal > 0 ? clamp01(p.projectsCompleted / p.projectsTotal) : 0;
  return clamp01(
    bothoRatio * WORLD_TREE_BOTHO_WEIGHT + projectsRatio * WORLD_TREE_PROJECTS_WEIGHT,
  );
}

export function worldTreeStage(restoration: number): 0 | 1 | 2 | 3 {
  const r = clamp01(restoration);
  if (r >= WORLD_TREE_STAGE_THRESHOLDS[2]) return 3;
  if (r >= WORLD_TREE_STAGE_THRESHOLDS[1]) return 2;
  if (r >= WORLD_TREE_STAGE_THRESHOLDS[0]) return 1;
  return 0;
}

const STAGE_LINES: Record<number, { en: string; tn: string }> = {
  0: { en: 'The tree sleeps. The land is still listening.', tn: 'Searo e robala.' },
  1: { en: 'Green shoots. Something is answering.', tn: 'Mahlatsi a le tshameka.' },
  2: { en: 'A crown returns. The shade comes back.', tn: 'Korong e buetsa.' },
  3: { en: 'Sesana has its shade again.', tn: 'Sesana o na le lephetho.' },
};

export function WorldTree({
  botho,
  bothoGoal,
  projectsCompleted,
  projectsTotal,
  className = '',
}: WorldTreeProps) {
  const [broken, setBroken] = useState<number | null>(null);
  const restoration = communityRestoration({ botho, bothoGoal, projectsCompleted, projectsTotal });
  const stage = worldTreeStage(restoration);
  const pct = Math.round(restoration * 100);
  const src = `/assets/sprites/world/world_tree_stage_${stage}.png`;

  return (
    <div className={`border-2 border-wood-border bg-wood-dark/90 p-3 ${className}`}>
      <div className="relative border border-wood-border bg-surface/60 overflow-hidden">
        {broken === stage ? (
          // Placeholder plate: keeps the silhouette and the stage label so the
          // progression still reads before the art lands.
          <div className="h-32 sm:h-40 flex flex-col items-center justify-center gap-1 text-center px-3">
            <span aria-hidden="true" className="text-2xl opacity-70">
              {stage === 0 ? '🌳' : stage === 1 ? '🌱' : stage === 2 ? '🌿' : '🌳'}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant uppercase">
              Sekala {stage + 1}/4 · {pct}%
            </span>
          </div>
        ) : (
          <img
            src={src}
            alt="The World Tree of Sesana"
            className="w-full h-32 sm:h-40 object-cover"
            style={{ imageRendering: 'pixelated' as const }}
            onError={() => setBroken(stage)}
          />
        )}
      </div>

      {/* The community-restoration meter (Botho + completed Council Projects). */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-headline text-xs text-primary uppercase font-bold">
            Sengwe · Restoration
          </span>
          <span className="font-mono text-[11px] text-cream-surface font-bold">{pct}%</span>
        </div>
        <div
          className="mt-1 h-2.5 w-full bg-surface-container-high/60 border border-wood-border"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Community restoration"
        >
          <div
            className="h-full bg-gradient-to-r from-warm-grass to-gold-currency transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="font-body text-[12px] text-cream-surface/85 leading-snug mt-1">
          {STAGE_LINES[stage]!.en}
          <span className="block font-mono text-[10px] text-primary italic">{STAGE_LINES[stage]!.tn}</span>
        </p>
        <p className="font-mono text-[9px] text-on-surface-variant/70">
          Botho {botho}/{bothoGoal} · Projects {projectsCompleted}/{projectsTotal}
        </p>
      </div>
    </div>
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}