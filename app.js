'use strict';
/* ========== Utilitaires ========== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => typeof v === 'number' ? v : v === 'tr' ? 0 : parseFloat(v.slice(1).replace(',', '.')) / 2;
const fr = (x, d = 1) => (+x).toLocaleString('fr-FR', {minimumFractionDigits: d, maximumFractionDigits: d});
const fr0 = x => Math.round(x).toLocaleString('fr-FR');
const show = v => typeof v === 'number' ? (Number.isInteger(v) && v >= 100 ? String(v) : (v === 0 ? '0' : fr(v))) : v === 'tr' ? 'Traces' : '< ' + v.slice(1);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const kcalOf = (p, g, l) => 4 * p + 4 * g + 9 * l;
const stClass = s => /égoutt/.test(s) ? 'eg' : /^(cr|sèch|sec)/.test(s) ? 'cru' : 'cuit';
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());
const dayName = s => parseIso(s).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
const shortDate = s => parseIso(s).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (v, t) => t > 0 ? Math.min(100, v / t * 100) : 0;

let toastT;
function toast(msg, err = false) {
  const t = $('toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function fail(e) { console.error(e); toast('Erreur : ' + (e.message || e), true); }

const MEALS = [['pdj', 'Petit-déjeuner', '🥣'], ['dej', 'Déjeuner', '🍽️'], ['col', 'Collation', '🍎'], ['din', 'Dîner', '🌙']];
const mealOptions = sel => MEALS.map(([k, n, e]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${e} ${n}</option>`).join('');
const guessMeal = () => { const h = new Date().getHours(); return h < 11 ? 'pdj' : h < 15 ? 'dej' : h < 18 ? 'col' : 'din'; };

/* ========== Base d'aliments ========== */
const BASE = [];
CATS.forEach(c => c.items.forEach(([n, s, p, g, l]) => {
  const P = num(p), G = num(g), L = num(l);
  BASE.push({key: 'c' + BASE.length, n, s, p, g, l, P, G, L, K: kcalOf(P, G, L), em: c.em, cat: c.id, label: n + (s ? ' (' + s + ')' : '')});
}));
const findBase = (n, s) => BASE.find(f => f.n === n && f.s === s);
let FOODS = BASE.slice();
function rebuildFoods() {
  FOODS = BASE.concat(state.custom.map(c => ({
    key: 'u' + c.id, n: c.name, s: '', P: +c.p100, G: +c.g100, L: +c.l100, K: +c.kcal100, em: '🏷️', custom: true, label: c.name
  })));
  FOODS.forEach(f => f.k = norm(f.label));
}

/* ========== État ========== */
const state = {settings: {...DEFAULT_SETTINGS}, date: today(), dayType: 'repos', entries: [], weights: [], custom: []};
let sb = null;

const target = () => {
  const s = state.settings, sport = state.dayType === 'sport';
  return {K: sport ? s.kcal_sport : s.kcal_rest, P: s.protein, G: sport ? s.carbs_sport : s.carbs_rest, L: s.fat};
};
const entryVals = e => { const r = e.grams / 100; return {K: e.kcal100 * r, P: e.p100 * r, G: e.g100 * r, L: e.l100 * r}; };
const sumVals = list => list.reduce((a, e) => { const v = entryVals(e); a.K += v.K; a.P += v.P; a.G += v.G; a.L += v.L; return a; }, {K: 0, P: 0, G: 0, L: 0});
const entryFromFood = (f, grams, meal, date) => ({date, meal, name: f.label.slice(0, 120), grams, p100: f.P, g100: f.G, l100: f.L, kcal100: Math.round(f.K * 10) / 10});

/* ========== Démarrage ========== */
// Pas de connexion : toutes les données appartiennent à un seul « propriétaire » fixe.
const OWNER = '00000000-0000-0000-0000-000000000001';
let started = false;

function screen(id) {
  ['scrLoading', 'scrConfig'].forEach(s => $(s).classList.toggle('hidden', s !== id));
  $('app').classList.toggle('hidden', id !== 'app');
  document.body.classList.toggle('in-app', id === 'app');
}

function boot() {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || !window.supabase) { screen('scrConfig'); return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
  start();
}

async function start() {
  screen('scrLoading');
  try {
    const [st, cu, wt] = await Promise.all([
      sb.from('settings').select('*').eq('user_id', OWNER).maybeSingle(),
      sb.from('custom_foods').select('*').order('name'),
      sb.from('weights').select('date,kg').order('date')
    ]);
    if (st.error) throw st.error; if (cu.error) throw cu.error; if (wt.error) throw wt.error;
    if (st.data) state.settings = st.data;
    else {
      const ins = await sb.from('settings').insert({user_id: OWNER}).select().single();
      if (ins.error) throw ins.error;
      state.settings = ins.data;
    }
    state.custom = cu.data;
    state.weights = wt.data.map(w => ({date: w.date, kg: +w.kg}));
    rebuildFoods(); renderFoodsCustomNote();
    started = true;
    screen('app');
    renderPlan();
    route();
    await loadDay();
  } catch (e) {
    console.error(e);
    $('scrLoading').innerHTML = '<div class="card"><h1>😕 Oups</h1><p>Impossible de charger les données : ' + esc(e.message || e) + '</p><button class="btn primary" onclick="location.reload()">Réessayer</button></div>';
  }
}

/* ========== Navigation par onglets ========== */
const TABS = ['journal', 'bilan', 'poids', 'plan', 'aliments'];
function route() {
  const t = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'journal';
  TABS.forEach(x => $('v-' + x).classList.toggle('hidden', x !== t));
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === t));
  if (t === 'poids') renderWeights();
  if (t === 'bilan') renderBilan();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => { if (started) route(); });

