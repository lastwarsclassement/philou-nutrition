'use strict';
/* ========== Utilitaires ========== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => typeof v === 'number' ? v : v === 'tr' ? 0 : parseFloat(v.slice(1).replace(',', '.')) / 2;
const fr = (x, d = 1) => (+x).toLocaleString('fr-FR', {minimumFractionDigits: d, maximumFractionDigits: d});
const fr0 = x => Math.round(x).toLocaleString('fr-FR');
const show = v => typeof v === 'number' ? (Number.isInteger(v) && v >= 100 ? String(v) : (v === 0 ? '0' : fr(v))) : v === 'tr' ? 'Traces' : '< ' + v.slice(1);
const norm = s => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
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
const N_CURATED = BASE.length;
// Table Ciqual 2025 complète (ciqual.js) : kcal officielles du règlement UE 1169/2011
const GRP_EM = ['🍽️', '🥘', '🥕', '🍞', '🍖', '🧀', '🥤', '🍬', '🍨', '🧈', '🧂', '🍼'];
if (typeof CIQUAL !== 'undefined') CIQUAL.forEach(([n, gi, K, P, G, L]) => {
  BASE.push({key: 'q' + BASE.length, n, s: '', p: P, g: G, l: L, P, G, L, K, em: GRP_EM[gi] || '🍽️', cat: 'ciqual', grp: gi, ciqual: true, label: n});
});
BASE.forEach(f => f.k = norm(f.label));
const findBase = (n, s) => BASE.find(f => f.n === n && f.s === s && !f.ciqual);
/* Recherche : tous les mots doivent apparaître ; priorité aux aliments perso, puis à ceux du plan,
   puis aux noms qui commencent par la recherche, puis aux noms courts */
function searchFoods(list, query, limit) {
  const SYN = {coca: 'cola', coke: 'cola', nutella: 'pate a tartiner', burger: 'hamburger', pdt: 'pomme de terre', frite: 'frite', yogourt: 'yaourt', yoghourt: 'yaourt'};
  const q = norm(query.trim()), words = q.split(/[\s,]+/).filter(Boolean)
    .flatMap(w => (SYN[w] || w).split(' ')).map(w => w.length > 3 ? w.replace(/[sx]$/, '') : w);
  if (!words.length) return list.slice(0, limit);
  const atWordStart = f => words.every(w => (' ' + f.k.replace(/[(),%]/g, ' ')).includes(' ' + w));
  const rank = f => (atWordStart(f) ? 0 : 5000) + (f.custom ? 0 : f.ciqual ? 2 : 1) * 1000 + (f.k.startsWith(words[0]) ? 0 : 500) + Math.min(f.k.length, 400);
  return list.filter(f => words.every(w => f.k.includes(w))).sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
let FOODS = BASE.slice();
function rebuildFoods() {
  FOODS = BASE.concat(state.custom.map(c => ({
    key: 'u' + c.id, n: c.name, s: '', P: +c.p100, G: +c.g100, L: +c.l100, K: +c.kcal100, em: '🏷️', custom: true, label: c.name
  })));
  FOODS.forEach(f => { if (!f.k) f.k = norm(f.label); });
}

/* ========== État ========== */
const state = {user: null, settings: {...DEFAULT_SETTINGS}, date: today(), dayType: 'repos', entries: [], weights: [], custom: []};
let sb = null;

const target = () => {
  const s = state.settings, sport = state.dayType === 'sport';
  return {K: sport ? s.kcal_sport : s.kcal_rest, P: s.protein, G: sport ? s.carbs_sport : s.carbs_rest, L: s.fat};
};
const entryVals = e => { const r = e.grams / 100; return {K: e.kcal100 * r, P: e.p100 * r, G: e.g100 * r, L: e.l100 * r}; };
const sumVals = list => list.reduce((a, e) => { const v = entryVals(e); a.K += v.K; a.P += v.P; a.G += v.G; a.L += v.L; return a; }, {K: 0, P: 0, G: 0, L: 0});
const entryFromFood = (f, grams, meal, date) => ({date, meal, name: f.label.slice(0, 120), grams, p100: f.P, g100: f.G, l100: f.L, kcal100: Math.round(f.K * 10) / 10});

/* ========== Démarrage ========== */
let started = false;
const SCREENS = ['scrLoading', 'scrConfig', 'scrAuth', 'scrProfile'];
function screen(id) {
  SCREENS.forEach(x => $(x).classList.toggle('hidden', x !== id));
  $('app').classList.toggle('hidden', id !== 'app');
  document.body.classList.toggle('in-app', id === 'app');
}

function boot() {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || !window.supabase) { screen('scrConfig'); return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  sb.auth.onAuthStateChange((ev, session) => {
    const u = session && session.user;
    // Ne pas appeler Supabase directement dans ce callback (recommandation supabase-js)
    setTimeout(() => {
      if (u && !state.user) start(u);
      else if (u && state.user.id !== u.id) location.reload();     // autre compte : on repart de zéro
      else if (!u && state.user) location.reload();                // déconnexion : on vide tout
      else if (!u) screen('scrAuth');
    }, 0);
  });
}

/* ---- Connexion ---- */
function authMsg(t, ok = false) { const m = $('aMsg'); m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'err'); }
const frAuthErr = e => {
  const m = (e && e.message) || String(e);
  if (/invalid login/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/not confirmed/i.test(m)) return 'Ce compte n’est pas encore confirmé.';
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail : clique sur « Se connecter ».';
  if (/at least 6|password should/i.test(m)) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (/rate limit/i.test(m)) return 'Trop de tentatives, réessaie dans quelques minutes.';
  return m;
};
$('authForm').addEventListener('submit', async e => {
  e.preventDefault(); authMsg('');
  const {error} = await sb.auth.signInWithPassword({email: $('aEmail').value.trim(), password: $('aPass').value});
  if (error) authMsg(frAuthErr(error));
});
$('aSignup').addEventListener('click', async () => {
  if (!$('authForm').reportValidity()) return;
  authMsg('');
  const {data, error} = await sb.auth.signUp({email: $('aEmail').value.trim(), password: $('aPass').value,
    options: {emailRedirectTo: location.origin + location.pathname}});
  if (error) return authMsg(frAuthErr(error));
  if (!data.session) authMsg('Compte créé, mais il doit être confirmé par e-mail avant la première connexion.', true);
});
$('logout').addEventListener('click', () => sb.auth.signOut());
$('aPassToggle').addEventListener('click', () => {
  const inp = $('aPass'), show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  $('aPassToggle').setAttribute('aria-pressed', show);
  $('aPassToggle').setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  $('aPassToggle').innerHTML = show ? '🙈 <span>Masquer</span>' : '👁️ <span>Afficher</span>';
  inp.focus();
});

