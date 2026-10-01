'use client';

/**
 * CurrencyGuide — a beginner-legible reference for Molemisi's economies.
 *
 * The header only shows Pula; the Wallet only lists Pula + Botho. A new player
 * has no surface that explains *what* each currency is, how it is earned, and
 * how it is spent — and no surface that says Kagiso is a Bushveld meter, not
 * money. This component is the single source for that explanation, rendered two
 * ways:
 *
 *   <CurrencyGuideSection />  — inline reference (used by the Wallet screen)
 *   <CurrencyGuideModal />    — same cards inside a dismissable modal
 *                               (opened by the "?" button in the header)
 *
 * Facts are drawn from the model DECIDED on 2026-10-01 (docs/33 §2, built in
 * docs/34): Pula is earned-only and never sold, Madi is the spend-only premium
 * currency bought with mobile money, Botho is capped standing, and the seasonal
 * currency is a Season Stamp that buys keepsakes. Setswana copy mirrors phrasing
 * already validated in translations.ts; the longer prose should still get a
 * native-speaker pass.
 */

import React from 'react';
import { useTranslation } from '../lib/useTranslation';

type Bilingual = { en: string; tn: string };
type Tone = 'earned' | 'money' | 'seasonal' | 'standing';

interface CurrencyInfo {
  id: string;
  icon: string;
  symbol: string;
  name: Bilingual;
  kind: Bilingual;
  tone: Tone;
  what: Bilingual;
  earn: Bilingual[];
  /** Right-hand column. For Botho this is "Unlocks", not "Spend". */
  spendLabel: Bilingual;
  spend: Bilingual[];
  note?: Bilingual;
}