/* ========== JOURNAL ========== */
async function loadDay() {
  const d = state.date;
  renderDayBar();
  $('meals').innerHTML = '<p class="muted" style="text-align:center;margin-top:24px"><span class="spinner"></span></p>';
  try {
    const [dy, en] = await Promise.all([
      sb.from('days').select('day_type').eq('date', d).maybeSingle(),
      sb.from('entries').select('*').eq('date', d).order('created_at')
    ]);
    if (dy.error) throw dy.error; if (en.error) throw en.error;
    if (d !== state.date) return; // l'utilisateur a changé de jour entre-temps
    state.dayType = dy.data ? dy.data.day_type : 'repos';
    state.entries = en.data.map(e => ({...e, grams: +e.grams, p100: +e.p100, g100: +e.g100, l100: +e.l100, kcal100: +e.kcal100}));
    renderJournal();
  } catch (e) { fail(e); }
}

function renderDayBar() {
  const d = state.date, t = today();
  const sub = d === t ? 'aujourd’hui' : d === addDays(t, -1) ? 'hier' : d === addDays(t, 1) ? 'demain' : 'changer de date';
  $('dLabel').innerHTML = `${cap(dayName(d))}<small>📅 ${sub}</small><input type="date" id="dPick" value="${d}">`;
}

function renderJournal() {
  renderDayBar();
  renderQuickWeigh();
  const s = state.settings;
  $('tRest').textContent = fr0(s.kcal_rest) + ' kcal';
  $('tSport').textContent = fr0(s.kcal_sport) + ' kcal';
  document.querySelectorAll('#dType button').forEach(b => b.classList.toggle('on', b.dataset.t === state.dayType));
  renderSummary();

  const tplK = sumVals(templateEntries(state.dayType)).K;
  $('tpl').innerHTML = state.entries.length ? '' : `<div class="tplbox"><p>📋 Journée vide. Tu peux partir de la journée type « ${state.dayType === 'sport' ? 'crosstraining' : 'sans sport'} » (≈ ${fr0(tplK)} kcal) puis ajuster.</p><button class="btn primary small" id="fillTpl">Remplir avec la journée type</button></div>`;

  $('meals').innerHTML = MEALS.map(([k, n, em]) => {
    const list = state.entries.filter(e => e.meal === k);
    const tot = sumVals(list);
    const rows = list.map(e => {
      const v = entryVals(e);
      return `<div class="entry" data-id="${e.id}">
        <div class="nm">${esc(e.name)}<small>P ${fr(v.P)} · G ${fr(v.G)} · L ${fr(v.L)}</small></div>
        <input type="number" class="eg" value="${+e.grams}" min="0" max="5000" inputmode="decimal" aria-label="Grammes"><span class="kc">${fr0(v.K)} kcal</span>
        <button class="del" title="Supprimer" aria-label="Supprimer">✕</button></div>`;
    }).join('');
    return `<div class="card meal"><div class="meal-head"><span style="font-size:1.4rem">${em}</span><h3>${n}</h3><span class="k">${fr0(tot.K)} kcal</span></div>
      ${rows || '<div class="empty">Rien pour l’instant</div>'}
      <div class="meal-foot"><button class="btn small" data-add="${k}">＋ Ajouter</button></div></div>`;
  }).join('');
}

function renderSummary() {
  const t = target(), v = sumVals(state.entries), left = t.K - v.K;
  const macro = (lab, cls, col, val, tg) => `<div class="macro"><div class="lab ${cls}">${lab}</div><b>${fr0(val)}</b> <small>/ ${tg} g</small>
    <div class="bar"><div style="width:${pct(val, tg)}%;background:${col}"></div></div></div>`;
  $('sum').innerHTML = `<div class="top"><div class="big">${fr0(v.K)} <small>/ ${fr0(t.K)} kcal</small></div>
    <div class="left">${left >= 0 ? `Il reste <span class="ck">${fr0(left)} kcal</span>` : `<span class="cp">+${fr0(-left)} kcal</span> au-dessus de la cible`}</div></div>
    <div class="bar${v.K > t.K * 1.03 ? ' over' : ''}"><div style="width:${pct(v.K, t.K)}%;background:var(--k)"></div></div>
    <div class="macros">${macro('Protéines', 'cp', 'var(--p)', v.P, t.P)}${macro('Glucides', 'cg', 'var(--g)', v.G, t.G)}${macro('Lipides', 'cl', 'var(--l)', v.L, t.L)}</div>`;
}

function templateEntries(type) {
  const out = [];
  MEALS.forEach(([k]) => TEMPLATES[type][k].forEach(([n, s, g]) => {
    const f = findBase(n, s); if (f) out.push(entryFromFood(f, g, k, state.date));
  }));
  return out;
}

async function insertEntries(rows) {
  const {data, error} = await sb.from('entries').insert(rows).select();
  if (error) throw error;
  data.forEach(e => state.entries.push({...e, grams: +e.grams, p100: +e.p100, g100: +e.g100, l100: +e.l100, kcal100: +e.kcal100}));
}

$('dPrev').addEventListener('click', () => { state.date = addDays(state.date, -1); loadDay(); });
$('dNext').addEventListener('click', () => { state.date = addDays(state.date, 1); loadDay(); });
$('dLabel').addEventListener('click', e => {
  const p = $('dPick'); if (e.target === p) return;
  try { p.showPicker(); } catch { p.focus(); p.click(); }
});
$('dLabel').addEventListener('change', e => { if (e.target.id === 'dPick' && e.target.value) { state.date = e.target.value; loadDay(); } });

$('dType').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || b.dataset.t === state.dayType) return;
  const prev = state.dayType; state.dayType = b.dataset.t; renderJournal();
  const {error} = await sb.from('days').upsert({user_id: OWNER, date: state.date, day_type: state.dayType});
  if (error) { state.dayType = prev; renderJournal(); fail(error); }
});