/* ---- Profil et calcul des consignes (même méthode que le plan de Philou) ---- */
const PHILOU = {sex: 'H', age: 44, height_cm: 175, weight_start: 81.8, activity: 1.35, sessions: 3};
const PHILOU_PLAN = {...DEFAULT_SETTINGS, maint_rest: 2290, maint_sport: 2690};
const KCAL_SESSION = 400;   // dépense d'une séance d'environ 1 h
const DEFICIT = 400;        // déficit visé par jour
function computePlan(p) {
  const bmr = 10 * p.weight_start + 6.25 * p.height_cm - 5 * p.age + (p.sex === 'F' ? -161 : 5);   // Mifflin–St Jeor
  const mr = Math.round(bmr * p.activity / 10) * 10, ms = p.sessions > 0 ? mr + KCAL_SESSION : mr;
  const floor = p.sex === 'F' ? 1200 : 1500, r50 = x => Math.round(x / 50) * 50;
  const kr = Math.max(floor, r50(mr - DEFICIT)), ks = Math.max(floor, r50(ms - DEFICIT));
  const P = Math.min(220, Math.round(1.8 * p.weight_start / 10) * 10);       // ≈ 1,8 g/kg
  const F = Math.round(0.32 * kr / 9);                                         // ≈ 32 % des kcal
  const G = k => Math.max(0, Math.round((k - 4 * P - 9 * F) / 4));
  return {maint_rest: mr, maint_sport: ms, kcal_rest: kr, kcal_sport: ks, protein: P, carbs_rest: G(kr), carbs_sport: G(ks), fat: F, bmr: Math.round(bmr)};
}
const planValues = p => p.plan === 'philou' ? {...PHILOU_PLAN} : computePlan(p);
const isPhilou = () => state.settings.plan === 'philou';
const sportName = () => isPhilou() ? 'Crosstraining' : 'Sport';

