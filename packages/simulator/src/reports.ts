/**
 * Report aggregation. Reads ONLY `raw_events.jsonl` plus (for the economy
 * section) the run's own configuration — never a second source of truth.
 *
 * Every report prints its cohort, population mix and real-date span in its
 * header, so no figure can be read as covering more than the run actually did.
 */

import {
  COOP_TAX_RATE,
  PRICE_BAND,
  CRAFTED_BAND,
  BONUS_YIELD_CHANCE,
  PRIZE,
  BOTHO_THRESHOLDS,
  KGOTLA_DAILY_CHARGE_POOL,
  MOPHANE_MONTHS,
} from '@molemisi/game-config';
import { monthsCrossed, mophaneWindowsCrossed } from './time';
import type { CheckResult, RunConfig, SimEvent, System } from './types';

export interface ReportSection {
  title: string;
  lines: string[];
}

export interface RunMeta {
  cohort: RunConfig['cohort'];
  players: number;
  days: number;
  profileCounts: Record<string, number>;
  payerShare: number;
  realDates: string[];
  seed: number;
  anchor: string;
  /**
   * How the population was created. `admin` means service-role provisioning was
   * needed because the project rate-limits signup emails — the report must say so
   * rather than implying the register endpoint was exercised.
   */
  provisioning?: { register: number; admin: number };
}

/* ------------------------------------------------------------------ helpers */

function of(events: readonly SimEvent[], system: System): SimEvent[] {
  return events.filter((e) => e.system === system);
}

function succeeded(events: readonly SimEvent[], action?: string): SimEvent[] {
  return events.filter((e) => e.result === 'success' && (action === undefined || e.action === action));
}