$('tpl').addEventListener('click', async e => {
  if (e.target.id !== 'fillTpl') return;
  e.target.disabled = true;
  try { await insertEntries(templateEntries(state.dayType)); renderJournal(); toast('Journée type ajoutée ✔'); }
  catch (er) { e.target.disabled = false; fail(er); }
});

$('meals').addEventListener('click', async e => {
  const add = e.target.closest('[data-add]');
  if (add) return openAdd(add.dataset.add);
  if (e.target.closest('.del')) {
    const id = +e.target.closest('.entry').dataset.id;
    const {error} = await sb.from('entries').delete().eq('id', id);
    if (error) return fail(error);
    state.entries = state.entries.filter(x => x.id !== id); renderJournal();
  }
});
$('meals').addEventListener('change', async e => {
  if (!e.target.classList.contains('eg')) return;
  const id = +e.target.closest('.entry').dataset.id, en = state.entries.find(x => x.id === id);
  const g = Math.max(0, Math.min(5000, parseFloat(String(e.target.value).replace(',', '.')) || 0));
  const {error} = await sb.from('entries').update({grams: g}).eq('id', id);
  if (error) return fail(error);
  en.grams = g; renderJournal();
});

/* ---- Modal d'ajout ---- */
let pick = null;
function openModal(id) { $(id).classList.add('open'); }
function closeModals() { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModals(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });

function openAdd(meal) {
  $('addMeal').innerHTML = mealOptions(meal);
  $('addSearch').classList.remove('hidden'); $('customForm').classList.add('hidden');
  $('addQ').value = ''; pick = null; $('addPick').classList.add('hidden');
  searchAdd(); openModal('addModal'); setTimeout(() => $('addQ').focus(), 50);
}
function searchAdd() {
  const q = norm($('addQ').value.trim());
  const words = q.split(/\s+/).filter(Boolean);
  let list = FOODS.filter(f => words.every(w => f.k.includes(w)));
  list.sort((a, b) => (!!b.custom - !!a.custom) || (a.k.startsWith(q) ? -1 : 0) - (b.k.startsWith(q) ? -1 : 0));
  list = list.slice(0, 40);
  $('addRes').innerHTML = list.length ? list.map(f => `<li data-key="${f.key}"${pick && pick.key === f.key ? ' class="sel"' : ''}><span>${f.em} ${esc(f.label)}${f.custom ? '<span class="cu">perso</span>' : ''}</span><small>${fr0(f.K)} kcal/100 g</small></li>`).join('')
    : '<li style="cursor:default"><span class="muted">Aucun résultat. Crée un aliment perso ⬇</span></li>';
}
function selectFood(f, grams = 100) {
  pick = f; $('addPick').classList.remove('hidden'); $('addName').textContent = f.em + ' ' + f.label;
  $('addG').value = grams; updAddPrev(); searchAdd();
  setTimeout(() => { $('addG').focus(); $('addG').select(); }, 30);
}
function resBoxes(f, g) {
  const r = g / 100;
  return `<div><b class="ck">${fr0(f.K * r)}</b><small>kcal</small></div><div><b class="cp">${fr(f.P * r)}</b><small>prot. (g)</small></div>
    <div><b class="cg">${fr(f.G * r)}</b><small>gluc. (g)</small></div><div><b class="cl">${fr(f.L * r)}</b><small>lip. (g)</small></div>`;
}
const gramsOf = el => Math.max(0, Math.min(5000, parseFloat(String(el.value).replace(',', '.')) || 0));
function updAddPrev() { if (pick) $('addPrev').innerHTML = resBoxes(pick, gramsOf($('addG'))); }
$('addQ').addEventListener('input', searchAdd);
$('addRes').addEventListener('click', e => { const li = e.target.closest('li[data-key]'); if (li) selectFood(FOODS.find(f => f.key === li.dataset.key)); });
$('addG').addEventListener('input', updAddPrev);
$('addG').addEventListener('keydown', e => { if (e.key === 'Enter') $('addOk').click(); });
$('addOk').addEventListener('click', async () => {
  const g = gramsOf($('addG')); if (!pick || !g) return;
  $('addOk').disabled = true;
  try {
    await insertEntries([entryFromFood(pick, g, $('addMeal').value, state.date)]);
    renderJournal(); toast(`${pick.label} ajouté ✔`);
    pick = null; $('addPick').classList.add('hidden'); $('addQ').value = ''; searchAdd(); $('addQ').focus();
  } catch (e) { fail(e); } finally { $('addOk').disabled = false; }
});
$('toCustom').addEventListener('click', () => {
  $('addSearch').classList.add('hidden'); $('customForm').classList.remove('hidden');
  $('customForm').reset(); $('cName').value = $('addQ').value; $('cName').focus();
});
$('cBack').addEventListener('click', () => { $('customForm').classList.add('hidden'); $('addSearch').classList.remove('hidden'); });
$('customForm').addEventListener('submit', async e => {
  e.preventDefault();
  const v = id => parseFloat(String($(id).value).replace(',', '.')) || 0;
  const P = v('cP'), G = v('cG'), L = v('cL');
  const K = $('cK').value === '' ? kcalOf(P, G, L) : v('cK');
  const {data, error} = await sb.from('custom_foods').insert({name: $('cName').value.trim(), p100: P, g100: G, l100: L, kcal100: K}).select().single();
  if (error) return fail(error);
  state.custom.push(data); rebuildFoods(); renderFoodsCustomNote();
  $('customForm').classList.add('hidden'); $('addSearch').classList.remove('hidden');
  $('addQ').value = data.name; selectFood(FOODS.find(f => f.key === 'u' + data.id));
  toast('Aliment perso enregistré ✔');
});