let pfMode = 'create';
function readProfile() {
  return {first_name: $('pfName').value.trim().slice(0, 40), plan: $('pfPlanPhilou').checked ? 'philou' : 'custom',
    sex: $('pfSex').value, age: +$('pfAge').value, height_cm: +$('pfHeight').value,
    weight_start: Math.round(parseFloat(String($('pfWeight').value).replace(',', '.')) * 10) / 10,
    activity: +$('pfActivity').value, sessions: +$('pfSessions').value};
}
function fillProfile(p) {
  $('pfName').value = p.first_name || ''; $('pfPlanPhilou').checked = p.plan === 'philou'; $('pfPlanCustom').checked = p.plan !== 'philou';
  $('pfSex').value = p.sex || 'H'; $('pfAge').value = p.age || ''; $('pfHeight').value = p.height_cm || '';
  $('pfWeight').value = p.weight_start ? String(p.weight_start).replace('.', ',') : ''; $('pfActivity').value = String(p.activity || 1.35); $('pfSessions').value = p.sessions ?? 3;
}
function updProfilePreview() {
  const p = readProfile();
  const ok = p.age >= 15 && p.age <= 100 && p.height_cm >= 120 && p.height_cm <= 230 && p.weight_start >= 30 && p.weight_start <= 300;
  if (!ok && p.plan !== 'philou') { $('pfPreview').innerHTML = '<p class="muted" style="margin:0">Remplis ton âge, ta taille et ton poids pour voir tes consignes.</p>'; return; }
  const v = planValues(p);
  $('pfPreview').innerHTML = `<p style="margin:0 0 8px;font-weight:800">${p.plan === 'philou' ? '📄 Consignes du plan de Philou' : '🧮 Tes consignes de départ'}</p>
    <table class="ptable"><thead><tr><th></th><th>Sans sport</th><th>Jour de sport</th></tr></thead><tbody>
    <tr><td>Maintien estimé</td><td>${fr0(v.maint_rest)} kcal</td><td>${fr0(v.maint_sport)} kcal</td></tr>
    <tr><td><b>Cible</b></td><td><b>${fr0(v.kcal_rest)} kcal</b></td><td><b>${fr0(v.kcal_sport)} kcal</b></td></tr>
    <tr><td>Protéines</td><td>${v.protein} g</td><td>${v.protein} g</td></tr>
    <tr><td>Glucides</td><td>${v.carbs_rest} g</td><td>${v.carbs_sport} g</td></tr>
    <tr><td>Lipides</td><td>${v.fat} g</td><td>${v.fat} g</td></tr></tbody></table>
    <p class="muted" style="margin:8px 0 0;font-size:.85rem">${p.plan === 'philou' ? 'Plan établi pour Philou (PDF), avec ses journées types.' : `Mifflin–St Jeor (${fr0(v.bmr)} kcal au repos) × activité, + ${KCAL_SESSION} kcal les jours de séance, − ${DEFICIT} kcal de déficit, protéines ≈ 1,8 g/kg. Tu pourras les ajuster ensuite dans « Mon plan ».`}</p>`;
}
function openProfile(mode) {
  pfMode = mode;
  fillProfile(mode === 'edit' ? state.settings : {plan: 'custom', sessions: 3, activity: 1.35});
  $('pfTitle').textContent = mode === 'edit' ? '✏️ Mon profil' : '👋 Création de ton profil';
  $('pfSubmit').textContent = mode === 'edit' ? 'Enregistrer et recalculer mes cibles' : 'Créer mon profil';
  $('pfCancel').classList.toggle('hidden', mode !== 'edit');
  $('pfEditNote').classList.toggle('hidden', mode !== 'edit');
  updProfilePreview(); screen('scrProfile'); window.scrollTo(0, 0);
}
$('pfForm').addEventListener('input', updProfilePreview);
$('pfForm').addEventListener('change', e => {
  if (e.target.id === 'pfPlanPhilou' && e.target.checked) {   // pré-remplit le profil de Philou
    const n = $('pfName').value; fillProfile({...PHILOU, plan: 'philou', first_name: n || 'Philou'});
  }
  updProfilePreview();
});
$('pfCancel').addEventListener('click', () => screen('app'));
$('pfForm').addEventListener('submit', async e => {
  e.preventDefault();
  const p = readProfile();
  if (!(p.weight_start >= 30 && p.weight_start <= 300)) return toast('Poids invalide (ex. 81,8)', true);
  const vals = {...p, ...planValues(p), updated_at: new Date().toISOString()}; delete vals.bmr;
  $('pfSubmit').disabled = true;
  try {
    const q = pfMode === 'edit'
      ? sb.from('settings').update(vals).eq('user_id', state.user.id).select().single()
      : sb.from('settings').insert({user_id: state.user.id, ...vals}).select().single();
    const {data, error} = await q; if (error) throw error;
    state.settings = data;
    if (pfMode === 'create') {   // première pesée = poids de départ
      await sb.from('weights').upsert({user_id: state.user.id, date: today(), kg: p.weight_start});
      await enterApp();
    } else { screen('app'); renderPlan(); renderJournal(); toast('Profil enregistré ✔'); }
  } catch (er) { fail(er); } finally { $('pfSubmit').disabled = false; }
});

