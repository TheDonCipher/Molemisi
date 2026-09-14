// One-off generator: emit seed INSERTs for the Bushveld tables from game-config,
// so the DB can never drift from the authoritative content (04 §12). Run, paste
// the output into the P6 migration, then delete this file.
const c = require('C:/Users/Japan/OneDrive/Documents/GitHub/Molemisi/packages/game-config/dist');

const esc = (s) => (s ?? '').replace(/'/g, "''");
const j = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;

const sceneRows = c.SCENES.map((s) => {
  const unlock = s.unlock ? { botho_gte: s.unlock.bothoGte } : null;
  return `  ('${s.slug}', '${esc(s.name)}', '${esc(s.restorationAssets[0] ?? '')}', ${c.KAGISO.max}, ${c.KAGISO.regenMinutes}, ${unlock ? j(unlock) : 'NULL'}, ${j(s.restorationAssets)}::jsonb, ${j(s.restorationThresholds)}::jsonb)`;
}).join(',\n');

const hotspotRows = c.HOTSPOTS.map((h) => {
  const months = h.activeMonths ? `{${h.activeMonths.join(',')}}` : 'NULL';
  return `  ('${h.id}', '${h.scene}', ${h.x}, ${h.y}, '${esc(h.sprite)}', ${h.kagisoCost}, ${c.KAGISO.restMinutes}, ${months})`;
}).join(',\n');

const header = '-- AUTO-GENERATED from packages/game-config (run scripts/_gen_bushveld_seed.cjs).';
console.log(header);
console.log('\n-- bushveld_scenes');
console.log('INSERT INTO public.bushveld_scenes\n  (id, name, background_asset_key, kagiso_max, kagiso_regen_minutes, unlock_condition, restoration_asset_keys, restoration_thresholds)\nVALUES');
console.log(sceneRows + '\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  background_asset_key = EXCLUDED.background_asset_key,\n  kagiso_max = EXCLUDED.kagiso_max,\n  kagiso_regen_minutes = EXCLUDED.kagiso_regen_minutes,\n  unlock_condition = EXCLUDED.unlock_condition,\n  restoration_asset_keys = EXCLUDED.restoration_asset_keys,\n  restoration_thresholds = EXCLUDED.restoration_thresholds;');

console.log('\n-- bushveld_hotspots');
console.log('INSERT INTO public.bushveld_hotspots\n  (id, scene_id, x, y, sprite_key, kagiso_cost, rest_minutes, active_months)\nVALUES');
console.log(hotspotRows + '\nON CONFLICT (id) DO UPDATE SET\n  scene_id = EXCLUDED.scene_id,\n  x = EXCLUDED.x,\n  y = EXCLUDED.y,\n  sprite_key = EXCLUDED.sprite_key,\n  kagiso_cost = EXCLUDED.kagiso_cost,\n  rest_minutes = EXCLUDED.rest_minutes,\n  active_months = EXCLUDED.active_months;');