/* ========== POIDS ========== */
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
function avg7(end) {
  const start = addDays(end, -6);
  const v = state.weights.filter(w => w.date >= start && w.date <= end).map(w => w.kg);
  return v.length >= 3 ? mean(v) : null;
}
function renderWeights() {
  if (!$('wDate').value) $('wDate').value = today();
  const W = state.weights, t = today();
  // Verdict selon la règle du plan
  const a0 = avg7(t), a1 = avg7(addDays(t, -7)), a3 = avg7(addDays(t, -21));
  let v;
  if (a0 == null || a1 == null) {
    v = ['info', '🗓️', 'Pas encore assez de pesées', 'Il faut au moins 3 pesées sur chacune des deux dernières semaines pour comparer les moyennes. Continue à te peser le matin !'];
  } else {
    const loss = a1 - a0;
    const stuck = a3 != null && (a3 - a0) < 0.15;
    if (loss > 0.5) v = ['warn', '⚡', `Baisse rapide : −${fr(loss)} kg en une semaine`, 'Si ça dure, ajoute 100 à 150 kcal par jour (onglet « Mon plan »).'];
    else if (loss >= 0.3) v = ['good', '🎉', `Dans la cible : −${fr(loss)} kg en une semaine`, 'Une baisse de 300 à 450 g par semaine, c’est exactement le rythme visé. On continue !'];
    else if (stuck) v = ['warn', '🔍', 'Poids stable depuis 3 semaines', 'Vérifie d’abord les portions (pesée crue ou cuite ?) et l’activité. Si tout est régulier, baisse les cibles d’environ 100 kcal par jour.'];
    else if (loss > 0) v = ['info', '🐢', `Baisse lente : −${fr(loss)} kg en une semaine`, 'Ça descend, mais doucement. On juge sur 2 à 3 semaines avant d’ajuster.'];
    else v = ['info', '↔️', `Moyenne ${loss === 0 ? 'stable' : `en hausse de ${fr(-loss)} kg`} cette semaine`, 'Une semaine ne suffit pas : l’eau et le sel font varier le poids. On regarde la tendance sur 2 à 3 semaines.'];
  }
  $('wVerdict').innerHTML = `<div class="card verdict ${v[0]}"><span class="ic">${v[1]}</span><div><h3>${v[2]}</h3><p>${v[3]}</p></div></div>`;

  // Stats
  if (W.length) {
    const first = W[0], last = W[W.length - 1], d = last.kg - first.kg;
    $('wStats').innerHTML = `<div class="stat"><b>${fr(last.kg)}</b><small>dernière pesée (kg)</small></div>
      <div class="stat"><b>${a0 != null ? fr(a0) : '–'}</b><small>moyenne 7 jours</small></div>
      <div class="stat"><b class="${d <= 0 ? 'cl' : 'cp'}">${d > 0 ? '+' : d < 0 ? '−' : ''}${fr(Math.abs(d))}</b><small>depuis le ${shortDate(first.date)}</small></div>`;
  } else $('wStats').innerHTML = '';

  renderChart();
  $('wList').innerHTML = W.length ? W.slice(-21).reverse().map(w => `<li><span class="d">${cap(dayName(w.date))}</span><span>${fr(w.kg)} kg <button class="del btn small ghost" data-d="${w.date}" aria-label="Supprimer" style="margin-left:8px">✕</button></span></li>`).join('')
    : '<li class="muted">Aucune pesée pour l’instant.</li>';
}