async function start(user) {
  state.user = user;
  screen('scrLoading');
  try {
    const st = await sb.from('settings').select('*').eq('user_id', user.id).maybeSingle();
    if (st.error) throw st.error;
    if (!st.data) return openProfile('create');
    state.settings = st.data;
    await enterApp();
  } catch (e) { showError(e); }
}
async function enterApp() {
  try {
    const [cu, wt] = await Promise.all([
      sb.from('custom_foods').select('*').order('name'),
      sb.from('weights').select('date,kg').order('date')
    ]);
    if (cu.error) throw cu.error; if (wt.error) throw wt.error;
    state.custom = cu.data;
    state.weights = wt.data.map(w => ({date: w.date, kg: +w.kg}));
    rebuildFoods(); renderFoodsCustomNote();
    $('uName').textContent = state.settings.first_name || state.user.email;
    started = true;
    screen('app');
    renderPlan();
    route();
    await loadDay();
  } catch (e) { showError(e); }
}
function showError(e) {
  console.error(e); screen('scrLoading');
  $('scrLoading').innerHTML = '<div class="card"><h1>😕 Oups</h1><p>Impossible de charger les données : ' + esc(e.message || e) + '</p><button class="btn primary" onclick="location.reload()">Réessayer</button></div>';
}

/* ========== Navigation par onglets ========== */
const TABS = ['plan', 'journal', 'bilan', 'poids', 'aliments'];
function route() {
  const t = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'plan';
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
  $('tSportName').textContent = sportName();
  document.querySelectorAll('#dType button').forEach(b => b.classList.toggle('on', b.dataset.t === state.dayType));
  renderSummary();

  const tplK = sumVals(templateEntries(state.dayType)).K;
  $('tpl').innerHTML = state.entries.length ? '' : `<div class="tplbox"><p>📋 Journée vide. Tu peux partir de la journée type « ${state.dayType === 'sport' ? sportName().toLowerCase() : 'sans sport'} »${isPhilou() ? '' : ' adaptée à ta cible'} (≈ ${fr0(tplK)} kcal) puis ajuster.</p><button class="btn primary small" id="fillTpl">Remplir avec la journée type</button></div>`;

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
  if (isPhilou()) return out;
  // Autres profils : mêmes repas ; les aliments riches en protéines suivent la cible de protéines,
  // les autres sont ajustés pour atteindre la cible de kcal
  const st = state.settings, tgtK = type === 'sport' ? st.kcal_sport : st.kcal_rest;
  const isProt = e => 4 * e.p100 / e.kcal100 > 0.4;
  const prot = out.filter(isProt), other = out.filter(e => !isProt(e));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const rP = clamp(st.protein / sumVals(out).P, 0.5, 1.6);
  const rO = clamp((tgtK - sumVals(prot).K * rP) / sumVals(other).K, 0.3, 2);
  const round = g => g < 20 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5;
  prot.forEach(e => e.grams = round(e.grams * rP));
  other.forEach(e => e.grams = round(e.grams * rO));
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
  const {error} = await sb.from('days').upsert({user_id: state.user.id, date: state.date, day_type: state.dayType});
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
  const list = searchFoods(FOODS, $('addQ').value, 60);
  $('addRes').innerHTML = list.length ? list.map(f => `<li data-key="${f.key}"${pick && pick.key === f.key ? ' class="sel"' : ''}><span>${f.em} ${esc(f.label)}${f.custom ? '<span class="cu">perso</span>' : ''}</span><small>${fr0(f.K)} kcal/100 g</small></li>`).join('') + (list.length === 60 ? '<li style="cursor:default"><span class="muted">… précise ta recherche pour voir plus de résultats</span></li>' : '')
    : '<li style="cursor:default"><span class="muted">Aucun résultat. Crée un aliment perso ⬇</span></li>';
}
/* Portions rapides selon le type d'aliment (boissons : 1 ml ≈ 1 g) */
function portionsFor(f) {
  const k = f.k || norm(f.label);
  if (/^huile|huile d olive|^beurre(?! de cacah)/.test(k)) return [['1 c. à café', 4], ['1 c. à soupe', 10]];
  if (/^(vin |vin$|vin \(|champagne|kir|apéritif a base de vin|aperitif a base de vin)/.test(k)) return [['1 verre (12,5 cl)', 125], ['1 coupe (10 cl)', 100], ['1 bouteille', 750]];
  if (/^(biere|cidre|panache)/.test(k)) return [['1 demi (25 cl)', 250], ['1 canette (33 cl)', 330], ['1 pinte (50 cl)', 500]];
  if (/^(whisky|vodka|rhum|gin$|gin,|tequila|pastis$|pastis,|liqueur|eau de vie|cocktail|porto)/.test(k)) return [['1 dose (4 cl)', 40], ['1 verre (10 cl)', 100]];
  if (/^(cola|soda|jus |limonade|boisson|nectar|sirop)/.test(k)) return [['1 verre (20 cl)', 200], ['1 canette (33 cl)', 330]];
  if (/^(sucre|miel|confiture|pate a tartiner)/.test(k)) return [['1 c. à café', 7], ['1 c. à soupe', 20]];
  if (/^(oeuf|œuf)/.test(k)) return [['1 œuf', 55], ['2 œufs', 110]];
  return [];
}
function selectFood(f, grams = 100) {
  pick = f; $('addPick').classList.remove('hidden'); $('addName').textContent = f.em + ' ' + f.label;
  $('addG').value = grams; updAddPrev(); searchAdd();
  const pp = portionsFor(f);
  $('addPortions').innerHTML = pp.map(([t, g]) => `<button type="button" class="btn small ghost" data-g="${g}">${t}</button>`).join('');
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
$('addPortions').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { $('addG').value = b.dataset.g; updAddPrev(); } });
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
  const {error} = await sb.from('weights').upsert({user_id: state.user.id, date, kg});
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
  $('qKg').placeholder = w ? fr(w.kg) : (state.weights.length ? fr(state.weights[state.weights.length - 1].kg) : fr(state.settings.weight_start || 80));
  $('qWNow').innerHTML = w ? `✔ <b>${fr(w.kg)} kg</b> enregistré` : '<span class="muted">pas encore pesé</span>';
}
$('qW').addEventListener('submit', async e => {
  e.preventDefault();
  if (await saveWeight(state.date, $('qKg').value)) renderQuickWeigh();
});