const CURRENCIES: CurrencyInfo[] = [
  {
    id: 'pula',
    icon: '💰',
    symbol: 'P',
    name: { en: 'Pula', tn: 'Pula' },
    kind: { en: 'Earned by playing', tn: 'E fenngwa ke go bapala' },
    tone: 'earned',
    what: {
      en: 'The soft in-game currency. You earn it by playing — it can never be turned back into real money.',
      tn: 'Tšhelete e bonalang ya papadi. O e fenngwa ka go bapala — ga e kgutlele tšheleteng ya nnete.',
    },
    earn: [
      { en: 'Sell harvest and animal products at the Market', tn: 'Radisa kotulo le dipeo tša phoofolo Ditshopong' },
      { en: 'Complete Kgotla quests and council charges', tn: 'Fetša dithata tša Kgotla le ditiro tša lekgotla' },
      { en: 'Daily rewards and chapter milestones', tn: 'Mputso ya letšatši le dintlha tša kgaolo' },
    ],
    spendLabel: { en: 'Spend', tn: 'Senngwa' },
    spend: [
      { en: 'Buy seeds, tools and stock at the Market', tn: 'Reka merolwana, didirisiwa le thepa Ditshopong' },
      { en: 'Fill the Jojo tank and pump the well', tn: 'Tlatša Jojo gane o hudiše lentswe' },
      { en: 'Pay crafting fees and build blueprints', tn: 'Leka tuelo ya botaki le go aga dintlha' },
      { en: 'Expand your land and build on your farm', tn: 'Atolosa tshimo ea hao o aga mo tshimong' },
      { en: 'Market decorations — the everyday line', tn: 'Dimonotsho tša Ditshopong — mo o mmoleng wa letšatši' },
    ],
    note: {
      en: 'Earned only — we never sell it. Cannot be withdrawn.',
      tn: 'E fenngwa ka papadi — re e rekisa ka morago. Ga e tsoe.',
    },
  },
  {
    id: 'botho',
    icon: '🤝',
    symbol: 'B',
    name: { en: 'Botho', tn: 'Botho' },
    kind: { en: 'Standing', tn: 'Boemo' },
    tone: 'standing',
    what: {
      en: 'Community standing, not a wallet balance. It measures how much the village trusts you and unlocks deeper content.',
      tn: 'Boemo ba setšhaba, eseng bokgobapuku. Bo lekanya boitshepo gape bo bula diteng tše di fa tšebeletseng.',
    },
    earn: [
      { en: 'Deliver Kgotla quests by hand', tn: 'Isa dithata tša Kgotla ka seatla' },
      { en: 'Contribute Pula to community projects', tn: 'Neela Pula diprojekeng tša setšhaba' },
      { en: 'Capped at 50 Botho per day', tn: 'Molao: Botho 50 ka letšatši' },
    ],
    spendLabel: { en: 'Unlocks', tn: 'E bula' },
    spend: [
      { en: 'Baking recipes (Botho 100)', tn: 'Didirišwa tša botaki (Botho 100)' },
      { en: 'Auto-Feeder for your kraal (Botho 300)', tn: 'Moima o tima kraal (Botho 300)' },
      { en: 'Deep Bushveld (Botho 300)', tn: 'Bushveld e Botelele (Botho 300)' },
      { en: 'Letsema one-tap harvest (Botho 500)', tn: 'Kotulo ya Letsema (Botho 500)' },
      { en: 'Auto-Helper waters and harvests (Botho 500)', tn: 'Mpho yo thusa o hlaše o kotola (Botho 500)' },
      { en: 'Prize eligibility (Botho 1000)', tn: 'Go tšhepa mputso (Botho 1000)' },
    ],
    note: {
      en: 'Never spent, bought or withdrawn - it only grows and opens doors. Capped at 50 a day.',
      tn: 'Ga e senngwe, ga e rekiwe, ga e tsoe - e gola feela gane e bula mamati. Molao: 50 ka letsatsi.',
    },
  },
  {
    id: 'madi',
    icon: '📱',
    symbol: 'M',
    name: { en: 'Madi', tn: 'Madi' },
    kind: { en: 'Bought with money', tn: 'E rekilwe ka tšhelete' },
    tone: 'money',
    what: {
      en: 'What your phone buys: 1 Madi = BWP 1.00. You can only spend it on looking good and on the Village Pass. It cannot become Pula, so spending real money never makes you a better farmer.',
      tn: 'Tšhelete eo o mogala o e rekang: 1 Madi = BWP 1.00. O ka e senngeng fetseng go nna le ntle le go khetha Village Pass. Ga e etlolwe go Pula, ka gonne go rekile go tšhelete ga o o se ke o dira mošoši yo mogala.',
    },
    earn: [
      { en: 'Top up with mobile money (Orange Money, MyZaka, Smega)', tn: 'Tlatša ka tšhelete ya mogala (Orange Money, MyZaka, Smega)' },
      { en: 'Packs from P5 up to P250, capped at P500 a day', tn: 'Diphutho tša P5 go fittha P250, molao P500 ka letšatši' },
    ],
    spendLabel: { en: 'Spend', tn: 'Senngwa' },
    spend: [
      { en: 'Festival decorations - the seasonal look', tn: 'Dimonotsho tša kerafe - ntlha ya nakong' },
      { en: 'The Village Pass (M50 a month)', tn: 'Village Pass (M50 ka kgwale)' },
    ],
    note: {
      en: 'Spend-only. Never converts to Pula, never withdrawn, never traded.',
      tn: 'Senngwa fela. Ga e fetolwe go Pula, ga e tsoe, ga e rekisana.',
    },
  },
  {
    id: 'chapter',
    icon: '✦',
    symbol: '✦',
    name: { en: 'Season Stamp', tn: 'Sekilafatso sa Nako' },
    kind: { en: 'Seasonal', tn: 'Nakong' },
    tone: 'seasonal',
    what: {
      en: 'A mark of the season you were here for. Earned by climbing the chapter track; it resets to zero when the chapter ends.',
      tn: 'Tšhelete ya Almanac ya nakong. E fenngwa ka go gola kgaolo; e fela go ya go lekana ge kgaolo e fela.',
    },
    earn: [
      { en: 'Almanac milestones: quests, forages, harvests, community work', tn: 'Dintlha tša Almanac: dithata, go fula, dikotulo, ditiro tša setšhaba' },
      { en: 'Kgotla contracts and Almanac discoveries', tn: 'Ditangalo tša Kgotla le dithuti tša Almanac' },
    ],
    spendLabel: { en: 'Spend', tn: 'Senngwa' },
    spend: [
      { en: 'Claim Almanac chapter rewards before they expire', tn: 'Amogela mputso wa Almanac pele o fela' },
      { en: 'Season souvenirs - the things you keep', tn: 'Ditlhabologelo tša nako - dintho tseo o bolokang' },
    ],
    note: {
      en: 'It buys keepsakes, never power. Never seeds, water, land or Pula.',
      tn: 'E fela go lekana ge kgaolo e fela — e sebelise pele nako e fetoga.',
    },
  },
];

const KAGISO_NOTE: Bilingual = {
  en: 'Kagiso is not a currency. In the Bushveld it is a peace meter (up to 6 pips) that refills over time and is spent to gather at hotspots. You can never buy it.',
  tn: 'Kagiso ga se tšhelete. Mo Bushveld ke tekanyo ya kgotso (go fihla go dipipi tše 6) e tlalago ka nako gane e sebeliswa go kutela mo metseng. Ga o ka e reka.',
};

const LABELS = {
  whatIsIt: { en: 'What it is', tn: 'Ke eng' },
  earn: { en: 'Earn', tn: 'Fenngwa' },
  guideTitle: { en: 'Currencies of Molemisi', tn: 'Ditshelete tša Molemisi' },
  guideIntro: {
    en: 'Four ways the village keeps score — and one meter that is not money at all.',
    tn: 'Ditsela tše nne tša motse go boloka nomoro — le tekanyo e le nngwe e sego tšhelete.',
  },
  notCurrency: { en: 'Not a currency', tn: 'Ga se tšhelete' },
};

