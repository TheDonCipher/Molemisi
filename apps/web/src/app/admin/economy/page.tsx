'use client';

import React, { useEffect, useState, useMemo } from 'react';

const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('molemisi_admin_token');
}

async function apiFetch<T = unknown>(method: string, path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return (json?.data ?? json) as T;
}

interface EconomyData {
  totalPlayers: number;
  totalCurrencyInCirculation: number;
  averagePlayerWealth: number;
  totalCompletedPayments: number;
  totalRevenue: number;
  activeCrops: number;
}

interface PriceItem {
  itemType: string;
  name: string;
  category: string;
  basePrice: number;
}

interface LedgerEntry {
  player_id: string;
  entry_type: string;
  reference_type: string;
  amount_change: number;
  description: string;
  created_at: string;
}

// ---- SVG Chart Components ----

function BarChart({
  data,
  labels,
  colors,
  height = 120,
}: {
  data: number[];
  labels: string[];
  colors: string[];
  height?: number;
}) {
  const maxVal = Math.max(...data, 1);
  const barWidth = Math.floor(400 / data.length) - 4;

  return (
    <svg viewBox={`0 0 400 ${height}`} className="w-full h-auto">
      {data.map((val, i) => {
        const barH = (val / maxVal) * (height - 20);
        const x = i * (barWidth + 4) + 2;
        const y = height - barH - 16;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={colors[i % colors.length]}
              rx="2"
            />
            <text
              x={x + barWidth / 2}
              y={height - 2}
              textAnchor="middle"
              className="fill-on-surface-variant"
              fontSize="8"
              fontFamily="monospace"
            >
              {labels[i]}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 3}
              textAnchor="middle"
              className="fill-cream-surface"
              fontSize="8"
              fontFamily="monospace"
            >
              {val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({
  data,
  color = '#d4a853',
  height = 100,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const w = 400;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - 10 - ((val - minVal) / range) * (height - 20);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-auto">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - 10 - ((val - minVal) / range) * (height - 20);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

export default function EconomyPage() {
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = () => {
    Promise.allSettled([
      apiFetch<EconomyData>('GET', '/admin/economy'),
      apiFetch<PriceItem[]>('GET', '/market/prices'),
      apiFetch<LedgerEntry[]>('GET', '/admin/ledger?limit=100'),
    ]).then(([ecoRes, priceRes, ledgerRes]) => {
      if (ecoRes.status === 'fulfilled') setEconomy(ecoRes.value);
      if (priceRes.status === 'fulfilled' && Array.isArray(priceRes.value))
        setPrices(priceRes.value);
      if (ledgerRes.status === 'fulfilled' && Array.isArray(ledgerRes.value))
        setLedger(ledgerRes.value);
      setLoading(false);
      setLastRefresh(new Date());
    });
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Compute chart data from ledger
  const chartData = useMemo(() => {
    // Group entries by type for the bar chart
    const typeCounts: Record<string, number> = {};
    ledger.forEach((e) => {
      typeCounts[e.entry_type] = (typeCounts[e.entry_type] || 0) + 1;
    });
    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Currency flow over time for the line chart
    const currencyByHour: Record<string, number> = {};
    ledger.forEach((e) => {
      const hour = e.created_at ? new Date(e.created_at).getHours().toString() : '0';
      currencyByHour[hour] = (currencyByHour[hour] || 0) + e.amount_change;
    });
    const hours = Object.keys(currencyByHour).sort((a, b) => Number(a) - Number(b));
    const currencyFlow = hours.map((h) => currencyByHour[h] || 0);

    return {
      typeLabels: sortedTypes.map((t) => t[0].slice(0, 8)),
      typeValues: sortedTypes.map((t) => t[1]),
      currencyFlow,
      hours: hours.map((h) => `${h}h`),
    };
  }, [ledger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">💰</div>
          <p className="font-headline text-xs text-primary uppercase font-bold">
            Loading economy data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl text-primary uppercase font-bold">
          Economy Monitoring
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-on-surface-variant">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={refresh}
            className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase border border-wood-border hover:border-primary/50 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Top Stats */}
      {economy && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total Players', value: economy.totalPlayers, icon: '👥' },
            {
              label: 'Currency Supply',
              value: `P${economy.totalCurrencyInCirculation.toLocaleString()}`,
              icon: '💰',
            },
            {
              label: 'Avg Wealth',
              value: `P${economy.averagePlayerWealth.toLocaleString()}`,
              icon: '📈',
            },
            {
              label: 'Payments',
              value: economy.totalCompletedPayments,
              icon: '✅',
            },
            {
              label: 'Revenue',
              value: `P${Math.round(economy.totalRevenue).toLocaleString()}`,
              icon: '💵',
            },
            { label: 'Active Crops', value: economy.activeCrops, icon: '🌾' },
          ].map((s) => (
            <div key={s.label} className="bg-wood-dark p-3 border border-wood-border">
              <span className="text-lg">{s.icon}</span>
              <div className="font-mono text-lg text-gold-currency font-bold mt-1">{s.value}</div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Transaction Types Bar Chart */}
        <div className="bg-wood-dark p-4 border border-wood-border">
          <h3 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
            Transactions by Type
          </h3>
          {chartData.typeLabels.length > 0 ? (
            <BarChart
              data={chartData.typeValues}
              labels={chartData.typeLabels}
              colors={[
                '#d4a853',
                '#66bb6a',
                '#42a5f5',
                '#ef5350',
                '#ab47bc',
                '#ff7043',
                '#26c6da',
                '#8d6e63',
              ]}
            />
          ) : (
            <div className="text-center py-8">
              <span className="font-body text-xs text-on-surface-variant">
                No transaction data yet.
              </span>
            </div>
          )}
        </div>

        {/* Currency Flow Line Chart */}
        <div className="bg-wood-dark p-4 border border-wood-border">
          <h3 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
            Currency Flow Over Time
          </h3>
          {chartData.currencyFlow.length > 1 ? (
            <LineChart data={chartData.currencyFlow} color="#66bb6a" />
          ) : (
            <div className="text-center py-8">
              <span className="font-body text-xs text-on-surface-variant">
                Not enough data points for chart.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price List */}
      <div className="mb-8">
        <h2 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Market Prices
        </h2>
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Item</span>
            <span>Category</span>
            <span>Base Price</span>
            <span>Item Type</span>
          </div>
          {prices.map((p) => (
            <div
              key={p.itemType}
              className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span className="font-headline text-xs text-cream-surface font-bold">{p.name}</span>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase">
                {p.category}
              </span>
              <span className="font-mono text-xs text-gold-currency font-bold">P{p.basePrice}</span>
              <span className="font-mono text-[10px] text-on-surface-variant">{p.itemType}</span>
            </div>
          ))}
          {prices.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No price data available.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Ledger */}
      <div>
        <h2 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Recent Transactions
        </h2>
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Type</span>
            <span>Amount</span>
            <span>Reference</span>
            <span className="col-span-2">Description</span>
          </div>
          {ledger.slice(0, 30).map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span className="font-mono text-[10px] text-primary font-bold uppercase">
                {e.entry_type}
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  e.amount_change >= 0 ? 'text-status-success' : 'text-status-danger'
                }`}
              >
                {e.amount_change >= 0 ? '+' : ''}
                {e.amount_change}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {e.reference_type || '—'}
              </span>
              <span className="col-span-2 font-mono text-[10px] text-on-surface-variant truncate">
                {e.description || '—'}
              </span>
            </div>
          ))}
          {ledger.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No transactions recorded.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