/* ========== BILAN DE LA SEMAINE ========== */
const maint = () => ({repos: state.settings.maint_rest || 2290, sport: state.settings.maint_sport || 2690}); // dépense de maintien estimée
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
  const M = maint(), deficit = logged.reduce((a, r) => a + (M[r.type] - r.v.K), 0);
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
    else if (vsTarget < 0 && -vsTarget / n > 250) msgs.push(['warn', '🥗', `En moyenne ${fr0(-vsTarget / n)} kcal par jour sous la cible`, 'Attention à ne pas trop manger peu : ça fatigue et ça fait perdre du muscle, surtout avec le sport.']);
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
      <div class="stat"><b>${sportDays}/${state.settings.sessions ?? 3}</b><small>séances de sport</small></div>
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
  const s = state.settings, M = maint(), n = s.sessions ?? 3, sp = sportName();
  const act = {1.2: 'un quotidien sédentaire', 1.35: 'un quotidien plutôt sédentaire', 1.5: 'un quotidien actif', 1.7: 'un quotidien très actif'}[s.activity] || 'son activité';
  $('pIntro').innerHTML = `${esc(s.first_name || '')}${s.first_name ? ' · ' : ''}${s.sex === 'F' ? 'Femme' : 'Homme'} de ${s.age} ans, ${fr(s.weight_start)} kg au départ, ${s.height_cm} cm, ${act}, ${n} ${isPhilou() ? 'cours de crosstraining' : 'séance' + (n > 1 ? 's' : '') + ' de sport'} d'environ 1 h par semaine. Objectif : un déficit d'environ <b>${fr0(M.repos - s.kcal_rest)} kcal par jour</b>.`;
  $('pTable').innerHTML = `<thead><tr><th>Repère quotidien</th><th>Sans sport · ${7 - n} j</th><th>${sp} · ${n} j</th></tr></thead><tbody>
    <tr><td>Dépense de maintien estimée</td><td>${fr0(M.repos)} kcal</td><td>${fr0(M.sport)} kcal</td></tr>
    <tr><td><b>Apport cible</b></td><td><b>${fr0(s.kcal_rest)} kcal</b></td><td><b>${fr0(s.kcal_sport)} kcal</b></td></tr>
    <tr><td>Déficit visé</td><td>${fr0(M.repos - s.kcal_rest)} kcal</td><td>${fr0(M.sport - s.kcal_sport)} kcal</td></tr>
    <tr><td>Protéines</td><td>${s.protein} g</td><td>${s.protein} g</td></tr>
    <tr><td>Glucides</td><td>${s.carbs_rest} g</td><td>${s.carbs_sport} g</td></tr>
    <tr><td>Lipides</td><td>${s.fat} g</td><td>${s.fat} g</td></tr></tbody>`;
  $('pDaysNote').textContent = (isPhilou() ? '' : 'Portions de la journée type de référence, ajustées à ta cible. ') + 'Les pommes de terre et les légumes sont pesés cuits. Le riz, les flocons, le poulet et le saumon sont pesés avant cuisson. Les fruits sont pesés sans la peau ni le trognon.';
  $('pDays').innerHTML = [['repos', '🛋️ Jour sans sport'], ['sport', '🏋️ Jour ' + sp.toLowerCase()]].map(([type, title]) => {
    const all = templateEntries(type), tot = sumVals(all);
    const meals = MEALS.map(([k, nm]) => {
      const list = all.filter(e => e.meal === k);
      return `<h4>${nm} <span class="muted" style="font-size:.85rem">· ${fr0(sumVals(list).K)} kcal</span></h4><ul>${list.map(e => `<li><span>${esc(e.name)}</span><span>${e.grams} g</span></li>`).join('')}</ul>`;
    }).join('');
    return `<div class="card dayc"><h3>${title}</h3>
      <div class="tot"><div><b>${fr0(tot.K)}</b>kcal</div><div><b class="cp">${fr0(tot.P)}</b>prot.</div><div><b class="cg">${fr0(tot.G)}</b>gluc.</div><div><b class="cl">${fr0(tot.L)}</b>lip.</div></div>
      ${meals}</div>`;
  }).join('');
  $('sNote').textContent = isPhilou()
    ? 'Le calcul de départ suppose 1,75 m et un quotidien plutôt sédentaire hors cours (Mifflin–St Jeor, facteur d’activité 1,35, environ 400 kcal par cours). Change les cibles ici si besoin.'
    : 'Cibles calculées à partir de ton profil (Mifflin–St Jeor, activité, environ 400 kcal par séance, déficit de 400 kcal). Change-les ici si besoin.';
  $('sKcalSportLab').firstChild.textContent = 'kcal ' + sp.toLowerCase();
  $('sReset').textContent = isPhilou() ? 'Revenir au plan d’origine' : 'Recalculer depuis mon profil';
  SKEYS.forEach(k => $('s_' + k).value = s[k]);
}
async function saveSettings(vals) {
  const {data, error} = await sb.from('settings').update({...vals, updated_at: new Date().toISOString()}).eq('user_id', state.user.id).select().single();
  if (error) return fail(error);
  state.settings = data; renderPlan(); renderJournal(); toast('Cibles enregistrées ✔');
}
$('sForm').addEventListener('submit', e => {
  e.preventDefault();
  const vals = {}; SKEYS.forEach(k => vals[k] = Math.round(+$('s_' + k).value)); saveSettings(vals);
});
$('sReset').addEventListener('click', () => { const v = planValues(state.settings); delete v.bmr; saveSettings(v); });
$('pEdit').addEventListener('click', () => openProfile('edit'));

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
  $('foods').innerHTML = CATS.map(c => sec(c) + (c.id === 'feculents' ? SWAP : '')).join('') + CALC + `<section class="cat" id="ciqual">
      <div class="cat-head"><span class="em">📚</span><div><h2>Table Ciqual complète</h2><small>${fr0(BASE.length - N_CURATED)} aliments · Anses 2025 · kcal officielles</small></div></div>
      <div class="ciq-tools"><select id="ciqGrp" aria-label="Catégorie"><option value="">Toutes les catégories</option>${typeof CIQUAL_GROUPS !== 'undefined' ? CIQUAL_GROUPS.map((g, i) => `<option value="${i}">${GRP_EM[i] || ''} ${esc(cap(g))}</option>`).join('') : ''}</select></div>
      <div class="tbl"><table class="food">
        <thead><tr><th>Aliment</th><th><span class="d" style="background:var(--p)"></span>Prot.</th><th><span class="d" style="background:var(--g)"></span>Gluc.</th><th><span class="d" style="background:var(--l)"></span>Lip.</th></tr></thead>
        <tbody id="ciqBody"></tbody></table></div>
      <p class="clickhint" id="ciqHint"></p>
    </section>` + '<div id="customNote"></div><p class="noresult" id="nores">Aucun aliment trouvé 🤷</p>';
  $('toc').innerHTML = CATS.map(c => `<li><a href="#${c.id}">${c.em} ${c.t.split(/,| et /)[0]}</a></li>`).join('') + '<li><a href="#calcul">🧮 Calcul</a></li><li><a href="#ciqual">📚 Table complète</a></li>';
  renderCiqual();
}
function renderFoodsCustomNote() {
  const n = state.custom.length;
  if ($('customNote')) $('customNote').innerHTML = n ? `<div class="callout green"><h3>🏷️ Mes aliments perso</h3><p style="margin:0">${state.custom.map(c => esc(c.name) + ` <span class="muted">(${fr0(c.kcal100)} kcal/100 g)</span>`).join(' · ')}</p></div>` : '';
}
const CIQ_MAX = 150;
function renderCiqual() {
  const q = $('q') ? $('q').value : '', g = $('ciqGrp') ? $('ciqGrp').value : '';
  let pool = BASE.filter(f => f.ciqual && (g === '' || f.grp === +g));
  const list = q.trim() ? searchFoods(pool, q, CIQ_MAX) : pool.slice(0, CIQ_MAX);
  const total = q.trim() ? null : pool.length;
  $('ciqBody').innerHTML = list.map(f => `<tr data-key="${f.key}"><td class="n">${esc(f.n)}<span class="kc">${fr0(f.K)} kcal</span></td>${cell(f.P, 'var(--p)')}${cell(f.G, 'var(--g)')}${cell(f.L, 'var(--l)')}</tr>`).join('')
    || '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Aucun aliment trouvé dans la table complète</td></tr>';
  $('ciqHint').textContent = list.length >= CIQ_MAX ? `👆 ${CIQ_MAX} premiers résultats${total ? ' sur ' + fr0(total) : ''} : utilise la recherche ou la catégorie pour affiner.` : `👆 ${list.length} aliment${list.length > 1 ? 's' : ''}. Clique pour calculer une portion.`;
  return list.length;
}
renderFoods();
$('foods').addEventListener('change', e => { if (e.target.id === 'ciqGrp') renderCiqual(); });
// Les ancres du sommaire ne doivent pas changer d'onglet
$('toc').addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a) return;
  e.preventDefault(); const el = document.querySelector(a.getAttribute('href')); if (el) el.scrollIntoView({behavior: 'smooth'});
});
$('q').addEventListener('input', () => {
  const q = norm($('q').value.trim()); let any = false;
  document.querySelectorAll('#foods .cat:not(#ciqual)').forEach(sec => {
    let vis = 0;
    sec.querySelectorAll('tbody tr').forEach(tr => { const ok = !q || tr.dataset.k.includes(q); tr.classList.toggle('none', !ok); if (ok) vis++; });
    sec.classList.toggle('none', vis === 0); if (vis) any = true;
  });
  document.querySelectorAll('#foods .callout').forEach(c => c.classList.toggle('none', !!q));
  if (renderCiqual() && q) any = true;
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