function renderChart() {
  const W = state.weights.slice(-120);
  if (W.length < 2) { $('wChart').innerHTML = '<p class="muted" style="margin:0;text-align:center">📈 La courbe apparaîtra à partir de 2 pesées.</p>'; return; }
  const w = 640, h = 240, m = {l: 44, r: 14, t: 14, b: 28};
  const t0 = parseIso(W[0].date).getTime(), t1 = parseIso(W[W.length - 1].date).getTime();
  const span = Math.max(1, t1 - t0);
  const avgs = W.map(p => ({date: p.date, kg: mean(state.weights.filter(x => x.date <= p.date && x.date >= addDays(p.date, -6)).map(x => x.kg))}));
  const all = W.map(p => p.kg);
  let lo = Math.floor(Math.min(...all) - 0.5), hi = Math.ceil(Math.max(...all) + 0.5);
  if (hi - lo < 2) hi = lo + 2;
  const X = d => m.l + (parseIso(d).getTime() - t0) / span * (w - m.l - m.r);
  const Y = kg => m.t + (hi - kg) / (hi - lo) * (h - m.t - m.b);
  const step = (hi - lo) > 8 ? 2 : 1;
  let grid = '';
  for (let k = lo; k <= hi; k += step) grid += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(k)}" y2="${Y(k)}" stroke="var(--line)" stroke-width="1.5"/><text x="${m.l - 8}" y="${Y(k) + 4}" text-anchor="end" font-size="12" fill="var(--muted)" font-weight="700">${k}</text>`;
  const path = avgs.map((p, i) => `${i ? 'L' : 'M'}${X(p.date).toFixed(1)},${Y(p.kg).toFixed(1)}`).join('');
  const dots = W.map(p => `<circle cx="${X(p.date).toFixed(1)}" cy="${Y(p.kg).toFixed(1)}" r="4" fill="var(--g)" stroke="var(--ink)" stroke-width="1.5"><title>${shortDate(p.date)} : ${fr(p.kg)} kg</title></circle>`).join('');
  $('wChart').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Courbe du poids">
    ${grid}
    <path d="${path}" fill="none" stroke="var(--k)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${m.l}" y="${h - 6}" font-size="12" fill="var(--muted)" font-weight="700">${shortDate(W[0].date)}</text>
    <text x="${w - m.r}" y="${h - 6}" font-size="12" fill="var(--muted)" font-weight="700" text-anchor="end">${shortDate(W[W.length - 1].date)}</text>
  </svg><div class="lg"><span><i style="background:var(--g)"></i>Pesée du matin</span><span><i style="background:var(--k)"></i>Moyenne sur 7 jours</span></div>`;
}

async function saveWeight(date, raw) {
  const kg = Math.round(parseFloat(String(raw).replace(',', '.')) * 100) / 100;
  if (!date || !(kg >= 20 && kg <= 400)) { toast('Poids invalide (ex. 81,4)', true); return false; }
  const {error} = await sb.from('weights').upsert({user_id: OWNER, date, kg});
  if (error) { fail(error); return false; }
  state.weights = state.weights.filter(w => w.date !== date).concat({date, kg}).sort((a, b) => a.date < b.date ? -1 : 1);
  toast(`Pesée enregistrée : ${fr(kg)} kg ✔`);
  return true;
}
const weightOn = d => state.weights.find(w => w.date === d);

$('wForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (await saveWeight($('wDate').value, $('wKg').value)) { $('wKg').value = ''; renderWeights(); }
});

/* Pesée rapide depuis le journal */
function renderQuickWeigh() {
  const w = weightOn(state.date);
  $('qWLabel').textContent = state.date === today() ? 'Pesée du matin' : 'Pesée du ' + shortDate(state.date);
  $('qKg').value = '';
  $('qKg').placeholder = w ? fr(w.kg) : (state.weights.length ? fr(state.weights[state.weights.length - 1].kg) : '81,8');
  $('qWNow').innerHTML = w ? `✔ <b>${fr(w.kg)} kg</b> enregistré` : '<span class="muted">pas encore pesé</span>';
}
$('qW').addEventListener('submit', async e => {
  e.preventDefault();
  if (await saveWeight(state.date, $('qKg').value)) renderQuickWeigh();
});

/* ========== BILAN DE LA SEMAINE ========== */
const MAINT = {repos: 2290, sport: 2690}; // dépense de maintien estimée (PDF)
const mondayOf = s => { const d = parseIso(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
state.week = mondayOf(today());

async function renderBilan() {
  const mon = state.week, sun = addDays(mon, 6), t = today();
  const days7 = [...Array(7)].map((_, i) => addDays(mon, i));
  const fmt = s => parseIso(s).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long'});
  const sameM = parseIso(mon).getMonth() === parseIso(sun).getMonth();
  const range = sameM ? `${parseIso(mon).getDate()} au ${fmt(sun)}` : `${fmt(mon)} au ${fmt(sun)}`;
  $('bLabel').innerHTML = `Du ${range}<small>📅 ${mon === mondayOf(t) ? 'cette semaine' : mon === addDays(mondayOf(t), -7) ? 'semaine dernière' : 'semaine passée'}</small>`;
  $('bNext').disabled = mon >= mondayOf(t);
  $('bBody').innerHTML = '<p class="muted" style="text-align:center"><span class="spinner"></span></p>';
  let en, dy;
  try {
    [en, dy] = await Promise.all([
      sb.from('entries').select('date,grams,p100,g100,l100,kcal100').gte('date', mon).lte('date', sun),
      sb.from('days').select('date,day_type').gte('date', mon).lte('date', sun)
    ]);
    if (en.error) throw en.error; if (dy.error) throw dy.error;
  } catch (e) { $('bBody').innerHTML = ''; return fail(e); }
  if (mon !== state.week) return;

  const s = state.settings;
  const rows = days7.map(d => {
    const type = (dy.data.find(x => x.date === d) || {}).day_type || 'repos';
    const list = en.data.filter(e => e.date === d).map(e => ({grams: +e.grams, p100: +e.p100, g100: +e.g100, l100: +e.l100, kcal100: +e.kcal100}));
    const v = sumVals(list);
    const tgt = type === 'sport' ? s.kcal_sport : s.kcal_rest;
    return {d, type, logged: list.length > 0, v, tgt, future: d > t};
  });
  const logged = rows.filter(r => r.logged);
  const n = logged.length;
  const avg = k => n ? logged.reduce((a, r) => a + r.v[k], 0) / n : 0;
  const onTarget = logged.filter(r => Math.abs(r.v.K - r.tgt) <= r.tgt * 0.1).length;
  const sportDays = rows.filter(r => r.type === 'sport').length;
  const deficit = logged.reduce((a, r) => a + (MAINT[r.type] - r.v.K), 0);
  const vsTarget = logged.reduce((a, r) => a + (r.v.K - r.tgt), 0);

  // Poids de la semaine
  const wk = state.weights.filter(w => w.date >= mon && w.date <= sun);
  const wkPrev = state.weights.filter(w => w.date >= addDays(mon, -7) && w.date < mon);
  const wAvg = wk.length ? mean(wk.map(w => w.kg)) : null, wPrev = wkPrev.length ? mean(wkPrev.map(w => w.kg)) : null;
  const wDiff = wAvg != null && wPrev != null ? wAvg - wPrev : null;

  // Message de synthèse
  const msgs = [];
  if (!n) msgs.push(['info', '📝', 'Aucun repas saisi cette semaine', 'Remplis le journal pour obtenir un bilan.']);
  else {
    if (vsTarget > 0 && vsTarget / n > 150) msgs.push(['warn', '🍕', `En moyenne +${fr0(vsTarget / n)} kcal par jour au-dessus de la cible`, 'Regarde les jours en rouge dans le tableau pour voir où ça coince.']);
    else if (vsTarget < 0 && -vsTarget / n > 250) msgs.push(['warn', '🥗', `En moyenne ${fr0(-vsTarget / n)} kcal par jour sous la cible`, 'Attention à ne pas trop manger peu : ça fatigue et ça fait perdre du muscle, surtout avec le crosstraining.']);
    else msgs.push(['good', '🎯', 'Apports proches de la cible', `${onTarget} jour${onTarget > 1 ? 's' : ''} sur ${n} à ±10 % de la cible. Bravo !`]);
    if (avg('P') < s.protein * 0.85) msgs.push(['warn', '🍗', `Protéines un peu justes : ${fr0(avg('P'))} g par jour en moyenne`, `L’objectif est ${s.protein} g : ajoute du skyr, du poulet, du thon ou des œufs.`]);
  }
  if (wDiff != null) {
    const loss = -wDiff;
    msgs.push(loss > 0.5 ? ['warn', '⚡', `Poids moyen −${fr(loss)} kg par rapport à la semaine d’avant`, 'C’est rapide : si ça dure, ajoute 100 à 150 kcal par jour.']
      : loss >= 0.3 ? ['good', '📉', `Poids moyen −${fr(loss)} kg par rapport à la semaine d’avant`, 'Pile dans le rythme visé (300 à 450 g par semaine).']
      : loss > 0 ? ['info', '🐢', `Poids moyen −${fr(loss)} kg par rapport à la semaine d’avant`, 'Ça descend doucement, on juge sur 2 à 3 semaines.']
      : ['info', '↔️', `Poids moyen ${loss === 0 ? 'stable' : '+' + fr(-loss) + ' kg'} par rapport à la semaine d’avant`, 'Une semaine ne suffit pas pour conclure (eau, sel). On regarde la tendance.']);
  } else if (!wk.length) msgs.push(['info', '⚖️', 'Aucune pesée cette semaine', 'Pèse-toi le matin, au moins 3 fois par semaine, pour suivre la tendance.']);

  // Graphique en barres
  const W = 640, H = 220, ml = 40, mr = 10, mt = 14, mb = 34;
  const maxK = Math.max(2800, ...rows.map(r => r.v.K), ...rows.map(r => r.tgt)) * 1.05;
  const bw = (W - ml - mr) / 7;
  const Y = k => mt + (1 - k / maxK) * (H - mt - mb);
  let grid = '';
  for (let k = 0; k <= maxK; k += 500) grid += `<line x1="${ml}" x2="${W - mr}" y1="${Y(k)}" y2="${Y(k)}" stroke="var(--line)" stroke-width="1.2"/><text x="${ml - 6}" y="${Y(k) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-weight="700">${k}</text>`;
  const bars = rows.map((r, i) => {
    const x = ml + i * bw + bw * 0.18, w = bw * 0.64;
    const over = r.v.K > r.tgt * 1.1, col = !r.logged ? 'none' : over ? 'var(--p)' : 'var(--k)';
    const lbl = parseIso(r.d).toLocaleDateString('fr-FR', {weekday: 'short'}).replace('.', '');
    return `${r.logged ? `<rect x="${x}" y="${Y(r.v.K)}" width="${w}" height="${Y(0) - Y(r.v.K)}" rx="6" fill="${col}" stroke="var(--ink)" stroke-width="2"><title>${fr0(r.v.K)} kcal / ${fr0(r.tgt)}</title></rect>` : ''}
      <line x1="${x - 4}" x2="${x + w + 4}" y1="${Y(r.tgt)}" y2="${Y(r.tgt)}" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="5 3"/>
      <text x="${x + w / 2}" y="${H - 16}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink)">${lbl}</text>
      <text x="${x + w / 2}" y="${H - 3}" text-anchor="middle" font-size="11">${r.type === 'sport' ? '🏋️' : ''}</text>`;
  }).join('');

  const tbl = rows.map(r => {
    const diff = r.v.K - r.tgt, cls = !r.logged ? 'muted' : Math.abs(diff) <= r.tgt * 0.1 ? 'cl' : diff > 0 ? 'cp' : 'cg';
    return `<tr data-d="${r.d}"><td>${cap(parseIso(r.d).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric'}))} ${r.type === 'sport' ? '🏋️' : ''}</td>
      <td>${r.logged ? fr0(r.v.K) : '–'}</td><td>${r.logged ? fr0(r.v.P) : '–'}</td><td class="hide-s">${r.logged ? fr0(r.v.G) : '–'}</td><td class="hide-s">${r.logged ? fr0(r.v.L) : '–'}</td>
      <td class="${cls}"><b>${r.logged ? (diff > 0 ? '+' : '') + fr0(diff) : r.future ? '' : '–'}</b></td>
      <td>${weightOn(r.d) ? fr(weightOn(r.d).kg) : ''}</td></tr>`;
  }).join('');

  $('bBody').innerHTML = `
    <div class="stats bstats">
      <div class="stat"><b class="ck">${n ? fr0(avg('K')) : '–'}</b><small>kcal / jour en moyenne</small></div>
      <div class="stat"><b class="cp">${n ? fr0(avg('P')) : '–'}</b><small>g de protéines / jour</small></div>
      <div class="stat"><b>${n}/7</b><small>jour${n > 1 ? 's' : ''} saisi${n > 1 ? 's' : ''}</small></div>
      <div class="stat"><b>${onTarget}</b><small>jour${onTarget > 1 ? 's' : ''} dans la cible (±10 %)</small></div>
      <div class="stat"><b>${sportDays}/3</b><small>séances crosstraining</small></div>
      <div class="stat"><b class="${deficit >= 0 ? 'cl' : 'cp'}">${n ? (deficit >= 0 ? '−' : '+') + fr0(Math.abs(deficit)) : '–'}</b><small>kcal vs maintien${n ? ` ≈ ${fr(Math.abs(deficit) / 7700 * 1000, 0)} g de gras` : ''}</small></div>
    </div>
    ${msgs.map(m => `<div class="card verdict ${m[0]}"><span class="ic">${m[1]}</span><div><h3>${m[2]}</h3><p>${m[3]}</p></div></div>`).join('')}
    <div class="card chart"><h3 style="margin:0 0 8px">🔥 Calories par jour</h3>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Calories par jour de la semaine">${grid}${bars}</svg>
      <div class="lg"><span><i style="background:var(--k)"></i>Consommé</span><span><i style="background:var(--p)"></i>Plus de 10 % au-dessus</span><span>┅ Cible du jour</span></div></div>
    <div class="card" style="margin-top:18px;padding:0;overflow:hidden">
      <table class="ptable btable"><thead><tr><th>Jour</th><th>kcal</th><th>Prot.</th><th class="hide-s">Gluc.</th><th class="hide-s">Lip.</th><th>Écart</th><th>Poids</th></tr></thead><tbody>${tbl}</tbody></table>
      <p class="muted" style="margin:0;padding:10px 14px;font-size:.85rem">👆 Clique sur un jour pour ouvrir son journal.</p></div>
    <div class="stats" style="margin-top:18px">
      <div class="stat"><b>${wAvg != null ? fr(wAvg) : '–'}</b><small>poids moyen (${wk.length} pesée${wk.length > 1 ? 's' : ''})</small></div>
      <div class="stat"><b>${wPrev != null ? fr(wPrev) : '–'}</b><small>semaine d’avant</small></div>
      <div class="stat"><b class="${wDiff == null ? '' : wDiff <= 0 ? 'cl' : 'cp'}">${wDiff == null ? '–' : (wDiff > 0 ? '+' : wDiff < 0 ? '−' : '') + fr(Math.abs(wDiff))}</b><small>écart (kg)</small></div>
    </div>`;
}
$('bPrev').addEventListener('click', () => { state.week = addDays(state.week, -7); renderBilan(); });
$('bNext').addEventListener('click', () => { if (state.week < mondayOf(today())) { state.week = addDays(state.week, 7); renderBilan(); } });
$('bBody').addEventListener('click', e => {
  const tr = e.target.closest('tr[data-d]'); if (!tr) return;
  state.date = tr.dataset.d; location.hash = '#journal'; loadDay();
});
$('wList').addEventListener('click', async e => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const {error} = await sb.from('weights').delete().eq('date', b.dataset.d);
  if (error) return fail(error);
  state.weights = state.weights.filter(w => w.date !== b.dataset.d); renderWeights();
});