const TONE_CLASS: Record<Tone, string> = {
  earned: 'bg-status-success/15 text-status-success border-status-success/40',
  money: 'bg-secondary/15 text-secondary border-secondary/40',
  seasonal: 'bg-primary-container/20 text-primary-container border-primary-container/40',
  standing: 'bg-cream-surface/10 text-cream-surface border-wood-border',
};

function pick(b: Bilingual, lang: 'en' | 'tn'): string {
  return b[lang] || b.en;
}

function CurrencyCard({ c, lang }: { c: CurrencyInfo; lang: 'en' | 'tn' }) {
  return (
    <div className="bg-wood-dark border border-wood-border p-3.5">
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-xl leading-none">{c.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-headline text-sm text-cream-surface font-bold truncate">
              {pick(c.name, lang)}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant border border-wood-border px-1.5 py-0.5 shrink-0">
              {c.symbol}
            </span>
          </div>
        </div>
        <span
          className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border shrink-0 ${TONE_CLASS[c.tone]}`}
        >
          {pick(c.kind, lang)}
        </span>
      </div>

      {/* What it is */}
      <p className="font-body text-[11px] text-cream-surface/80 leading-snug mb-3">
        <span className="font-mono text-[9px] uppercase text-on-surface-variant mr-1">
          {pick(LABELS.whatIsIt, lang)}
        </span>
        {pick(c.what, lang)}
      </p>

      {/* Earn / Spend(Unlocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase text-status-success mb-1.5">
            {pick(LABELS.earn, lang)}
          </p>
          <ul className="space-y-1">
            {c.earn.map((e, i) => (
              <li
                key={i}
                className="font-body text-[11px] text-cream-surface/80 leading-snug flex gap-1.5"
              >
                <span className="text-status-success shrink-0">+</span>
                <span>{pick(e, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase text-primary mb-1.5">
            {pick(c.spendLabel, lang)}
          </p>
          <ul className="space-y-1">
            {c.spend.map((s, i) => (
              <li
                key={i}
                className="font-body text-[11px] text-cream-surface/80 leading-snug flex gap-1.5"
              >
                <span className="text-primary shrink-0">−</span>
                <span>{pick(s, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {c.note && (
        <p className="font-mono text-[9px] text-on-surface-variant mt-3 pt-2 border-t border-wood-border/60">
          {pick(c.note, lang)}
        </p>
      )}
    </div>
  );
}

function KagisoCallout({ lang }: { lang: 'en' | 'tn' }) {
  return (
    <div className="bg-surface-container-lowest border border-wood-border p-3.5 flex gap-2.5">
      <span className="text-xl leading-none shrink-0">🕊️</span>
      <div>
        <p className="font-mono text-[9px] uppercase text-on-surface-variant mb-1">
          {pick(LABELS.notCurrency, lang)}
        </p>
        <p className="font-body text-[11px] text-cream-surface/80 leading-snug">
          {pick(KAGISO_NOTE, lang)}
        </p>
      </div>
    </div>
  );
}

/** Inline reference — dropped into the Wallet screen below the balances. */
export function CurrencyGuideSection() {
  const { language } = useTranslation();
  const lang = (language === 'tn' ? 'tn' : 'en') as 'en' | 'tn';
  return (
    <section className="mb-6">
      <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-1 font-bold">
        {pick(LABELS.guideTitle, lang)}
      </h2>
      <p className="font-body text-[10px] text-on-surface-variant/80 mb-3">
        {pick(LABELS.guideIntro, lang)}
      </p>
      <div className="space-y-3">
        {CURRENCIES.map((c) => (
          <CurrencyCard key={c.id} c={c} lang={lang} />
        ))}
        <KagisoCallout lang={lang} />
      </div>
    </section>
  );
}

/** Modal — opened by the "?" button in the header. */
export function CurrencyGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { language } = useTranslation();
  const lang = (language === 'tn' ? 'tn' : 'en') as 'en' | 'tn';
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 cursor-default"
      />
      <div className="relative w-full md:max-w-lg max-h-[90vh] md:max-h-[84vh] overflow-y-auto bg-wood-medium border-2 border-wood-border rounded-t-2xl md:rounded-2xl animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-wood-medium border-b-2 border-wood-border px-4 py-3">
          <div>
            <h2 className="font-headline text-sm text-primary uppercase font-bold">
              {pick(LABELS.guideTitle, lang)}
            </h2>
            <p className="font-body text-[10px] text-on-surface-variant/80">
              {pick(LABELS.guideIntro, lang)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 bg-wood-dark border border-wood-border flex items-center justify-center text-sm hover:border-primary/50 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          {CURRENCIES.map((c) => (
            <CurrencyCard key={c.id} c={c} lang={lang} />
          ))}
          <KagisoCallout lang={lang} />
        </div>
      </div>
    </div>
  );
}
