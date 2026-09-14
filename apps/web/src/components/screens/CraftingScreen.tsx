'use client';

/**
 * The Workshop — the player-facing half of P3.
 *
 * 03 §3.6 is unusually prescriptive here and this screen follows it rather than
 * showing a catalogue: a farmer does not browse recipes, they are short of two
 * planks. So it leads with "what can I make right now?", then "what am I short
 * of?", defaults the batch to the largest affordable, prints input value against
 * output value on every card, and says so out loud when a recipe is currently
 * underwater.
 *
 * Nothing on this screen computes money. Fees, margins and durations are the
 * server's numbers; the client only asks "could I afford it?" (I7).
 */

import React, { useMemo, useState } from 'react';
import { useCrafting, BATCH_SIZES, type BatchSize, type CraftingRecipe } from '../../lib/crafting';

function SectionHeading({ en, tn, note }: { en: string; tn: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <h2 className="font-headline text-sm text-primary uppercase font-bold">{en}</h2>
      <span className="font-mono text-[10px] text-on-surface-variant italic">{tn}</span>
      {note && <span className="font-mono text-[9px] text-on-surface-variant/70 ml-auto">{note}</span>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-5 text-center font-body text-sm text-cream-surface/60">{children}</div>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Ready';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function compLabel(comp: Record<string, number>, nameFor: (s: string) => string): string {
  return Object.entries(comp)
    .map(([slug, n]) => `${n}× ${nameFor(slug)}`)
    .join(' + ');
}

interface CardProps {
  recipe: CraftingRecipe;
  busy: boolean;
  freeSlots: number;
  chosen: Record<string, number>;
  batch: BatchSize;
  onBatch: (b: BatchSize) => void;
  onPick: (groupIndex: number, comp: Record<string, number>) => void;
  onCraft: () => void;
  onJump: (slug: string) => void;
  craftableOutputs: Record<string, string>;
  ctx: ReturnType<typeof useCrafting>;
}

function RecipeCard({
  recipe,
  busy,
  freeSlots,
  chosen,
  batch,
  onBatch,
  onPick,
  onCraft,
  onJump,
  craftableOutputs,
  ctx,
}: CardProps) {
  const affordable = ctx.hasComposition(chosen, batch);
  const short = ctx.shortfalls(chosen, batch);
  const fee = recipe.batchFees?.[batch] ?? recipe.feePula;
  const feeOk = fee <= ctx.pula;
  const isLoss = recipe.economics.profit < 0;
  const noSlot = freeSlots <= 0;
  const canCraft = recipe.isUnlocked && affordable && feeOk && !noSlot && !busy;

  return (
    <div
      id={`recipe-${recipe.slug}`}
      className="border-2 border-wood-border bg-wood-dark/90 px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-headline text-[15px] font-bold text-cream-surface truncate">
            {recipe.name}
          </div>
          <div className="font-mono text-[10px] text-cream-surface/60 italic">
            {recipe.setswana} · {recipe.durationMinutes >= 60
              ? `${recipe.durationMinutes / 60}h`
              : `${recipe.durationMinutes}m`}{' '}
            · makes {recipe.outputQty} × {ctx.nameFor(recipe.outputSlug)}
          </div>
        </div>
        {!recipe.isUnlocked && recipe.unlock && (
          <span className="shrink-0 px-1.5 py-0.5 border border-wood-border font-mono text-[9px] text-on-surface-variant">
            Botho {recipe.unlock.bothoGte}
          </span>
        )}
      </div>

      {/* 03 §3.6 — input value against output value, margin visible, no arithmetic. */}
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px]">
        <span className="text-on-surface-variant">in P{recipe.economics.inputValue}</span>
        <span className="text-on-surface-variant">→</span>
        <span className="text-gold-currency font-bold">out P{recipe.economics.saleGross}</span>
        <span className={isLoss ? 'text-status-danger' : 'text-status-success'}>
          {isLoss ? `−${Math.abs(recipe.economics.profit)}` : `+${recipe.economics.profit}`} ea
        </span>
      </div>
      {isLoss && (
        <p className="mt-1 font-mono text-[9px] text-status-danger">
          Underwater at today&apos;s prices — selling the materials beats crafting them.
        </p>
      )}

      {/* 03 §3.3 — substitution is a visible choice, not an automatic pick. */}
      {recipe.isUnlocked &&
        recipe.inputs.map((group, gi) => (
          <div key={gi} className="mt-2">
            {group.anyOf.length > 1 && (
              <>
                <div className="font-mono text-[9px] text-on-surface-variant mb-1">
                  Use ({group.qty}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {ctx.compositionsFor(group).map((comp) => {
                    const have = ctx.hasComposition(comp, batch);
                    const active =
                      Object.entries(comp).every(
                        ([slug, n]) => (chosen[slug] ?? 0) === n,
                      ) && Object.keys(comp).length === Object.keys(chosen).length;
                    return (
                      <button
                        key={compLabel(comp, ctx.nameFor)}
                        disabled={!have}
                        onClick={() => onPick(gi, comp)}
                        className={`px-1.5 py-0.5 font-mono text-[9px] border transition-colors ${
                          active
                            ? 'border-primary bg-primary-container text-on-primary-container font-bold'
                            : 'border-wood-border text-on-surface-variant'
                        } ${!have ? 'opacity-40' : ''}`}
                      >
                        {compLabel(comp, ctx.nameFor)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}

      {/* 03 §3.2 / §3.6 — 1/3/6 segmented control, defaulting to max affordable. */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex border border-wood-border">
          {BATCH_SIZES.map((b) => (
            <button
              key={b}
              onClick={() => onBatch(b)}
              className={`px-2 py-0.5 font-mono text-[10px] transition-colors ${
                batch === b
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant'
              }`}
            >
              ×{b}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] text-gold-currency font-bold">fee P{fee}</span>
      </div>

      {short.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] text-on-surface-variant">Short:</span>
          {short.map((s) => {
            const maker = craftableOutputs[s.slug];
            return maker ? (
              <button
                key={s.slug}
                onClick={() => onJump(maker)}
                className="px-1.5 py-0.5 border border-primary/50 font-mono text-[9px] text-primary"
              >
                {s.need - s.have} × {ctx.nameFor(s.slug)} → make it
              </button>
            ) : (
              <span
                key={s.slug}
                className="font-mono text-[9px] text-status-danger"
              >
                {s.need - s.have} × {ctx.nameFor(s.slug)}
              </span>
            );
          })}
        </div>
      )}

      <button
        disabled={!canCraft}
        onClick={onCraft}
        className="mt-3 w-full py-1.5 font-mono text-[10px] uppercase border-2 border-primary bg-primary-container text-on-primary-container font-bold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy
          ? 'Working...'
          : noSlot
            ? 'No free slot'
            : !affordable
              ? 'Missing materials'
              : !feeOk
                ? 'Not enough Pula'
                : 'Craft'}
      </button>
    </div>
  );
}

export function CraftingScreen() {
  const ctx = useCrafting();
  const { recipes, activeJobs, freeSlots, slots, loading, busy, now } = ctx;

  const [batchBySlug, setBatchBySlug] = useState<Record<string, BatchSize>>({});
  const [choiceBySlug, setChoiceBySlug] = useState<Record<string, Record<string, number>>>({});

  /** Which recipe produces a given item — powers "short of Bupi → make it". */
  const craftableOutputs = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of recipes) map[r.outputSlug] = r.slug;
    return map;
  }, [recipes]);

  const chosenFor = (r: CraftingRecipe) => choiceBySlug[r.slug] ?? ctx.defaultChoice(r);
  const batchFor = (r: CraftingRecipe) => {
    const stored = batchBySlug[r.slug];
    if (stored) return stored;
    const max = ctx.maxAffordableBatch(r, chosenFor(r));
    return (max || 1) as BatchSize;
  };

  const pick = (r: CraftingRecipe, groupIndex: number, comp: Record<string, number>) => {
    const group = r.inputs[groupIndex];
    if (!group) return;
    setChoiceBySlug((prev) => {
      const base = { ...(prev[r.slug] ?? ctx.defaultChoice(r)) };
      for (const s of group.anyOf) delete base[s];
      return { ...prev, [r.slug]: { ...base, ...comp } };
    });
  };

  const jump = (slug: string) => {
    document.getElementById(`recipe-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const readySlugs = new Set(ctx.readyNow.map((r) => r.slug));
  const locked = recipes.filter((r) => !r.isUnlocked);
  const rest = recipes.filter((r) => r.isUnlocked && !readySlugs.has(r.slug));

  return (
    <div className="w-full max-w-3xl mx-auto px-3 md:px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-headline text-base text-cream-surface font-bold uppercase">
            Workshop
          </h1>
          <span className="font-mono text-[10px] text-on-surface-variant italic">Botaki</span>
        </div>
        <div className="flex items-center gap-1 bg-wood-dark px-2.5 py-1.5 border-2 border-wood-border">
          <span className="font-mono text-[10px] text-on-surface-variant">slots</span>
          <span className="font-mono text-xs text-gold-currency font-bold">
            {freeSlots}/{slots}
          </span>
        </div>
      </div>

      {loading && (
        <p className="font-mono text-[10px] text-on-surface-variant mb-3">Loading the workshop...</p>
      )}

      {/* Active jobs — the slot timer is the thing a returning player looks for. */}
      <section className="mb-6">
        <SectionHeading en="On the Bench" tn="Tiro e e tswelelang" />
        {activeJobs.length === 0 ? (
          <Empty>Nothing crafting — the bench is clear.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {activeJobs.map((job) => {
              const recipe = recipes.find((r) => r.slug === job.recipeSlug);
              const remaining = new Date(job.readyAt).getTime() - now;
              const ready = remaining <= 0;
              return (
                <div
                  key={job.id}
                  className="flex items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-headline text-[15px] font-bold text-cream-surface truncate">
                      {recipe?.name ?? job.recipeSlug}
                    </div>
                    <div className="font-mono text-[10px] text-cream-surface/70">
                      ×{job.qty} · {ready ? 'Ready' : formatRemaining(remaining)}
                    </div>
                  </div>
                  <button
                    disabled={!ready || busy === job.id}
                    onClick={() => ctx.collect(job.id)}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase border-2 font-bold ${
                      ready
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-wood-border text-on-surface-variant opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {busy === job.id ? '...' : ready ? 'Collect' : formatRemaining(remaining)}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 03 §3.6 — lead with the question, not the catalogue. */}
      <section className="mb-6">
        <SectionHeading
          en="What can I make right now?"
          tn="Ke ka dira eng?"
          note={freeSlots <= 0 ? 'no free slot' : undefined}
        />
        {ctx.readyNow.length === 0 ? (
          <Empty>
            Nothing yet — gather materials, or free a slot by collecting a finished batch.
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {ctx.readyNow.map((r) => (
              <RecipeCard
                key={r.slug}
                recipe={r}
                ctx={ctx}
                busy={busy === r.slug}
                freeSlots={freeSlots}
                chosen={chosenFor(r)}
                batch={batchFor(r)}
                onBatch={(b) => setBatchBySlug((p) => ({ ...p, [r.slug]: b }))}
                onPick={(gi, comp) => pick(r, gi, comp)}
                onCraft={() => ctx.start(r.slug, batchFor(r), chosenFor(r))}
                onJump={jump}
                craftableOutputs={craftableOutputs}
              />
            ))}
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mb-6">
          <SectionHeading en="Everything else" tn="Tse dingwe" />
          <div className="flex flex-col gap-2">
            {rest.map((r) => (
              <RecipeCard
                key={r.slug}
                recipe={r}
                ctx={ctx}
                busy={busy === r.slug}
                freeSlots={freeSlots}
                chosen={chosenFor(r)}
                batch={batchFor(r)}
                onBatch={(b) => setBatchBySlug((p) => ({ ...p, [r.slug]: b }))}
                onPick={(gi, comp) => pick(r, gi, comp)}
                onCraft={() => ctx.start(r.slug, batchFor(r), chosenFor(r))}
                onJump={jump}
                craftableOutputs={craftableOutputs}
              />
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <SectionHeading en="Still to learn" tn="Tse di sa ithutiwang" />
          <div className="flex flex-col gap-1.5">
            {locked.map((r) => (
              <div
                key={r.slug}
                className="flex items-center justify-between border border-wood-border bg-wood-dark/60 px-3 py-2 opacity-60"
              >
                <span className="font-headline text-[13px] text-cream-surface">{r.name}</span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Botho {r.unlock?.bothoGte}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