function rate(ok: number, total: number): string {
  if (total === 0) return 'n/a';
  return `${((ok / total) * 100).toFixed(1)}%`;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = 'unknown'): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function countBy(events: readonly SimEvent[], key: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) {
    const k = str(e.metadata[key]);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Section heading only.
 *
 * This used to repeat the cohort/players/payers block above every section, which
 * rendered as the same two lines twelve times in a composed summary and read like
 * a bug. Run-level context now appears once, in `composeSummary`'s head.
 */
function header(_meta: RunMeta, title: string): string[] {
  return [`### ${title}`, ''];
}

/* ------------------------------------------------------------------ reports */

export function reportFarming(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const farm = of(events, 'farming');
  const planted = succeeded(farm, 'plant');
  const harvested = succeeded(farm, 'harvest');
  const byCrop = countBy(planted, 'crop');
  const distinctMonths = new Set(planted.map((e) => String(e.metadata['month']))).size;

  const lines = [
    `- Plant attempts **${planted.length}**, successful **${planted.length}**; harvests **${harvested.length}**.`,
    `- Harvest-to-plant ratio **${rate(harvested.length, planted.length)}**.`,
    `- Distinct crops planted **${byCrop.size}** across **${distinctMonths}** distinct real months.`,
    `- Seed calendar rotation: **${distinctMonths > 1 ? 'exercised' : 'NOT exercised — the run never changed chapter'}**.`,
  ];
  if (byCrop.size > 0) {
    lines.push('- Plantings by crop: ' + [...byCrop.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(', '));
  }
  return { title: 'Farming', lines: [...header(meta, 'Farming'), ...lines, ''] };
}

export function reportWater(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const water = of(events, 'water');
  const refills = succeeded(water, 'refill');
  const skipped = succeeded(water, 'skip-refill');
  const spent = refills.reduce((s, e) => s + num(e.metadata['costPula']), 0);
  const gross = succeeded(of(events, 'market'), 'sell').reduce((s, e) => s + num(e.metadata['gross']), 0);

  const lines = [
    `- Refills **${refills.length}**; deliberate dry-outs **${skipped.length}**.`,
    `- Pula spent on water **P${spent.toFixed(2)}**; gross market income **P${gross.toFixed(2)}**.`,
    `- Water as a share of gross income **${gross > 0 ? ((spent / gross) * 100).toFixed(1) : 'n/a'}%**.`,
  ];
  if (refills.length === 0 && skipped.length === 0) {
    lines.push('- **WARNING: the run never touched water.** Tank level was never a decision; every yield figure above is optimistic.');
  }
  return { title: 'Water', lines: [...header(meta, 'Water'), ...lines, ''] };
}

export function reportLandAndBuildings(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const land = of(events, 'land');
  const buys = succeeded(land, 'purchase-plot');
  const spent = buys.reduce((s, e) => s + num(e.metadata['cost']), 0);
  const buildings = of(events, 'building');
  return {
    title: 'Land & Buildings',
    lines: [
      ...header(meta, 'Land & Buildings'),
      `- Plot purchases **${buys.length}**, total **P${spent.toFixed(2)}**.`,
      `- Building actions recorded **${buildings.length}** (maintenance is a 90-day material sink).`,
      `- Sink contribution: land **P${spent.toFixed(2)}**.`,
      '',
    ],
  };
}

export function reportLivestock(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const live = of(events, 'livestock');
  const collected = succeeded(live, 'collect');
  const purchased = succeeded(live, 'purchase');
  const byType = countBy(collected, 'type');
  return {
    title: 'Livestock',
    lines: [
      ...header(meta, 'Livestock'),
      `- Animals purchased **${purchased.length}**; collections **${collected.length}**.`,
      byType.size > 0
        ? `- Collections by type: ${[...byType.entries()].map(([k, v]) => `${k}=${v}`).join(', ')}`
        : '- **No livestock activity** — the kraal branch of the economy was never exercised.',
      '',
    ],
  };
}

export function reportCrafting(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const craft = of(events, 'crafting');
  const started = succeeded(craft, 'start');
  const collected = succeeded(craft, 'collect');
  const byRecipe = countBy(started, 'recipe');
  const byBatch = countBy(started, 'qty');

  return {
    title: 'Crafting',
    lines: [
      ...header(meta, 'Crafting'),
      `- Jobs started **${started.length}**, collected **${collected.length}**.`,
      `- By recipe: ${[...byRecipe.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
      `- Batch sizes used: ${[...byBatch.entries()].map(([k, v]) => `x${k}=${v}`).join(', ') || 'none'}`,
      `- Slots are the binding constraint (timers are 2–6 h): compare starts/day against **3** max slots per player.`,
      `- Realized margins must be compared against \`recipeEconomics()\`, not a copied table. Bonus-yield target **${(BONUS_YIELD_CHANCE * 100).toFixed(0)}%**.`,
      `- Crafted goods sell at **${CRAFTED_BAND.min}–${CRAFTED_BAND.max}x**, exempt from the ${PRICE_BAND.min}–${PRICE_BAND.max}x raw band.`,
      '',
    ],
  };
}

export function reportStorage(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const st = of(events, 'storage');
  const upgrades = succeeded(st, 'upgrade');
  const nearCap = st.filter((e) => e.action === 'upgrade').length;
  return {
    title: 'Storage',
    lines: [
      ...header(meta, 'Storage'),
      `- Upgrade attempts **${nearCap}**, succeeded **${upgrades.length}**.`,
      `- Two independent caps apply: slots (24/48/96, Guild x1.5) and listing slots (5/10/20).`,
      '',
    ],
  };
}

export function reportBushveld(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const bush = of(events, 'bushveld');
  const collected = succeeded(bush, 'collect');
  const byScene = countBy(collected, 'scene');

  // Rarity is meaningless unless conditioned on Kagiso at collection time.
  const byKagisoRarity = new Map<string, number>();
  for (const e of collected) {
    const kagiso = num(e.metadata['kagiso']);
    const band = kagiso >= 5 ? 'high (>=5)' : kagiso >= 3 ? 'mid (3-4)' : 'low (1-2)';
    const key = `${band} / ${str(e.metadata['rarity'])}`;
    byKagisoRarity.set(key, (byKagisoRarity.get(key) ?? 0) + 1);
  }

  const crossed = mophaneWindowsCrossed(meta.realDates);
  const phaneFinds = collected.filter((e) => str(e.metadata['item']) === 'phane').length;

  const lines = [
    `- Collections **${collected.length}**; by scene: ${[...byScene.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
    '- Rarity conditioned on Kagiso at collection time:',
  ];
  if (byKagisoRarity.size === 0) {
    lines.push('  - no collections recorded');
  } else {
    for (const [k, v] of [...byKagisoRarity.entries()].sort()) lines.push(`  - ${k}: ${v}`);
  }
  lines.push(
    `- Mophane windows (real months ${MOPHANE_MONTHS.join(', ')}): crossed **${crossed.length > 0 ? crossed.join(', ') : 'NONE'}**; phane collected **${phaneFinds}**.`,
  );
  const quiet = ['open_bush', 'riverbank', 'rocky_outcrop'].filter((s) => (byScene.get(s) ?? 0) === 0);
  if (quiet.length > 0) lines.push(`- **FLAG: near-zero activity in ${quiet.join(', ')}**`);
  if (crossed.length === 0) {
    lines.push(
      `- **This run never crossed a Mophane window.** A clean Bushveld report here is a false negative, not a pass.`,
    );
  }
  return { title: 'Bushveld', lines: [...header(meta, 'Bushveld'), ...lines, ''] };
}

export function reportKgotla(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const kg = of(events, 'kgotla');
  const accepted = succeeded(kg, 'accept');
  const turnedIn = succeeded(kg, 'turn-in');
  const rejectedAccepts = kg.filter((e) => e.action === 'accept' && e.result !== 'success').length;
  const donations = succeeded(kg, 'donate');
  const letsema = succeeded(kg, 'letsema');
  const donated = donations.reduce((s, e) => s + num(e.metadata['amount']), 0);

  return {
    title: 'Kgotla',
    lines: [
      ...header(meta, 'Kgotla'),
      `- Charges accepted **${accepted.length}**, turned in **${turnedIn.length}**, accepts rejected **${rejectedAccepts}** (pool is ${KGOTLA_DAILY_CHARGE_POOL}/farm/Botswana day).`,
      `- Objectives by type: ${[...countBy(turnedIn, 'type').entries()].map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
      `- Contributions **${donations.length}** totalling **P${donated.toFixed(2)}**; Letsema uses **${letsema.length}**.`,
      `- Gates: Bupi ${BOTHO_THRESHOLDS.BUPI_RECIPE} · Deep Bushveld ${BOTHO_THRESHOLDS.DEEP_BUSHVELD} · Letsema ${BOTHO_THRESHOLDS.LETSEMA} · Prize ${BOTHO_THRESHOLDS.PRIZE_ELIGIBILITY}.`,
      `- Regard decay is -2 per elder per 7 idle days, floored at 0; it is applied lazily and idempotently.`,
      '',
    ],
  };
}

export function reportMarket(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const mk = of(events, 'market');
  const sells = succeeded(mk, 'sell');
  const buys = succeeded(mk, 'buy');
  const volume = sells.reduce((s, e) => s + num(e.metadata['quantity']), 0);
  const gross = sells.reduce((s, e) => s + num(e.metadata['gross']), 0);
  const tax = sells.reduce((s, e) => s + num(e.metadata['tax']), 0);

  // Realized price dispersion per item — the emergent market-impact check.
  const prices = new Map<string, number[]>();
  for (const e of sells) {
    const item = str(e.metadata['item']);
    const unit = num(e.metadata['unitPrice']);
    if (unit > 0) {
      const list = prices.get(item) ?? [];
      list.push(unit);
      prices.set(item, list);
    }
  }

  const lines = [
    ...header(meta, 'Market'),
    `- Sells **${sells.length}**, buys **${buys.length}**, units sold **${volume}**.`,
    `- Gross **P${gross.toFixed(2)}**, Co-op tax collected **P${tax.toFixed(2)}** (rate ${(COOP_TAX_RATE * 100).toFixed(0)}%).`,
    '- Realized unit price per item (min–max):',
  ];
  if (prices.size === 0) {
    lines.push('  - no priced sales recorded');
  } else {
    for (const [item, list] of [...prices.entries()].sort()) {
      const min = Math.min(...list);
      const max = Math.max(...list);
      const spread = min > 0 ? ((max - min) / min) * 100 : 0;
      const flagged = spread > 25 ? ' **FLAG: wide dispersion — simulated volume moved this price**' : '';
      lines.push(`  - ${item}: P${min.toFixed(2)}–P${max.toFixed(2)} (spread ${spread.toFixed(1)}%)${flagged}`);
    }
  }
  const seedSells = sells.filter((e) => str(e.metadata['item']).endsWith('_seed')).length;
  lines.push(`- Seeds sold **${seedSells}** (must be 0 — 26 §11.1 says seeds never sell).`);
  return { title: 'Market', lines: [...lines, ''] };
}

export function reportEconomy(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const ec = of(events, 'economy');
  const topUps = succeeded(ec, 'top-up');
  const cosmetics = succeeded(ec, 'cosmetic-purchase');
  const boostListed = ec.filter((e) => e.action === 'boost-availability');

  const waterSpend = succeeded(of(events, 'water'), 'refill').reduce((s, e) => s + num(e.metadata['costPula']), 0);
  const landSpend = succeeded(of(events, 'land'), 'purchase-plot').reduce((s, e) => s + num(e.metadata['cost']), 0);
  const taxPaid = succeeded(of(events, 'market'), 'sell').reduce((s, e) => s + num(e.metadata['tax']), 0);
  const donated = succeeded(of(events, 'kgotla'), 'donate').reduce((s, e) => s + num(e.metadata['amount']), 0);
  const gross = succeeded(of(events, 'market'), 'sell').reduce((s, e) => s + num(e.metadata['gross']), 0);

  const payers = Math.max(1, Math.round(meta.payerShare * meta.players));
  // Revenue is not modelled here: realized spend is read from the ledger in a
  // full run. What this section MUST state plainly is the segmentation used.
  const lines = [
    ...header(meta, 'Economy'),
    `- Faucets: gross market income **P${gross.toFixed(2)}**.`,
    `- Sinks: water **P${waterSpend.toFixed(2)}** · land **P${landSpend.toFixed(2)}** · co-op tax **P${taxPaid.toFixed(2)}** · Letsema/community **P${donated.toFixed(2)}** · cosmetics **${cosmetics.length} purchases**.`,
    `- Real-money events: top-ups **${topUps.length}**, cosmetic purchases **${cosmetics.length}**.`,
    `- Segmentation used: payers **${payers}** of **${meta.players}** = **${(meta.payerShare * 100).toFixed(2)}%**.`,
    `- Targets for comparison: blended ARPU **P2.27**, ARPPU **P75.80** (docs/MVP/02 §6).`,
    `- Prize formula: clamp(${PRIZE.revenueShare * 100}% of trailing-month Guild revenue, floor P${PRIZE.floorPula}, ceiling P${PRIZE.ceilingPula}), split ${PRIZE.split.join(':')}, top ${PRIZE.topN}, min Botho in period ${PRIZE.minimumBothoInPeriod}.`,
    `- Boost availability checks run **${boostListed.length}** (expected: listed = 0).`,
    '',
  ];
  return { title: 'Economy', lines: [...lines.slice(0, 1), ...lines.slice(1)] };
}

export function reportProgression(events: readonly SimEvent[], meta: RunMeta): ReportSection {
  const pr = of(events, 'progression');
  const accepted = succeeded(pr, 'contract-accept');
  const completed = succeeded(pr, 'contract-complete');
  const claimed = succeeded(pr, 'chapter-claim');
  const tips = countBy(succeeded(pr, 'elder-guidance'), 'tip');
  return {
    title: 'Progression',
    lines: [
      ...header(meta, 'Progression'),
      `- Contracts accepted **${accepted.length}**, completed **${completed.length}** (${rate(completed.length, accepted.length)}).`,
      `- Chapter claims **${claimed.length}**.`,
      `- Elder's Guidance rules fired: ${[...tips.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
      `- Real months crossed **${monthsCrossed(meta.realDates).join(', ') || 'none'}**.`,
      '',
    ],
  };
}

export function reportSafeguards(checks: readonly CheckResult[], meta: RunMeta): ReportSection {
  const lines = [...header(meta, 'Safeguards')];
  for (const group of ['security', 'anticheat', 'deferred', 'gap'] as const) {
    const inGroup = checks.filter((c) => c.group === group);
    if (inGroup.length === 0) continue;
    lines.push(`#### ${group}`, '', '| ID | Check | Result | Detail |', '|---|---|---|---|');
    for (const c of inGroup) {
      const mark = c.group === 'gap' ? 'GAP' : c.passed ? 'PASS' : 'FAIL';
      lines.push(`| ${c.id} | ${c.name} | **${mark}** | ${escapeCell(c.detail)} |`);
    }
    lines.push('');
  }
  const failed = checks.filter((c) => c.group !== 'gap' && !c.passed);
  lines.push(
    `- **${failed.length}** failing check(s) outside the known-gap group.`,
    `- Gaps are reported, not passed: ${checks.filter((c) => c.group === 'gap').map((c) => c.id).join(', ') || 'none'}.`,
    '',
  );
  return { title: 'Safeguards', lines };
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Compose every section into `summary.md`. */
export function composeSummary(
  meta: RunMeta,
  events: readonly SimEvent[],
  checks: readonly CheckResult[],
): string {
  const sections: ReportSection[] = [
    reportFarming(events, meta),
    reportWater(events, meta),
    reportLandAndBuildings(events, meta),
    reportLivestock(events, meta),
    reportCrafting(events, meta),
    reportStorage(events, meta),
    reportBushveld(events, meta),
    reportKgotla(events, meta),
    reportMarket(events, meta),
    reportEconomy(events, meta),
    reportProgression(events, meta),
    reportSafeguards(checks, meta),
  ];

  const total = events.length;
  const byResult = new Map<string, number>();
  for (const e of events) byResult.set(e.result, (byResult.get(e.result) ?? 0) + 1);

  const head = [
    '# Molemisi simulator — run summary',
    '',
    `Generated ${new Date().toISOString()}`,
    '',
    `**Cohort:** ${meta.cohort} · **Population:** ${meta.players} · **Days:** ${meta.days} ·`,
    `**Anchor:** ${meta.anchor} · **Seed:** ${meta.seed}`,
    '',
    `Real-date span **${meta.realDates[0] ?? 'n/a'} → ${meta.realDates[meta.realDates.length - 1] ?? 'n/a'}** · ` +
      `payers **${(meta.payerShare * 100).toFixed(2)}%** · mix ${JSON.stringify(meta.profileCounts)}`,
    '',
    `Events: **${total}** (${[...byResult.entries()].map(([k, v]) => `${k}=${v}`).join(', ')})`,
    '',
  ];

  if (meta.provisioning && meta.provisioning.admin > 0) {
    head.push(
      `> **FIDELITY WARNING.** ${meta.provisioning.admin} of ${meta.provisioning.register + meta.provisioning.admin} ` +
        'accounts were created by service-role provisioning, not `/auth/register` — the ' +
        'project rate-limits signup emails. Account creation is NOT exercised by this ' +
        'run. Every gameplay interaction still went through the real API.',
      '',
    );
  }

  head.push('---', '');

  return [...head, ...sections.flatMap((s) => s.lines)].join('\n');
}

export { mean };
