'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('molemisi_admin_token');
}

async function apiFetch<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return (json?.data ?? json) as T;
}

interface ConfigEntry {
  id: string;
  config_key: string;
  config_value: unknown;
  category: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  updated_at: string;
}

interface CropConfig {
  name: string;
  growthStages: number;
  baseYield: number;
  seedCost: number;
  sellPrice: number;
  waterNeeds: number;
  xpReward: number;
}

const CATEGORY_META: Record<string, { title: string; icon: string }> = {
  farm: { title: 'Farm Settings', icon: '🏡' },
  economy: { title: 'Economy Settings', icon: '💰' },
  progression: { title: 'Progression', icon: '📈' },
  weather: { title: 'Weather', icon: '🌤️' },
  simulation: { title: 'Simulation', icon: '⚙️' },
};

const LABEL_MAP: Record<string, string> = {
  STARTING_PLOTS: 'Starting Plots',
  MAX_PLOTS: 'Max Plots',
  STARTING_CURRENCY: 'Starting Pula',
  STARTING_WATER: 'Starting Water (L)',
  MAX_WATER: 'Max Water (L)',
  PRICE_FLUCTUATION: 'Price Fluctuation %',
  MARKET_UPDATE_HOURS: 'Market Update (hours)',
  SELL_TAX_RATE: 'Sell Tax Rate %',
  CONTRACT_BONUS: 'Contract Bonus %',
  XP_PER_LEVEL: 'XP Per Level',
  XP_PLANT: 'XP: Plant',
  XP_WATER: 'XP: Water',
  XP_HARVEST: 'XP: Harvest',
  XP_FORAGE: 'XP: Forage',
  CLEAR_PROB: 'Clear Weather %',
  CLOUDY_PROB: 'Cloudy %',
  RAIN_PROB: 'Rain %',
  STORM_PROB: 'Storm %',
  DROUGHT_CHANCE: 'Drought Chance %',
  SIMULATION_INTERVAL: 'Sim Interval (sec)',
  GROWTH_PER_TICK: 'Growth Per Tick',
  HYDRATION_DECAY: 'Hydration Decay/Tick',
  ENERGY_REGEN: 'Energy Regen/Hour',
};

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [crops, setCrops] = useState<CropConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('crops');
  const [hasChanges, setHasChanges] = useState(false);
  const [auditLog, setAuditLog] = useState<
    Array<{
      config_key: string;
      old_value: unknown;
      new_value: unknown;
      reason: string | null;
      created_at: string;
    }>
  >([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load config from API
  const loadConfig = useCallback(async () => {
    try {
      const data = await apiFetch<ConfigEntry[]>('GET', '/config');
      setConfig(Array.isArray(data) ? data : []);

      // Parse crop configs
      const cropEntries = (Array.isArray(data) ? data : []).filter(
        (e) => e.category === 'crops' && e.config_key.startsWith('CROP_'),
      );
      const parsedCrops: CropConfig[] = cropEntries.map((e) => {
        const val = (
          typeof e.config_value === 'string' ? JSON.parse(e.config_value) : e.config_value
        ) as Partial<CropConfig>;
        return {
          name:
            e.config_key.replace('CROP_', '').charAt(0).toUpperCase() +
            e.config_key.replace('CROP_', '').slice(1).toLowerCase(),
          growthStages: val.growthStages || 4,
          baseYield: val.baseYield || 2,
          seedCost: val.seedCost || 10,
          sellPrice: val.sellPrice || 10,
          waterNeeds: val.waterNeeds || 50,
          xpReward: val.xpReward || 10,
        };
      });
      setCrops(parsedCrops);

      // Load audit log
      const log = await apiFetch<
        Array<{
          config_key: string;
          old_value: unknown;
          new_value: unknown;
          reason: string | null;
          created_at: string;
        }>
      >('GET', '/config/audit/log?limit=20');
      setAuditLog(Array.isArray(log) ? log : []);
    } catch {
      showToast('Failed to load config from API');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Update a system config value locally
  const updateSystemConfig = (key: string, value: number) => {
    setConfig((prev) =>
      prev.map((c) => (c.config_key === key ? { ...c, config_value: value } : c)),
    );
    setHasChanges(true);
  };

  // Update a crop value locally
  const updateCrop = (index: number, field: keyof CropConfig, value: number) => {
    setCrops((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    setHasChanges(true);
  };

  // Save all changes to API
  const handleSave = async () => {
    setSaving(true);
    try {
      // Save system config changes
      const systemUpdates = config
        .filter((c) => c.category !== 'crops')
        .map((c) => ({
          key: c.config_key,
          value: c.config_value,
        }));

      // Save crop config changes
      const cropUpdates = crops.map((crop) => ({
        key: `CROP_${crop.name.toUpperCase()}`,
        value: {
          growthStages: crop.growthStages,
          baseYield: crop.baseYield,
          seedCost: crop.seedCost,
          sellPrice: crop.sellPrice,
          waterNeeds: crop.waterNeeds,
          xpReward: crop.xpReward,
        },
      }));

      await apiFetch('PUT', '/config', {
        updates: [...systemUpdates, ...cropUpdates],
        reason: 'Admin config update',
      });

      setHasChanges(false);
      showToast('Configuration saved! Changes take effect immediately.');
      await loadConfig(); // Refresh from API
    } catch {
      showToast('Failed to save configuration.');
    }
    setSaving(false);
  };

  // Reset to API defaults
  const handleReset = async () => {
    if (!window.confirm('Reset all configuration to database defaults?')) return;
    setSaving(true);
    try {
      await loadConfig();
      setHasChanges(false);
      showToast('Configuration reloaded from database.');
    } catch {
      showToast('Failed to reload config.');
    }
    setSaving(false);
  };

  // Group system config by category
  const categories = Array.from(
    new Set(config.filter((c) => c.category !== 'crops').map((c) => c.category)),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">⚙️</div>
          <p className="font-headline text-xs text-primary uppercase font-bold">
            Loading configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-xl text-primary uppercase font-bold">
            Game Configuration
          </h1>
          <p className="font-mono text-[10px] text-on-surface-variant mt-1">
            {config.length} config entries • Changes persist to database
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase font-bold border border-wood-border hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-4 py-2 font-headline text-xs uppercase font-bold transition-colors disabled:opacity-50 ${
              hasChanges
                ? 'bg-primary text-wood-dark hover:bg-primary/80'
                : 'bg-surface-container-high text-on-surface-variant border border-wood-border'
            }`}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveSection('crops')}
          className={`px-3 py-2 font-mono text-xs uppercase whitespace-nowrap border transition-all ${
            activeSection === 'crops'
              ? 'bg-primary-container text-on-primary-container border-primary font-bold'
              : 'bg-surface-container-high text-on-surface-variant border-wood-border'
          }`}
        >
          🌾 Crops ({crops.length})
        </button>
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] || { title: cat, icon: '📋' };
          const count = config.filter((c) => c.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveSection(cat)}
              className={`px-3 py-2 font-mono text-xs uppercase whitespace-nowrap border transition-all ${
                activeSection === cat
                  ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                  : 'bg-surface-container-high text-on-surface-variant border-wood-border'
              }`}
            >
              {meta.icon} {meta.title} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setActiveSection('audit')}
          className={`px-3 py-2 font-mono text-xs uppercase whitespace-nowrap border transition-all ${
            activeSection === 'audit'
              ? 'bg-primary-container text-on-primary-container border-primary font-bold'
              : 'bg-surface-container-high text-on-surface-variant border-wood-border'
          }`}
        >
          📜 Audit Log ({auditLog.length})
        </button>
      </div>

      {/* Crops Editor */}
      {activeSection === 'crops' && (
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          <div className="grid grid-cols-8 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Crop</span>
            <span>Stages</span>
            <span>Yield</span>
            <span>Seed Cost</span>
            <span>Sell Price</span>
            <span>Water %</span>
            <span>XP</span>
            <span>Profit</span>
          </div>
          {crops.map((crop, i) => {
            const profit = crop.sellPrice * crop.baseYield - crop.seedCost;
            return (
              <div
                key={crop.name}
                className="grid grid-cols-8 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
              >
                <span className="font-headline text-xs text-cream-surface font-bold">
                  {crop.name}
                </span>
                <input
                  type="number"
                  value={crop.growthStages}
                  onChange={(e) => updateCrop(i, 'growthStages', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-cream-surface text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.baseYield}
                  onChange={(e) => updateCrop(i, 'baseYield', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-cream-surface text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.seedCost}
                  onChange={(e) => updateCrop(i, 'seedCost', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-gold-currency text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.sellPrice}
                  onChange={(e) => updateCrop(i, 'sellPrice', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-gold-currency text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.waterNeeds}
                  onChange={(e) => updateCrop(i, 'waterNeeds', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-sky-blue text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.xpReward}
                  onChange={(e) => updateCrop(i, 'xpReward', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-primary text-center focus:outline-none focus:border-primary"
                />
                <span
                  className={`font-mono text-xs font-bold ${
                    profit >= 0 ? 'text-status-success' : 'text-status-danger'
                  }`}
                >
                  P{profit}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* System Config Editor */}
      {categories.includes(activeSection) && (
        <div className="bg-wood-dark border border-wood-border p-4">
          <h3 className="font-headline text-sm text-cream-surface font-bold mb-4">
            {CATEGORY_META[activeSection]?.icon}{' '}
            {CATEGORY_META[activeSection]?.title || activeSection}
          </h3>
          <div className="space-y-4">
            {config
              .filter((c) => c.category === activeSection)
              .map((entry) => {
                const label = LABEL_MAP[entry.config_key] || entry.config_key;
                return (
                  <div key={entry.config_key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="font-mono text-xs text-cream-surface font-bold block">
                        {label}
                      </label>
                      {entry.description && (
                        <span className="font-mono text-[9px] text-on-surface-variant">
                          {entry.description}
                        </span>
                      )}
                      {(entry.min_value !== null || entry.max_value !== null) && (
                        <span className="font-mono text-[9px] text-on-surface-variant block">
                          Range: {entry.min_value ?? '—'} – {entry.max_value ?? '—'}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={Number(entry.config_value)}
                      min={entry.min_value ?? undefined}
                      max={entry.max_value ?? undefined}
                      step={
                        entry.config_key.includes('DECAY') || entry.config_key.includes('GROWTH')
                          ? 0.01
                          : 1
                      }
                      onChange={(e) => updateSystemConfig(entry.config_key, Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-surface-container-high border border-wood-border font-mono text-sm text-gold-currency text-center focus:outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {activeSection === 'audit' && (
        <div className="bg-wood-dark border border-wood-border">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Time</span>
            <span>Key</span>
            <span>Old Value</span>
            <span>New Value</span>
            <span>Reason</span>
          </div>
          {auditLog.map((entry, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span className="font-mono text-[10px] text-on-surface-variant whitespace-nowrap">
                {new Date(entry.created_at).toLocaleString()}
              </span>
              <span className="font-mono text-[10px] text-primary font-bold">
                {entry.config_key}
              </span>
              <span className="font-mono text-[10px] text-status-danger truncate">
                {JSON.stringify(entry.old_value)}
              </span>
              <span className="font-mono text-[10px] text-status-success truncate">
                {JSON.stringify(entry.new_value)}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant truncate">
                {entry.reason || '—'}
              </span>
            </div>
          ))}
          {auditLog.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No configuration changes recorded yet.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-status-success/90 text-wood-dark px-4 py-2 font-mono text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
