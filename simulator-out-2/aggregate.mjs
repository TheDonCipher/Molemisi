import fs from 'fs';

const file = process.argv[2] || 'simulator-out-2/raw_events.jsonl';
const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
const events = lines.map(l => JSON.parse(l));

const tot = events.length;
const succ = events.filter(e => e.result === 'success').length;
const rej = events.filter(e => e.result === 'rejected').length;
const errs = events.filter(e => {
  const s = e.metadata?.status;
  return typeof s === 'number' && s >= 500;
});

const by = {};
for (const e of events) {
  const key = `${e.system}/${e.action}`;
  by[key] = by[key] || { system: e.system, action: e.action, total: 0, success: 0, rejected: 0, statuses: {}, players: new Set() };
  const b = by[key];
  b.total++;
  if (e.result === 'success') b.success++; else b.rejected++;
  const s = e.metadata?.status;
  if (s != null) b.statuses[s] = (b.statuses[s] || 0) + 1;
  if (e.playerId) b.players.add(e.playerId);
}

const byDay = {};
for (const e of events) byDay[e.simulatedDay] = (byDay[e.simulatedDay] || 0) + 1;

const byProfile = {};
for (const e of events) byProfile[e.profile] = (byProfile[e.profile] || 0) + 1;

const t0 = new Date(events[0].timestamp).getTime();
const t1 = new Date(events[tot - 1].timestamp).getTime();
const spanSec = (t1 - t0) / 1000;

function pct(n, d) { return d ? ((100 * n) / d).toFixed(1) + '%' : 'n/a'; }

const out = [];
out.push(`=== MOLEMISI SIMULATOR AGGREGATE ===`);
out.push(`source: ${file}`);
out.push(`total events: ${tot}`);
out.push(`success: ${succ} (${pct(succ, tot)})  rejected: ${rej} (${pct(rej, tot)})  server-5xx: ${errs.length}`);
out.push(`simulated days present: ${Object.keys(byDay).sort((a,b)=>a-b).join(', ')}`);
out.push(`events/day: ${Object.entries(byDay).sort((a,b)=>a[0]-b[0]).map(([d,c])=>`D${d}=${c}`).join('  ')}`);
out.push(`profile split: ${Object.entries(byProfile).map(([p,c])=>`${p}=${c}`).join('  ')}`);
out.push(`wall-clock span: ${spanSec.toFixed(0)}s  (~${(spanSec/tot).toFixed(2)}s/call, ${(tot/spanSec).toFixed(3)} evt/s)`);
out.push('');
out.push(`=== PER-SYSTEM BREAKDOWN (sorted by total) ===`);
const rows = Object.values(by).sort((a,b)=>b.total-a.total);
out.push(`system/action                         total  succ  rej   success%  top-statuses`);
for (const b of rows) {
  const name = `${b.system}/${b.action}`.padEnd(34).slice(0,34);
  const top = Object.entries(b.statuses).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([s,c])=>`${s}:${c}`).join(' ');
  out.push(`${name} ${String(b.total).padStart(5)} ${String(b.success).padStart(5)} ${String(b.rejected).padStart(5)}  ${pct(b.success,b.total).padStart(7)}  ${top}`);
}
out.push('');
out.push(`=== REJECTION STATUS HISTOGRAM (all rejected) ===`);
const rejStatus = {};
for (const e of events) if (e.result==='rejected'){ const s=e.metadata?.status; rejStatus[s]=(rejStatus[s]||0)+1; }
for (const [s,c] of Object.entries(rejStatus).sort((a,b)=>b[1]-a[1])) out.push(`  ${s}: ${c}`);

out.push('');
out.push(`=== Kgotla charge detail ===`);
const kgotlaTurn = events.filter(e=>e.system==='kgotla'&&e.action==='turn-in');
const kgotlaAcc = events.filter(e=>e.system==='kgotla'&&e.action==='accept');
out.push(`accept: ${kgotlaAcc.length} (success ${kgotlaAcc.filter(e=>e.result==='success').length}, rejected ${kgotlaAcc.filter(e=>e.result==='rejected').length})`);
out.push(`turn-in: ${kgotlaTurn.length} (success ${kgotlaTurn.filter(e=>e.result==='success').length}, rejected ${kgotlaTurn.filter(e=>e.result==='rejected').length})`);
const accKinds = {};
for (const e of kgotlaAcc) { const k=e.metadata?.kind; accKinds[k||'?']=(accKinds[k||'?']||0)+1; }
out.push(`accepted charge kinds: ${Object.entries(accKinds).map(([k,c])=>`${k}:${c}`).join(' ')}`);
const turnKinds = {};
for (const e of kgotlaTurn) { const k=e.metadata?.kind; turnKinds[k||'?']=(turnKinds[k||'?']||0)+1; }
out.push(`turn-in charge kinds attempted: ${Object.entries(turnKinds).map(([k,c])=>`${k}:${c}`).join(' ')}`);

console.log(out.join('\n'));

const reportData = { tot, succ, rej, errs: errs.length, byDay, byProfile, spanSec,
  rows: rows.map(b=>({key:`${b.system}/${b.action}`, total:b.total, success:b.success, rejected:b.rejected, statuses:b.statuses, players:b.players.size})),
  rejStatus };
fs.writeFileSync('simulator-out-2/agg.json', JSON.stringify(reportData, null, 2));
console.log('\n[wrote simulator-out-2/agg.json]');
