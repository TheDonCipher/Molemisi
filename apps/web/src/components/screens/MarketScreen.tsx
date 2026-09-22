'use client';

import React from 'react';
import { useGame, apiFetch, type MarketItem, type InventoryItem } from '@/lib/gameState';
import { useTranslation } from '@/lib/useTranslation';
import { PixelIcon } from '@/components/PixelIcon';

/**
 * A read-only preview of a sale, from `GET /market/quote` (07 §7.5). Same numbers
 * the sale itself will produce, because the server computes both from one helper.
 */
interface SaleQuote {
  itemType: string;
  quantity: number;
  pricePerUnit: number;
  gross: number;
  tax: number;
  taxRate: number;
  netProceeds: number;
  band: 'wide' | 'crafted';
}

function ConfirmModal({
  open,
  title,
  message,
  details,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: {
  open: boolean;
  title: string;
  message: string;
  /** Optional breakdown rendered between the message and the buttons (07 §7.5). */
  details?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm border-2 border-wood-border bg-wood-dark p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-headline text-base font-bold text-cream-surface mb-2">{title}</div>
        <div className="font-body text-sm text-cream-surface/90 mb-3 leading-relaxed">
          {message}
        </div>
        {details && <div className="mb-4">{details}</div>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border-2 border-wood-border bg-surface-container-high px-4 py-2.5 font-mono text-xs uppercase font-bold text-cream-surface active:translate-y-0.5"
          >
            {cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-primary px-4 py-2.5 font-headline text-xs uppercase font-bold text-wood-dark active:translate-y-0.5"
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One line of the fee breakdown: label on the left, amount on the right. */
function QuoteRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'muted' | 'normal';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-cream-surface/${strong ? '90' : '70'}`}>{label}</span>
      <span
        className={
          strong
            ? 'font-bold text-gold-currency text-[15px]'
            : tone === 'muted'
              ? 'text-cream-surface/70'
              : 'text-cream-surface'
        }
      >
        {value}
      </span>
    </div>
  );
}

export function MarketScreen() {
  const {
    pula,
    inventory,
    marketItems,
    buyMarketItem,
    sellInventoryItem,
    quickSellProduce,
    showToast,
    setActiveNav,
    marketEvents,
  } = useGame();
  const { tl } = useTranslation();

  const [mode, setMode] = React.useState<'buy' | 'sell'>('buy');
  const [confirmState, setConfirmState] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    details?: React.ReactNode;
    fn: () => void;
  }>({ open: false, title: '', message: '', fn: () => {} });
  /**
   * The two-column product view (Princess Eugenia's request): clicking a product
   * row opens a side-by-side detail — identity on the left, actions + fee on the
   * right. `null` means the list is showing.
   */
  const [detail, setDetail] = React.useState<
    | { kind: 'buy'; item: MarketItem }
    | { kind: 'sell'; item: InventoryItem }
    | null
  >(null);

  const buyables = [...marketItems].sort((a: MarketItem, b: MarketItem) =>
    a.name.localeCompare(b.name),
  );

  const sellables = inventory
    .filter((item: InventoryItem) => item.quantity > 0 && item.category !== 'tools')
    .sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name));

  function handleBuy(item: MarketItem, qty: number) {
    const total = item.price * qty;
    setConfirmState({
      open: true,
      title: `${tl('buyConfirm')} ${item.name}`,
      message: `${tl('buyConfirm')} ${qty}x ${item.name} P${total}? Pula: P${pula}.`,
      details: undefined,
      fn: () => {
        buyMarketItem(item, qty);
        showToast(tl('bought'), `${qty}x ${item.name}`, '🛒', 'success');
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
  }

  /**
   * 07 §7.5 / 01 §4 — the fee is shown *before* the button, never after. So we ask
   * the server for a quote first and render price today → gross → Co-op tax → net,
   * instead of the old client-side guess that quoted a hardcoded unit value and
   * hid the tax entirely.
   */
  async function handleSell(item: InventoryItem, qty: number) {
    if (qty <= 0) return;
    const itemType = item.itemType || item.name.toLowerCase().replace(/\s+/g, '_');

    let quote: SaleQuote;
    try {
      quote = await apiFetch<SaleQuote>(
        'GET',
        `/market/quote?itemType=${encodeURIComponent(itemType)}&quantity=${qty}`,
      );
    } catch {
      // No price → no sale. Never open a confirm sheet with numbers we can't stand
      // behind, and never guess one.
      showToast(tl('sellFailed'), tl('priceUnavailable'), '⚠️', 'error');
      return;
    }

    const taxPct = `${Math.round(quote.taxRate * 100)}%`;

    setConfirmState({
      open: true,
      title: `${tl('sellConfirm')} ${item.name}`,
      message: `${qty} × ${item.name}`,
      details: (
        <div className="font-mono text-[13px] leading-relaxed">
          <QuoteRow label={tl('priceToday')} value={`P ${quote.pricePerUnit}`} />
          <QuoteRow label={tl('gross')} value={`P ${quote.gross.toFixed(2)}`} />
          <QuoteRow
            label={`${tl('coopTax')} (${taxPct})`}
            value={`−P ${quote.tax.toFixed(2)}`}
            tone="muted"
          />
          <div className="my-2 border-t border-wood-border" />
          <QuoteRow label={tl('youReceive')} value={`P ${quote.netProceeds.toFixed(2)}`} strong />
        </div>
      ),
      fn: () => {
        void sellInventoryItem(item, qty);
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
  }

  function handleSellAll() {
    setConfirmState({
      open: true,
      title: tl('sellAllProduce'),
      message: tl('sellAllConfirm'),
      details: undefined,
      fn: () => {
        quickSellProduce();
        showToast(tl('sold'), '', '💰', 'success');
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background — starts below the top bar */}
      <div className="fixed left-0 right-0 bottom-0 top-12 md:top-14 z-0 bg-[#210e0b]">
        <img
          alt="Village Market"
          className="w-full h-full object-cover object-center"
          style={{ imageRendering: 'pixelated' }}
          src="/assets/tiles/sky/market_portrait.png"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/assets/backgrounds/market_scene.png';
            } else {
              img.style.display = 'none';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60 pointer-events-none" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 px-4 pt-4 pb-8 max-w-lg mx-auto bg-black/35">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-headline text-[22px] font-bold text-cream-surface m-0 drop-shadow-[0_2px_0_rgba(0,0,0,0.8)]">
              🏪 {tl('villageMarket')}
            </h2>
            <div className="font-mono text-[13px] font-bold text-gold-currency drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
              P {pula.toLocaleString()}
            </div>
          </div>
          {mode === 'sell' && sellables.length > 0 && (
            <button
              onClick={handleSellAll}
              className="px-4 py-2.5 bg-status-success text-wood-dark font-headline text-[13px] font-bold uppercase active:translate-y-0.5"
            >
              {tl('quickSellAll')}
            </button>
          )}
        </div>

        {/* Market event banner — what is moving prices right now (02 §4). */}
        {marketEvents.length > 0 && (
          <div className="mb-4 border-2 border-gold-currency bg-wood-dark/90 px-3.5 py-2.5">
            <div className="font-headline text-[13px] font-bold text-gold-currency mb-1">
              📣 Market Event{marketEvents.length > 1 ? 's' : ''}
            </div>
            {marketEvents.map((ev) => (
              <div key={ev.id} className="font-body text-[12px] text-cream-surface/90 leading-snug">
                <span className="font-bold text-cream-surface">{ev.name}</span>
                {ev.multiplier !== 1 && (
                  <span className="ml-1 font-mono text-status-success">×{ev.multiplier}</span>
                )}{' '}
                — {ev.description}
              </div>
            ))}
          </div>
        )}

        {/* Buy / Sell Toggle */}
        <div className="flex gap-2 mb-5">
          {(['buy', 'sell'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 border-2 font-headline text-[15px] font-bold uppercase transition-all active:translate-y-0.5 ${
                mode === m
                  ? 'border-primary bg-primary text-wood-dark'
                  : 'border-wood-border bg-wood-dark/70 text-cream-surface'
              }`}
            >
              {m === 'buy' ? tl('buySeeds') : tl('sellProduce')}
            </button>
          ))}
        </div>

        {/* Buy Mode — rows are clickable; tapping a seed opens the two-column detail. */}
        {mode === 'buy' && (
          <div className="flex flex-col gap-2">
            {buyables.length === 0 && (
              <div className="py-8 text-center font-body text-sm text-cream-surface/75">
                {tl('noSeedsAvailable')}
              </div>
            )}
            {buyables.map((item: MarketItem) => (
              <button
                key={item.id}
                onClick={() => setDetail({ kind: 'buy', item })}
                className="flex w-full items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-3 text-left active:translate-y-0.5"
              >
                <PixelIcon itemType={item.itemType} emoji={item.icon} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-headline text-[15px] font-bold text-cream-surface truncate">
                    {item.name}
                    {item.badge && (
                      <span className="ml-2 align-middle text-xs font-mono font-bold uppercase text-status-success">
                        {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : ''} {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[13px] font-bold text-gold-currency">
                    P{item.price}
                    {item.basePrice !== undefined && item.basePrice !== item.price && (
                      <span className="ml-1 text-cream-surface/50 line-through">P{item.basePrice}</span>
                    )}
                  </div>
                </div>
                <span className="font-headline text-[20px] text-cream-surface/50">›</span>
              </button>
            ))}
          </div>
        )}

        {/* Sell Mode — rows are clickable; tapping a good opens the two-column detail. */}
        {mode === 'sell' && (
          <div className="flex flex-col gap-2">
            {sellables.length === 0 && (
              <div className="py-8 text-center font-body text-sm text-cream-surface/75">
                {tl('nothingToSell')}
              </div>
            )}
            {sellables.map((item: InventoryItem) => (
              <button
                key={item.id}
                onClick={() => setDetail({ kind: 'sell', item })}
                disabled={item.quantity < 1}
                className="flex w-full items-center gap-3 border-2 border-wood-border bg-wood-dark/90 px-3.5 py-3 text-left active:translate-y-0.5 disabled:opacity-50"
              >
                <PixelIcon itemType={item.itemType} emoji={item.icon} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-headline text-[15px] font-bold text-cream-surface truncate">
                    {item.name}
                  </div>
                  <div className="font-mono text-xs text-cream-surface/75">
                    ×{item.quantity} · {tl('tapToSell')}
                  </div>
                </div>
                <span className="font-headline text-[20px] text-cream-surface/50">›</span>
              </button>
            ))}
          </div>
        )}

        {/* Back to Farm */}
        <div className="text-center mt-5">
          <button
            onClick={() => setActiveNav('Farm')}
            className="px-6 py-2.5 border-2 border-wood-border bg-wood-dark/90 font-headline text-sm font-bold uppercase text-cream-surface active:translate-y-0.5"
          >
            {tl('backToFarm')}
          </button>
        </div>

        {/* Confirmation Dialog (used by Quick-Sell-All and the Buy/Sell actions) */}
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          details={confirmState.details}
          onConfirm={confirmState.fn}
          onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
          confirmLabel={tl('confirm')}
          cancelLabel={tl('cancel')}
        />

        {/* Two-column product detail — opens when a product row is clicked. */}
        {detail && (
          <ProductDetail
            detail={detail}
            pula={pula}
            onClose={() => setDetail(null)}
            onBuy={handleBuy}
            onSell={handleSell}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The side-by-side product view requested by the Princess: clicking a product in
 * the list opens this. LEFT column = who/what the item is (icon, name, description,
 * stock). RIGHT column = the action (quantity stepper + price, or the Co-op fee
 * breakdown + Sell buttons). The fee is shown *before* the Sell button (01 §4),
 * pulled from the same server quote the sale uses (07 §7.5).
 */
function ProductDetail({
  detail,
  pula,
  onClose,
  onBuy,
  onSell,
}: {
  detail: { kind: 'buy'; item: MarketItem } | { kind: 'sell'; item: InventoryItem };
  pula: number;
  onClose: () => void;
  onBuy: (item: MarketItem, qty: number) => void;
  onSell: (item: InventoryItem, qty: number) => void;
}) {
  const { tl } = useTranslation();
  const [qty, setQty] = React.useState(1);
  const [quote, setQuote] = React.useState<SaleQuote | null>(null);

  const buyItem = detail.kind === 'buy' ? detail.item : null;
  const sellItem = detail.kind === 'sell' ? detail.item : null;

  // For a good, pre-fetch the per-unit quote so the Co-op fee shows before the
  // button. (The actual sale re-quotes server-side; this is the preview.)
  React.useEffect(() => {
    if (!sellItem) return;
    const itemType = sellItem.itemType || sellItem.name.toLowerCase().replace(/\s+/g, '_');
    let cancelled = false;
    apiFetch<SaleQuote>(
      'GET',
      `/market/quote?itemType=${encodeURIComponent(itemType)}&quantity=1`,
    )
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sellItem]);

  const maxQty = buyItem
    ? Math.max(1, Math.floor(pula / Math.max(1, buyItem.price)))
    : sellItem
      ? Math.max(1, sellItem.quantity || 0)
      : 1;
  const clampedQty = Math.min(Math.max(1, qty), maxQty);
  const total = buyItem ? buyItem.price * clampedQty : 0;
  const canAfford = pula >= total;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border-2 border-wood-border bg-wood-dark p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-start justify-between mb-3">
          <div className="font-headline text-[16px] font-bold text-cream-surface pr-2">
            {buyItem ? buyItem.name : sellItem?.name}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 border-2 border-wood-border bg-surface-container-high px-2.5 py-1 font-mono text-xs font-bold text-cream-surface active:translate-y-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* TWO COLUMNS, SIDE BY SIDE */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT — identity */}
          <div className="flex flex-col items-center text-center">
            <PixelIcon
              itemType={buyItem?.itemType ?? sellItem?.itemType ?? ''}
              emoji={buyItem?.icon ?? sellItem?.icon ?? ''}
              size={56}
            />
            <div className="mt-2 font-body text-[12px] leading-snug text-cream-surface/75 px-1">
              {buyItem ? buyItem.description : sellItem?.description}
            </div>
            {sellItem && (
              <div className="mt-2 font-mono text-[12px] text-cream-surface/80">
                In stock: ×{sellItem.quantity}
              </div>
            )}
          </div>

          {/* RIGHT — action */}
          <div className="flex flex-col gap-2.5">
            {buyItem ? (
              <>
                <div className="font-mono text-sm font-bold text-gold-currency">
                  P{buyItem.price} each
                </div>
                <div className="flex items-center justify-between border-2 border-wood-border bg-wood-dark/60 px-2 py-1">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-1 font-headline text-base font-bold text-cream-surface active:translate-y-0.5"
                  >
                    −
                  </button>
                  <span className="font-mono text-sm text-cream-surface">{clampedQty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="px-3 py-1 font-headline text-base font-bold text-cream-surface active:translate-y-0.5"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-body text-xs text-cream-surface/70">Total</span>
                  <span className="font-bold text-gold-currency text-[15px]">P{total}</span>
                </div>
                <button
                  disabled={!canAfford}
                  onClick={() => {
                    onBuy(buyItem, clampedQty);
                    onClose();
                  }}
                  className={`py-2.5 font-headline text-[13px] font-bold uppercase active:translate-y-0.5 ${
                    canAfford
                      ? 'bg-primary text-wood-dark'
                      : 'bg-surface-container-high text-cream-surface/70 cursor-not-allowed'
                  }`}
                >
                  {tl('buySeeds')}
                </button>
                {!canAfford && (
                  <div className="font-mono text-xs text-red-400">Not enough Pula</div>
                )}
              </>
            ) : sellItem ? (
              <>
                {quote ? (
                  <div className="font-mono text-[12px] leading-relaxed">
                    <QuoteRow label={tl('priceToday')} value={`P ${quote.pricePerUnit}`} />
                    <QuoteRow label={tl('gross')} value={`P ${quote.gross.toFixed(2)}`} />
                    <QuoteRow
                      label={`${tl('coopTax')} (5%)`}
                      value={`−P ${quote.tax.toFixed(2)}`}
                      tone="muted"
                    />
                    <div className="my-1 border-t border-wood-border" />
                    <QuoteRow
                      label={tl('youReceive')}
                      value={`P ${quote.netProceeds.toFixed(2)}`}
                      strong
                    />
                  </div>
                ) : (
                  <div className="font-body text-[12px] text-cream-surface/75">
                    {tl('priceUnavailable')}
                  </div>
                )}
                <button
                  disabled={(sellItem.quantity || 0) < 1}
                  onClick={() => {
                    onSell(sellItem, 1);
                    onClose();
                  }}
                  className="py-2.5 bg-status-success text-wood-dark font-headline text-[13px] font-bold uppercase active:translate-y-0.5 disabled:opacity-50"
                >
                  Sell 1
                </button>
                <button
                  disabled={(sellItem.quantity || 0) < 1}
                  onClick={() => {
                    onSell(sellItem, sellItem.quantity);
                    onClose();
                  }}
                  className="py-2.5 bg-status-success text-wood-dark font-headline text-[13px] font-bold uppercase active:translate-y-0.5 disabled:opacity-50"
                >
                  {tl('sellAll')} (×{sellItem.quantity})
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
