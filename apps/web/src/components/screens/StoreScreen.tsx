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
import { AVATAR_BASES, getGoodsByCategory } from '@molemisi/game-config';
import { useGame } from '../../lib/gameState';
import { useStore, type RealMoneyItem, type StoreItem } from '../../lib/store';
import { useAvatar } from '../../lib/avatar';
import { AvatarSprite } from '../AvatarSprite';

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

/**
 * The avatar — layer 1 (base) and layer 2 (outfit) (08 §10 / D10).
 *
 * The base is offered only while it is UNCHOSEN: the server refuses a second
 * choice, so showing the picker after that would advertise a button that cannot
 * work. The hat is not offered at all — it is not a cosmetic and is not a SKU.
 */
function AvatarSection() {
  const { avatar, busy, create, equip } = useAvatar();

  if (!avatar) {
    return (
      <section className="mb-6">
        <SectionHeading en="Your Farmer" tn="Molemi wa gago" />
        <Empty>Loading your avatar...</Empty>
      </section>
    );
  }

  // ---- creation: choose the base once -----------------------------------
  if (!avatar.created) {
    return (
      <section className="mb-6">
        <SectionHeading en="Choose Your Look" tn="Tswetsa ditshwanetso" />
        <p className="font-mono text-[9px] text-on-surface-variant/70 mb-2">
          Chosen once, and yours for good. You always wear the Farmer&apos;s Hat.
        </p>
        <div className="flex flex-col gap-2">
          {AVATAR_BASES.map((b) => (
            <button
              key={b.key}
              onClick={() => create(b.key)}
              disabled={busy}
              className="flex items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-2.5 text-left disabled:opacity-40"
            >
              <AvatarSprite baseSprite={`/assets/${b.sprite}`} name={b.setswana} size={30} />
              <span className="min-w-0">
                <span className="font-headline text-[14px] font-bold text-cream-surface block">
                  {b.setswana}
                </span>
                <span className="font-mono text-[10px] text-cream-surface/70">{b.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ---- the wardrobe: the outfit layer is the only swappable one -----------
  const outfits = getGoodsByCategory('cosmetic').filter(
    (g) => g.slot === 'outfit' && avatar.ownedOutfits.includes((g.entitlement as { cosmeticId: string }).cosmeticId),
  );

  return (
    <section className="mb-6">
      <SectionHeading en="Your Farmer" tn="Molemi wa gago" />
      <div className="flex items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-3 mb-2">
        <AvatarSprite
          baseSprite={`/assets/${avatar.base.sprite}`}
          outfitKey={avatar.outfitKey}
          name={avatar.base.setswana}
          size={40}
        />
        <div className="min-w-0">
          <div className="font-headline text-[15px] font-bold text-cream-surface">
            {avatar.base.setswana}
          </div>
          <div className="font-mono text-[10px] text-on-surface-variant">
            {avatar.outfitKey
              ? `Wearing: ${avatar.outfitKey}`
              : 'No outfit yet — the base and the hat are always worn.'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => equip(null)}
          disabled={busy || avatar.outfitKey === null}
          className="px-2.5 py-2 text-left border-2 border-wood-border bg-surface-container-high/30 font-mono text-[10px] uppercase text-cream-surface disabled:opacity-40"
        >
          None
        </button>
        {outfits.map((g) => {
          const cosmeticId = (g.entitlement as { cosmeticId: string }).cosmeticId;
          const worn = avatar.outfitKey === cosmeticId;
          return (
            <button
              key={g.sku}
              onClick={() => equip(cosmeticId)}
              disabled={busy}
              className={`flex items-center gap-3 px-3.5 py-2.5 border-2 text-left ${
                worn ? 'border-primary bg-primary-container' : 'border-wood-border bg-wood-dark/90'
              } disabled:opacity-40`}
            >
              <AvatarSprite
                baseSprite={`/assets/${avatar.base.sprite}`}
                outfitKey={cosmeticId}
                name={g.name}
                size={26}
              />
              <span className="min-w-0 flex-1">
                <span className="font-headline text-[14px] font-bold text-cream-surface block">
                  {g.name}
                </span>
                <span className="font-mono text-[10px] text-cream-surface/70">{g.description}</span>
              </span>
              {worn && <span className="font-mono text-[9px] uppercase text-primary">Worn</span>}
            </button>
          );
        })}
        {outfits.length === 0 && (
          <p className="font-mono text-[9px] text-on-surface-variant/70">
            Buy an outfit below to dress your farmer. The base and the hat never change.
          </p>
        )}
      </div>
    </section>
  );
}

export function StoreScreen() {
  const { pula, madi } = useGame();
  const { boosts, cosmetics, packs, plans, history, loading, busy, buy, startPayment } = useStore();

  const marketCosmetics = cosmetics.filter((c) => c.currency === 'PULA');
  const festivalCosmetics = cosmetics.filter((c) => c.currency === 'MADI');

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

  const renderGoodRow = (item: StoreItem) => {
    const isBusy = busy === item.sku;
    const isMadi = item.currency === 'MADI';
    const affordable = isMadi ? (madi ?? 0) >= item.price : pula >= item.price;
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
          <span className={`font-mono text-xs font-bold ${isMadi ? 'text-secondary' : 'text-gold-currency'}`}>
            {isMadi ? `📱 M${item.price.toLocaleString()}` : `P${item.price.toLocaleString()}`}
          </span>
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
              item.currency === 'BWP' || item.currency === 'MADI'
                ? 'text-secondary'
                : 'text-gold-currency'
            }`}
          >
            {item.currency === 'BWP'
              ? `💸 BWP ${item.price.toLocaleString()}`
              : item.currency === 'MADI'
              ? `📱 M${item.price.toLocaleString()}`
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-wood-dark px-2.5 py-1.5 border-2 border-wood-border">
            <span className="text-xs">💰</span>
            <span className="font-mono text-xs text-gold-currency font-bold">
              {pula.toLocaleString()}
            </span>
            <span className="font-mono text-[9px] text-on-surface-variant">Pula</span>
          </div>
          {madi !== null && (
            <div className="flex items-center gap-1 bg-wood-dark px-2.5 py-1.5 border-2 border-wood-border">
              <span className="text-xs">📱</span>
              <span className="font-mono text-xs text-secondary font-bold">
                {madi.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant">Madi</span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <p className="font-mono text-[10px] text-on-surface-variant mb-3">Loading the store...</p>
      )}

      {/* The avatar comes first: it is the player, not a purchase. */}
      <AvatarSection />

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
        <SectionHeading en="Village Pass" tn="Pase ya Motse" />
        <div className="flex flex-col gap-2">
          {plans.length === 0 ? (
            <Empty>No subscription available</Empty>
          ) : (
            plans.map(renderMoneyRow)
          )}
        </div>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1.5">
          A helper that waters and collects while you are away, one festival outfit each month, and +50% storage. The same helper is earned free at Botho 500 — paying gets it early.
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
        <SectionHeading en="Market Decor" tn="Mokgabiso wa Pula" />
        <div className="flex flex-col gap-2">
          {marketCosmetics.length === 0 ? (
            <Empty>Nothing to decorate with yet</Empty>
          ) : (
            marketCosmetics.map(renderGoodRow)
          )}
        </div>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1.5">
          Bought with Pula you earn — the everyday look. Yours for good; buying one twice costs nothing.
        </p>
      </section>

      <section className="mb-6">
        <SectionHeading en="Festival Decor" tn="Mokgabiso wa Mokete" />
        <div className="flex flex-col gap-2">
          {festivalCosmetics.length === 0 ? (
            <Empty>No festival looks on offer right now</Empty>
          ) : (
            festivalCosmetics.map(renderGoodRow)
          )}
        </div>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1.5">
          Bought with Madi — the seasonal look. Every Festival piece has a Market cousin in the same slot.
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
