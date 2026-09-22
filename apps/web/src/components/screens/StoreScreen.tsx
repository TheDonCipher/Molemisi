'use client';

/**
 * The Co-op Store — the player-facing half of P9, which until now existed only
 * as API endpoints with no way to reach them.
 *
 * Everything priced here is the server's number. The screen never computes a
 * total, a bonus or a new balance: it disables the button when the wallet looks
 * short (a courtesy — the server still enforces) and re-reads the balance after
 * any spend.
 *
 * Real money is visually separated from Pula on purpose. A player must always be
 * able to tell "this costs Pula I earned" from "this costs thebe from my phone".
 */

import React from 'react';
import { useGame } from '../../lib/gameState';
import { useStore, type RealMoneyItem, type StoreItem } from '../../lib/store';

function SectionHeading({ en, tn }: { en: string; tn: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <h2 className="font-headline text-sm text-primary uppercase font-bold">{en}</h2>
      <span className="font-mono text-[10px] text-on-surface-variant italic">{tn}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-6 text-center font-body text-sm text-cream-surface/60">{children}</div>
  );
}

export function StoreScreen() {
  const { pula } = useGame();
  const { boosts, cosmetics, packs, plans, history, loading, busy, buy, startPayment } = useStore();

  const renderPulaRow = (item: StoreItem) => {
    const isBusy = busy === item.sku;
    const affordable = pula >= item.price;
    return (
      <div
        key={item.sku}
        className="flex items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-3"
      >
        <div className="flex-1 min-w-0">
          <div className="font-headline text-[15px] font-bold text-cream-surface truncate">
            {item.name}
          </div>
          <div className="font-mono text-[10px] text-cream-surface/70 line-clamp-2">
            {item.description}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-gold-currency font-bold">P{item.price}</span>
          <button
            disabled={isBusy || !affordable}
            onClick={() => buy(item.sku)}
            className="px-2.5 py-1 font-mono text-[10px] uppercase border-2 border-primary bg-primary-container text-on-primary-container font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isBusy ? '...' : 'Buy'}
          </button>
        </div>
      </div>
    );
  };

  const renderMoneyRow = (item: RealMoneyItem) => {
    const isBusy = busy === item.sku;
    return (
      <div
        key={item.sku}
        className="flex items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-3"
      >
        <div className="flex-1 min-w-0">
          <div className="font-headline text-[15px] font-bold text-cream-surface truncate">
            {item.name}
          </div>
          <div className="font-mono text-[10px] text-cream-surface/70 line-clamp-2">
            {item.description}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-mono text-xs font-bold ${
              item.currency === 'BWP'
                ? 'text-secondary'
                : 'text-gold-currency'
            }`}
          >
            {item.currency === 'BWP'
              ? `💸 BWP ${item.price.toLocaleString()}`
              : `P${item.price.toLocaleString()}`}
          </span>
          <button
            disabled={isBusy}
            onClick={() => startPayment(item.sku)}
            className="px-2.5 py-1 font-mono text-[10px] uppercase border-2 border-primary bg-primary-container text-on-primary-container font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isBusy ? '...' : 'Get'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 md:px-4 py-4 pb-24">
      {/* Header + balance */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-headline text-base text-cream-surface font-bold uppercase">
            Co-op Store
          </h1>
          <span className="font-mono text-[10px] text-on-surface-variant italic">Lebentlele</span>
        </div>
        <div className="flex items-center gap-1 bg-wood-dark px-2.5 py-1.5 border-2 border-wood-border">
          <span className="text-xs">💰</span>
          <span className="font-mono text-xs text-gold-currency font-bold">
            {pula.toLocaleString()}
          </span>
          <span className="font-mono text-[9px] text-on-surface-variant">Pula</span>
        </div>
      </div>

      {loading && (
        <p className="font-mono text-[10px] text-on-surface-variant mb-3">Loading the store...</p>
      )}

      {/* Real money */}
      <section className="mb-6">
        <SectionHeading en="Top Up" tn="Tlatlheletso" />
        <div className="flex flex-col gap-2">
          {packs.length === 0 ? <Empty>No packs available</Empty> : packs.map(renderMoneyRow)}
        </div>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1.5">
          Pula is credited once the payment is confirmed. Capped at P500 per day (Botswana time).
        </p>
      </section>

      <section className="mb-6">
        <SectionHeading en="Guild" tn="Mokgatlho" />
        <div className="flex flex-col gap-2">
          {plans.length === 0 ? (
            <Empty>No subscription available</Empty>
          ) : (
            plans.map(renderMoneyRow)
          )}
        </div>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1.5">
          Auto-collect, extra storage and a Pula Stone each week.
        </p>
      </section>

      {/* Pula sinks (F7) */}
      <section className="mb-6">
        <SectionHeading en="Boosts" tn="Nonotsho" />
        <div className="flex flex-col gap-2">
          {boosts.length === 0 ? <Empty>No boosts available</Empty> : boosts.map(renderPulaRow)}
        </div>
      </section>

      <section className="mb-6">
        <SectionHeading en="Cosmetics" tn="Mokgabiso" />
        <div className="flex flex-col gap-2">
          {cosmetics.length === 0 ? (
            <Empty>Nothing to decorate with yet</Empty>
          ) : (
            cosmetics.map(renderPulaRow)
          )}
        </div>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1.5">
          Cosmetics are yours for good — buying one twice costs nothing.
        </p>
      </section>

      {/* History */}
      <section>
        <SectionHeading en="Recent Payments" tn="Duelo" />
        {history.length === 0 ? (
          <Empty>No payments yet</Empty>
        ) : (
          <div className="flex flex-col gap-1.5">
            {history.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border border-wood-border bg-wood-dark/60 px-3 py-2"
              >
                <span className="font-mono text-[10px] text-cream-surface truncate">{p.sku}</span>
                <span className="font-mono text-[10px] text-on-surface-variant shrink-0">
                  P{p.amount} · {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