/* ========== PLAN ========== */
const SKEYS = ['kcal_rest', 'kcal_sport', 'protein', 'carbs_rest', 'carbs_sport', 'fat'];
function renderPlan() {
  const s = state.settings;
  const mR = 2290, mS = 2690;
  $('pTable').innerHTML = `<thead><tr><th>Repère quotidien</th><th>Sans sport · 4 j</th><th>Crosstraining · 3 j</th></tr></thead><tbody>
    <tr><td>Dépense de maintien estimée</td><td>${fr0(mR)} kcal</td><td>${fr0(mS)} kcal</td></tr>
    <tr><td><b>Apport cible</b></td><td><b>${fr0(s.kcal_rest)} kcal</b></td><td><b>${fr0(s.kcal_sport)} kcal</b></td></tr>
    <tr><td>Déficit visé</td><td>${fr0(mR - s.kcal_rest)} kcal</td><td>${fr0(mS - s.kcal_sport)} kcal</td></tr>
    <tr><td>Protéines</td><td>${s.protein} g</td><td>${s.protein} g</td></tr>
    <tr><td>Glucides</td><td>${s.carbs_rest} g</td><td>${s.carbs_sport} g</td></tr>
    <tr><td>Lipides</td><td>${s.fat} g</td><td>${s.fat} g</td></tr></tbody>`;

  $('pDays').innerHTML = [['repos', '🛋️ Jour sans sport'], ['sport', '🏋️ Jour crosstraining']].map(([type, title]) => {
    const all = templateEntries(type), tot = sumVals(all);
    const meals = MEALS.map(([k, n]) => {
      const list = all.filter(e => e.meal === k);
      return `<h4>${n} <span class="muted" style="font-size:.85rem">· ${fr0(sumVals(list).K)} kcal</span></h4><ul>${list.map(e => `<li><span>${esc(e.name)}</span><span>${e.grams} g</span></li>`).join('')}</ul>`;
    }).join('');
    return `<div class="card dayc"><h3>${title}</h3>
      <div class="tot"><div><b>${fr0(tot.K)}</b>kcal</div><div><b class="cp">${fr0(tot.P)}</b>prot.</div><div><b class="cg">${fr0(tot.G)}</b>gluc.</div><div><b class="cl">${fr0(tot.L)}</b>lip.</div></div>
      ${meals}</div>`;
  }).join('');

  SKEYS.forEach(k => $('s_' + k).value = s[k]);
}
async function saveSettings(vals) {
  const {data, error} = await sb.from('settings').update({...vals, updated_at: new Date().toISOString()}).eq('user_id', OWNER).select().single();
  if (error) return fail(error);
  state.settings = data; renderPlan(); renderJournal(); toast('Cibles enregistrées ✔');
}
$('sForm').addEventListener('submit', e => {
  e.preventDefault();
  const vals = {}; SKEYS.forEach(k => vals[k] = Math.round(+$('s_' + k).value)); saveSettings(vals);
});
$('sReset').addEventListener('click', () => saveSettings({...DEFAULT_SETTINGS}));

/* ========== ALIMENTS (tableau d'origine) ========== */
const cell = (v, col) => `<td class="v${v === 'tr' ? ' tr' : ''}">${show(v)}<div class="b"><div style="width:${Math.min(100, num(v))}%;background:${col}"></div></div></td>`;
function renderFoods() {
  const sec = c => {
    const rows = BASE.filter(f => f.cat === c.id).map(f => `<tr data-key="${f.key}" data-k="${norm(f.n + ' ' + f.s)}"><td class="n">${f.n}${f.s ? ` <span class="st ${stClass(f.s)}">${f.s}</span>` : ''}<span class="kc">${fr0(f.K)} kcal</span></td>${cell(f.p, 'var(--p)')}${cell(f.g, 'var(--g)')}${cell(f.l, 'var(--l)')}</tr>`).join('');
    return `<section class="cat" id="${c.id}">
      <div class="cat-head"><span class="em">${c.em}</span><div><h2>${c.t}</h2><small>${c.items.length} aliments · valeurs pour 100 g</small></div></div>
      <div class="tbl"><table class="food">
        <thead><tr><th>${c.head || 'Aliment'}</th><th><span class="d" style="background:var(--p)"></span>Prot.</th><th><span class="d" style="background:var(--g)"></span>Gluc.</th><th><span class="d" style="background:var(--l)"></span>Lip.</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      ${c.id === 'feculents' ? '<p class="clickhint">👆 Clique sur un aliment pour calculer ta portion et l’ajouter au journal.</p>' : ''}
    </section>`;
  };
  const SWAP = `<div class="callout swap">
    <h3>🔄 Remplacer les pommes de terre</h3>
    <p>Pour remplacer les <b>300 g de pommes de terre cuites</b> du déjeuner en gardant environ <b>50 g de glucides</b>, tu peux prendre :</p>
    <div class="swaps">
      <div class="sw from"><div class="em">🥔</div><div class="gr">300 g</div><div class="t">pommes de terre cuites, c’est comme…</div></div>
      <div class="sw"><div class="em">🍚</div><div class="gr">65 g</div><div class="t">riz basmati cru</div></div>
      <div class="sw"><div class="em">🍚</div><div class="gr">150 g</div><div class="t">riz basmati cuit</div></div>
      <div class="sw"><div class="em">🍝</div><div class="gr">70 g</div><div class="t">pâtes sèches</div></div>
      <div class="sw"><div class="em">🍝</div><div class="gr">160 g</div><div class="t">pâtes cuites</div></div>
    </div>
    <p style="margin:0">💧 La quantité d'eau absorbée à la cuisson fait varier le poids cuit.</p></div>`;
  const CALC = `<div class="callout calc" id="calcul">
    <h3>🧮 Calculer n'importe quelle portion</h3>
    <p>Multiplie la valeur du tableau par le poids de la portion, puis divise par 100. Par exemple :</p>
    <div class="formula">170 g de filet de poulet cru × 23,4 ÷ 100 = <span class="r">environ 40 g de protéines</span></div>
    <p class="note">Pour le skyr, la purée de cacahuètes ou le thon en boîte, utilise les valeurs de l'emballage si elles diffèrent du tableau.</p></div>`;
  $('foods').innerHTML = CATS.map(c => sec(c) + (c.id === 'feculents' ? SWAP : '')).join('') + CALC + '<div id="customNote"></div><p class="noresult" id="nores">Aucun aliment trouvé 🤷</p>';
  $('toc').innerHTML = CATS.map(c => `<li><a href="#${c.id}">${c.em} ${c.t.split(/,| et /)[0]}</a></li>`).join('') + '<li><a href="#calcul">🧮 Calcul</a></li>';
}
function renderFoodsCustomNote() {
  const n = state.custom.length;
  if ($('customNote')) $('customNote').innerHTML = n ? `<div class="callout green"><h3>🏷️ Mes aliments perso</h3><p style="margin:0">${state.custom.map(c => esc(c.name) + ` <span class="muted">(${fr0(c.kcal100)} kcal/100 g)</span>`).join(' · ')}</p></div>` : '';
}
renderFoods();
// Les ancres du sommaire ne doivent pas changer d'onglet
$('toc').addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a) return;
  e.preventDefault(); const el = document.querySelector(a.getAttribute('href')); if (el) el.scrollIntoView({behavior: 'smooth'});
});
$('q').addEventListener('input', () => {
  const q = norm($('q').value.trim()); let any = false;
  document.querySelectorAll('#foods .cat').forEach(sec => {
    let vis = 0;
    sec.querySelectorAll('tbody tr').forEach(tr => { const ok = !q || tr.dataset.k.includes(q); tr.classList.toggle('none', !ok); if (ok) vis++; });
    sec.classList.toggle('none', vis === 0); if (vis) any = true;
  });
  document.querySelectorAll('#foods .callout').forEach(c => c.classList.toggle('none', !!q));
  $('nores').style.display = any ? 'none' : 'block';
});

let cur = null;
$('foods').addEventListener('click', e => {
  const tr = e.target.closest('tbody tr'); if (!tr) return;
  cur = BASE.find(f => f.key === tr.dataset.key);
  $('mEm').textContent = cur.em;
  $('mName').innerHTML = esc(cur.n) + (cur.s ? ` <span style="color:var(--muted);font-weight:500">(${esc(cur.s)})</span>` : '');
  $('mMeal').innerHTML = mealOptions(guessMeal());
  $('mAdd').textContent = state.date === today() ? 'Ajouter' : `Ajouter (${shortDate(state.date)})`;
  setG(100); openModal('calcModal'); $('mG').focus(); $('mG').select();
});
function setG(g) {
  g = Math.max(0, Math.min(2000, +String(g).replace(',', '.') || 0));
  $('mG').value = g; $('mR').value = Math.min(500, g);
  $('mRes').innerHTML = resBoxes(cur, g);
  $('mHow').innerHTML = `🧮 ${g} g × ${show(cur.p)} ÷ 100 = <b>${fr(cur.P * g / 100)} g de protéines</b><br>🔥 (${fr(cur.P)} × 4 + ${fr(cur.G)} × 4 + ${fr(cur.L)} × 9) × ${g} ÷ 100 ≈ <b>${fr0(cur.K * g / 100)} kcal</b>`;
}
$('mG').addEventListener('input', e => setG(e.target.value));
$('mR').addEventListener('input', e => setG(e.target.value));
$('mAdd').addEventListener('click', async () => {
  const g = +$('mG').value; if (!cur || !g) return;
  try {
    await insertEntries([entryFromFood(cur, g, $('mMeal').value, state.date)]);
    renderJournal(); closeModals(); toast(`${cur.label} ajouté au journal ✔`);
  } catch (e) { fail(e); }
});

/* ========== Go ========== */
boot();
