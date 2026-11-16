/* Maple · Lab (calculadora y química), datos curiosos, horario y notas, modo oscuro, texto grande
   y edición de tarjetas. Se carga después del script principal y usa sus utilidades ($, el, ic, esc,
   openSheet, closeSheet, toast, sfx, confetti, save, S, Maple…). */
"use strict";
(() => {
/* ===================== datos ===================== */
let TRIVIA = window.MAPLE_TRIVIA || { facts: [], quiz: [] };
// los datos van embebidos en js/data.js (sin descargas); si faltaran, cada herramienta abre igual
try { Chem.setData(window.MAPLE_ELEMENTS || []); } catch (e) {}
const ready = Promise.resolve();

const N = (x, s = 4) => Chem.fmt(x, s);
const P = f => esc(Chem.pretty(f));
const accSt = c => `style="--acc:var(--${c});--accD:var(--${c}D)"`;
const numField = (id, ph, v = '') => `<input class="field sm" id="${id}" inputmode="decimal" autocomplete="off" placeholder="${esc(ph)}" value="${esc(v)}">`;
const lbl = (t, inner) => `<div><span class="fl">${t}</span>${inner}</div>`;
const val = id => { const e = $('#' + id); if (!e) return NaN; const t = e.value.trim().replace(',', '.'); return t === '' || isNaN(+t) ? NaN : +t; };
const res = (id, big, msg = '', ok = true) => { $('#' + id).innerHTML = `<div class="res${ok ? '' : ' err'}"><div class="big">${big}</div>${msg ? `<div class="msg">${msg}</div>` : ''}</div>`; if (ok) sfx('ok'); };
const tabs = (names, sel, acc = 'blue') => `<div class="seg" style="margin-bottom:14px">${names.map((n, i) => `<button data-tab="${i}" class="${i === sel ? 'on' : ''}">${n}</button>`).join('')}</div>`;
const bindTabs = fn => $$('#sheetBody [data-tab]').forEach(b => b.onclick = () => fn(+b.dataset.tab));
const segBind = (sel, fn) => $$(sel + ' button').forEach((b, i) => b.onclick = () => { $$(sel + ' button').forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(i); });
if (!S.lab) S.lab = {};

/* ===================== modo oscuro y texto grande ===================== */
function wantsDark() { const m = S.themeMode || 'auto'; if (m === 'dark') return true; if (m === 'light') return false; const h = new Date().getHours(); return h >= 20 || h < 6; }
function applyTheme() {
  document.documentElement.classList.toggle('dark', wantsDark());
  document.documentElement.classList.toggle('big', !!S.bigText);
  const mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = wantsDark() ? '#17161B' : '#F5F4F0';
}
applyTheme(); setInterval(applyTheme, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) applyTheme(); });

/* ===================== mejoras pequeñas ===================== */
// el ritual "prepara tu espacio" vale solo por un día
const _renderPlan = renderPlan;
renderPlan = function () { if (S.ritualDay !== dayKey()) { S.ritual = [false, false, false]; S.ritualDay = dayKey(); } return _renderPlan.apply(this, arguments); };
// evita calificar dos tarjetas con un doble toque
let rateBusy = false;
$('#rRate').addEventListener('click', e => { if (!e.target.closest('button')) return; if (rateBusy) { e.stopImmediatePropagation(); return; } rateBusy = true; setTimeout(() => rateBusy = false, 450); }, true);

/* ===================== navegación: pestaña Lab ===================== */
ACC.lil = ['var(--lil)', 'var(--lilD)'];
const _show = show;
show = function (v) { _show(v); if (v === 'lab') renderLab(); };

const LAB_TOOLS = [
  ['Química', [
    ['table', '#64B5F6', 'Tabla periódica', '118 elementos', () => openTable()],
    ['flask', 'var(--blue)', 'Masa molar', 'y composición %', openMolar],
    ['scale', 'var(--lil)', 'Balancear', 'ecuaciones químicas', openBalance],
    ['beaker', 'var(--mint)', 'Soluciones', 'preparar y diluir', () => openSolutions(0)],
    ['drop', '#F06292', 'pH', 'fuerte, débil, buffer', () => openPH(0)],
    ['wind', '#5B6CC9', 'Gases ideales', 'PV = nRT', openGas],
    ['percent', 'var(--red)', 'Reactivo limitante', 'y rendimiento %', openLimiting],
    ['tag', 'var(--yelD)', 'Nomenclatura', 'tarjetas para practicar', openNomen],
  ]],
  ['Laboratorio', [
    ['shield', 'var(--red)', 'Seguridad', 'pictogramas SGA', () => openSGA(-1)],
    ['report', 'var(--blue)', 'Informe', 'estructura y plantilla', openReport],
    ['chart', '#F2994A', 'Calibración', 'regresión lineal', openCalib],
    ['sigma', 'var(--yelD)', 'Réplicas', 'promedio, s, IC, Q', openStats],
  ]],
  ['Datos y unidades', [
    ['ruler', 'var(--pink)', 'Unidades', 'T, P, energía, masa…', () => openUnits('Temperatura')],
    ['hash', '#F2994A', 'Constantes', 'R, Nₐ, F, h…', openConsts],
  ]],
];
// herramientas útiles para cualquier carrera (el resto solo si estudias ciencias)
const GENERAL = ['calc', '2_0', '1_3', 'trivia'];
const DEFAULT_RECENT = ['0_0', '0_1', '0_3', '2_0'];
function toolIndex() {
  const idx = {};
  LAB_TOOLS.forEach(([sec, list], si) => list.forEach(([icn, col, t, s, fn], i) => idx[si + '_' + i] = { icn, t, s, fn, sec }));
  return idx;
}
function renderLab() {
  const box = $('#labBody'); if (!box) return;
  const idx = toolIndex(), sci = S.sci !== false;
  const allowed = k => sci || GENERAL.includes(k);
  const tile = k => { const t = idx[k]; return `<button class="ltile" data-tool="${k}"><div class="ic">${ic(t.icn)}</div><b>${t.t}</b></button>`; };
  const rec = (S.lab.recent || []).filter(k => idx[k] && allowed(k));
  DEFAULT_RECENT.forEach(k => { if (rec.length < 4 && !rec.includes(k) && allowed(k)) rec.push(k); });
  Object.keys(idx).forEach(k => { if (rec.length < 4 && !rec.includes(k) && allowed(k)) rec.push(k); });
  let h = `<h1 class="title">Lab</h1>
    <button class="big-tile calc-tile" data-tool="calc"><div class="ic">${ic('calc')}</div><div><b>Calculadora científica</b></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}</button>`;
  if (rec.length) h += `<div class="gap"></div><div class="label">Recientes</div><div class="wgrid">${rec.slice(0, 4).map(tile).join('')}</div>`;
  const rest = Object.keys(idx).filter(k => allowed(k) && !rec.slice(0, 4).includes(k));
  if (rest.length) {
    h += `<button class="more-btn" id="labAll">${S.lab.showAll ? 'Ocultar' : 'Todas las herramientas'} ${ic(S.lab.showAll ? 'x' : 'chev')}</button>`;
    if (S.lab.showAll) {
      let sec = '';
      rest.forEach(k => { if (idx[k].sec !== sec) { if (sec) h += '</div>'; sec = idx[k].sec; h += `<div class="label" style="margin-top:14px">${sec}</div><div class="wgrid">`; } h += tile(k); });
      h += '</div>';
    }
  }
  const f = factOfDay();
  if (f) h += `<div class="gap2"></div><button class="fact" data-tool="trivia"><span class="k">${ic('bulb')} ¿Sabías que…?</span>${esc(f.t)}</button>`;
  if (!sci) h += `<p class="mini center">¿Estudias ciencias o ingeniería? Activa las herramientas de química en Tú → Ajustes.</p>`;
  box.innerHTML = h;
  const fns = { calc: openCalc, trivia: () => openTrivia('Todos') };
  Object.keys(idx).forEach(k => fns[k] = idx[k].fn);
  $$('#labBody [data-tool]').forEach(b => b.onclick = () => {
    const k = b.dataset.tool;
    if (k !== 'calc' && k !== 'trivia') { S.lab.recent = [k, ...(S.lab.recent || []).filter(x => x !== k)].slice(0, 8); save(); }
    try { fns[k](); } catch (e) { console.error(e); toast('No se pudo abrir: ' + e.message, 'sorprendida'); }
  });
  const all = $('#labAll'); if (all) all.onclick = () => { S.lab.showAll = !S.lab.showAll; save(); renderLab(); };
}

/* ===================== calculadora ===================== */
function openCalc() {
  const st = { expr: '', second: false, just: false };
  const hist = S.lab.hist || (S.lab.hist = []);
  openSheet(`<h2 class="sh-title">Calculadora</h2><div class="gap"></div>
    <div class="calc-disp"><div class="hist" id="cHist"></div><div class="mode" id="cMode"></div><div class="ex" id="cEx">&nbsp;</div><div class="rv" id="cRv">0</div></div>
    <div class="keys" id="cKeys"></div><p class="mini center">Toca un resultado del historial para reusarlo. EE escribe ×10ⁿ (6.02 EE 23).</p>`);
  const ins = { 'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(', 'sin⁻¹': 'sin⁻¹(', 'cos⁻¹': 'cos⁻¹(', 'tan⁻¹': 'tan⁻¹(', 'ln': 'ln(', 'log': 'log(', 'eˣ': 'e^(', '10ˣ': '10^(', '√': '√(', '∛': '∛(', 'x²': '^2', 'x³': '^3', 'xʸ': '^', 'EE': 'E', '(−)': '−', 'x⁻¹': '^(−1)' };
  const preview = () => {
    $('#cEx').textContent = st.expr || ' ';
    const rv = $('#cRv'); rv.className = 'rv';
    if (!st.expr) rv.textContent = '0';
    else { const r = Calc.evaluate(st.expr); if (r.ok) { rv.textContent = N(r.v, 10); if (!st.just) rv.classList.add('pre'); } }
    $('#cMode').textContent = (Calc.state.deg ? 'GRAD' : 'RAD') + (st.second ? '  ·  2nd' : '');
  };
  const drawHist = () => { const h = $('#cHist'); h.innerHTML = ''; hist.slice(-3).forEach(x => h.append(el('button', { onclick: () => { st.expr = x.e; st.just = false; preview(); } }, `${x.e} = ${x.r}`))); };
  const press = k => {
    if (k === 'AC') st.expr = '';
    else if (k === '⌫') { if (st.just) st.expr = ''; const t = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sin(', 'cos(', 'tan(', 'ln(', 'log(', '√(', '∛(', 'Ans'].find(t => st.expr.endsWith(t)); st.expr = t ? st.expr.slice(0, -t.length) : st.expr.slice(0, -1); }
    else if (k === '=') {
      const r = Calc.evaluate(st.expr);
      if (!r.ok) { const rv = $('#cRv'); rv.textContent = r.error || '?'; rv.className = 'rv err'; sfx('no'); return; }
      Calc.state.ans = r.v; const txt = N(r.v, 10);
      hist.push({ e: st.expr, r: txt }); while (hist.length > 20) hist.shift(); save();
      st.expr = ''; st.just = true; drawHist();
      $('#cEx').textContent = hist[hist.length - 1].e + ' ='; const rv = $('#cRv'); rv.textContent = txt; rv.className = 'rv'; return;
    }
    else if (k === '2nd') { st.second = !st.second; keys(); }
    else if (k === 'GRAD') Calc.state.deg = !Calc.state.deg;
    else { const s = ins[k] || k; if (st.just) st.expr = ['+', '−', '×', '÷', '^2', '^3', '^', '^(−1)', '!'].includes(s) ? 'Ans' : ''; st.expr += s; }
    st.just = false; preview();
  };
  const keys = () => {
    const rows = [['2nd', 'GRAD', '(', ')', '⌫'], st.second ? ['sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'eˣ', '10ˣ'] : ['sin', 'cos', 'tan', 'ln', 'log'],
      st.second ? ['∛', 'x³', 'x⁻¹', '!', 'Ans'] : ['√', 'x²', 'xʸ', 'π', 'e'], ['7', '8', '9', '÷', 'AC'], ['4', '5', '6', '×', 'EE'], ['1', '2', '3', '−', '(−)'], ['0', '.', 'Ans', '+', '=']];
    const box = $('#cKeys'); box.innerHTML = '';
    rows.flat().forEach(k => box.append(el('button', { class: /^[0-9.]$/.test(k) ? 'n' : ['÷', '×', '−', '+'].includes(k) ? 'op' : k === '=' ? 'eq' : k === 'AC' ? 'ac' : (k === '2nd' && st.second) ? 'on2' : '', onclick: () => press(k) }, k)));
  };
  keys(); drawHist(); preview();
}

/* ===================== tabla periódica ===================== */
const CAT = { 'Metal alcalino': '#FF8A65', 'Alcalinotérreo': '#FFB74D', 'Metal de transición': '#64B5F6', 'Otro metal': '#4DB6AC', 'Metaloide': '#AED581', 'No metal': '#2FC79B', 'Halógeno': '#FFD54F', 'Gas noble': '#BA68C8', 'Lantánido': '#F06292', 'Actínido': '#E57373' };
function openTable(sel = 6) {
  const cells = Chem.E.map(e => {
    let col = e.g, row = e.p;
    if (e.b === 'f') { col = e.z - (e.z < 72 ? 57 : 89) + 3; row = e.z < 72 ? 8 : 9; }
    return `<button data-z="${e.z}" class="${e.z === sel ? 'sel' : ''}" style="left:${(col - 1) * 34}px;top:${(row - 1) * 34 + (row >= 8 ? 10 : 0)}px;background:${CAT[e.c] || '#ccc'}"><small>${e.z}</small>${e.s}</button>`;
  }).join('');
  openSheet(`<h2 class="sh-title">Tabla periódica</h2><div class="gap"></div><div class="tile" id="elDet"></div><div class="gap"></div>
    <div class="ptwrap" id="ptw"><div class="ptable">${cells}</div></div>
    <div class="legend">${Object.entries(CAT).map(([k, c]) => `<span style="--c:${c}">${k}</span>`).join('')}</div>
    <p class="mini">Desliza la tabla a los lados y toca un elemento. Masas atómicas estándar de la IUPAC.</p>`);
  $('#ptw').addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  const showEl = z => {
    const e = Chem.E[z - 1];
    $$('.ptable button').forEach(b => b.classList.toggle('sel', +b.dataset.z === z));
    $('#elDet').innerHTML = `<div class="row" style="gap:14px;align-items:flex-start"><div class="elbig" style="background:${CAT[e.c]}"><small>${e.z}</small><b>${e.s}</b></div>
      <div class="grow"><h3 style="font-size:20px">${e.n}</h3><div style="font-size:14px;margin-top:2px">${N(e.m, 6)} g/mol · ${e.c}</div>
      <div class="mini" style="margin-top:4px">${e.g ? `Grupo ${e.g} · ` : ''}periodo ${e.p} · bloque ${e.b}${e.en != null ? ' · EN ' + e.en : ''}<br>${e.cfg}${e.rad ? ' · radiactivo' : ''}</div></div></div>`;
  };
  $$('.ptable button').forEach(b => b.onclick = () => showEl(+b.dataset.z));
  showEl(sel);
}

/* ===================== masa molar ===================== */
function openMolar() {
  openSheet(`<h2 class="sh-title">Masa molar</h2><p class="sub" style="margin:4px 0 12px">Respeta mayúsculas: Co es cobalto y CO es monóxido de carbono. Para hidratos usa · o un punto.</p>
    <input class="field" id="mmIn" placeholder="Ej.: CuSO4·5H2O o Ca(OH)2" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="chips wrapc">${['H2SO4', 'NaOH', 'KMnO4', 'CuSO4·5H2O', 'C6H12O6', 'K2Cr2O7'].map(f => `<button class="chip" data-f="${f}">${P(f)}</button>`).join('')}</div><div id="mmOut"></div>`);
  const calc = () => {
    const f = $('#mmIn').value, out = $('#mmOut'); if (!f.trim()) { out.innerHTML = ''; return; }
    const p = Chem.parse(f); if (!p.ok) { out.innerHTML = `<div class="res err"><div class="big">${esc(p.error)}</div></div>`; return; }
    const M = Chem.molarMass(p.atoms);
    out.innerHTML = `<div class="res"><div style="font-size:21px;font-weight:800">${P(f)}</div><div class="big">${N(M, 6)} g/mol</div></div><div class="gap"></div><div class="label">Composición</div>
      <div class="tile" style="padding:8px 16px">${Object.entries(p.atoms).map(([k, n]) => { const mm = Chem.bySym[k].m * n, pct = 100 * mm / M; return `<div class="comp"><b>${k}</b><div class="bar"><i style="width:${pct}%"></i></div><span>${n} × ${N(Chem.bySym[k].m, 5)} · ${pct.toFixed(2)} %</span></div>`; }).join('')}</div>
      <p class="mini">Úsala en “Soluciones” para saber cuánto pesar.</p>`;
  };
  $('#mmIn').oninput = calc;
  $$('#sheetBody [data-f]').forEach(b => b.onclick = () => { $('#mmIn').value = b.dataset.f; calc(); });
}

/* ===================== balancear ===================== */
function openBalance() {
  const ex = ['C3H8 + O2 -> CO2 + H2O', 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', 'Cu + HNO3 -> Cu(NO3)2 + NO + H2O', 'Al + H2SO4 -> Al2(SO4)3 + H2'];
  openSheet(`<h2 class="sh-title">Balancear ecuaciones</h2><p class="sub" style="margin:4px 0 12px">Escribe reactivos y productos separados por -> o =. Maple busca los coeficientes enteros más pequeños.</p>
    <input class="field" id="bIn" placeholder="Ej.: Fe + O2 -> Fe2O3" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="gap"></div>
    <button class="btn" id="bGo" ${accSt('lil')}>Balancear</button><div id="bOut"></div><div class="gap"></div>
    <div class="label">Ejemplos</div>${ex.map(e => `<button class="link" data-e="${esc(e)}" style="margin:0;color:var(--blueD);text-align:left">${esc(e)}</button>`).join('')}
    <p class="mini">Consejo: intenta balancear a mano primero y usa esto para revisar. Así también lo practicas para el parcial.</p>`);
  const go = () => { const r = Chem.balance($('#bIn').value); $('#bOut').innerHTML = r.ok ? `<div class="res"><div style="font-size:21px;font-weight:800;line-height:1.5">${r.text}</div></div>` : `<div class="res err"><div class="big">${esc(r.error)}</div></div>`; if (r.ok) sfx('ok'); };
  $('#bGo').onclick = go; $('#bIn').onkeydown = e => { if (e.key === 'Enter') go(); };
  $$('#sheetBody [data-e]').forEach(b => b.onclick = () => { $('#bIn').value = b.dataset.e; go(); });
}

/* ===================== soluciones ===================== */
function fillMolar(fid, pid) { $('#' + fid).oninput = () => { const p = Chem.parse($('#' + fid).value); if (p.ok) $('#' + pid).value = Chem.molarMass(p.atoms).toFixed(3); }; }
function openSolutions(tab) {
  let body = '';
  if (tab === 0) body = `<p class="sub" style="margin:0 0 12px">¿Cuánto soluto pesar? masa = M × V × PM ÷ pureza</p>
    <input class="field sm" id="sF" placeholder="Fórmula (o escribe la masa molar abajo)" autocapitalize="off" spellcheck="false"><div class="gap"></div>
    <div class="g2">${lbl('Masa molar (g/mol)', numField('sPM', 'g/mol'))}${lbl('Molaridad (mol/L)', numField('sM', 'mol/L'))}${lbl('Volumen (mL)', numField('sV', 'mL'))}${lbl('Pureza %', numField('sP', '%', '100'))}</div>`;
  if (tab === 1) body = `<p class="sub" style="margin:0 0 12px">C₁V₁ = C₂V₂. Deja vacío el dato que buscas. Usa las mismas unidades a cada lado.</p>
    <div class="g2">${lbl('C₁ (stock)', numField('d0', 'C₁'))}${lbl('V₁ a tomar', numField('d1', 'V₁'))}${lbl('C₂ (final)', numField('d2', 'C₂'))}${lbl('V₂ final', numField('d3', 'V₂'))}</div>`;
  if (tab === 2) body = `<p class="sub" style="margin:0 0 12px">En soluciones acuosas diluidas, 1 ppm ≈ 1 mg/L.</p>
    <input class="field sm" id="pF" placeholder="Fórmula (ej.: Pb, NO3, CaCO3)" autocapitalize="off" spellcheck="false"><div class="gap"></div>
    <div class="g3">${lbl('Masa molar', numField('pPM', 'g/mol'))}${lbl('ppm', numField('pP', 'mg/L'))}${lbl('mol/L', numField('pM', 'M'))}</div>`;
  openSheet(`<h2 class="sh-title">Soluciones</h2><div class="gap"></div>${tabs(['Preparar', 'Diluir', 'ppm ↔ M'], tab)}${body}<div class="gap"></div><button class="btn" id="sGo" ${accSt('mint')}>Calcular</button><div id="sOut"></div>`);
  bindTabs(openSolutions);
  if (tab === 0) {
    fillMolar('sF', 'sPM');
    $('#sGo').onclick = () => {
      const [pm, M, V, pur] = ['sPM', 'sM', 'sV', 'sP'].map(val);
      if ([pm, M, V, pur].some(x => isNaN(x) || x <= 0)) return res('sOut', 'Revisa los datos: todos deben ser mayores que 0', '', false);
      res('sOut', `Pesa ${N(M * V / 1000 * pm / (pur / 100), 4)} g`, `Disuelve en menos solvente y completa a ${N(V, 4)} mL en un balón aforado.`);
    };
  } else if (tab === 1) {
    $('#sGo').onclick = () => {
      const v = [0, 1, 2, 3].map(i => val('d' + i)), empty = v.map((x, i) => isNaN(x) ? i : -1).filter(i => i >= 0);
      if (empty.length !== 1) return res('sOut', 'Llena tres datos y deja uno vacío', '', false);
      const k = empty[0], x = [v[2] * v[3] / v[1], v[2] * v[3] / v[0], v[0] * v[1] / v[3], v[0] * v[1] / v[2]][k];
      let msg = k === 1 ? `Toma ${N(x, 4)} del stock y completa hasta ${N(v[3], 4)} con solvente.` : '';
      if ((k === 2 && x > v[0]) || (k === 0 && x < v[2])) msg = 'Ojo: diluir no puede aumentar la concentración.';
      res('sOut', `${['C₁', 'V₁', 'C₂', 'V₂'][k]} = ${N(x, 4)}`, msg);
    };
  } else {
    fillMolar('pF', 'pPM');
    $('#sGo').onclick = () => {
      const m = val('pPM'); if (isNaN(m) || m <= 0) return res('sOut', 'Falta la masa molar', '', false);
      if (!isNaN(val('pP'))) { const x = val('pP') / 1000 / m; $('#pM').value = x.toPrecision(4); res('sOut', `${N(x, 4)} mol/L`, `${N(val('pP'), 4)} ppm`); }
      else if (!isNaN(val('pM'))) { const y = val('pM') * m * 1000; $('#pP').value = y.toPrecision(4); res('sOut', `${N(y, 4)} ppm (mg/L)`); }
      else res('sOut', 'Escribe ppm o mol/L', '', false);
    };
  }
}

/* ===================== pH ===================== */
function openPH(tab) {
  const kw = 1e-14; let body = '';
  const ab = (a, b) => `<div class="seg" id="phAB" style="margin-bottom:12px"><button class="on">${a}</button><button>${b}</button></div>`;
  if (tab === 0) body = ab('Ácido fuerte', 'Base fuerte') + `<div class="g2">${lbl('Concentración (mol/L)', numField('h0', 'mol/L'))}${lbl('Iones por fórmula', numField('h1', '1', '1'))}</div>`;
  if (tab === 1) body = ab('Ácido débil (Ka)', 'Base débil (Kb)') + `<div class="g2">${lbl('Concentración (mol/L)', numField('h0', 'mol/L'))}${lbl('Ka o Kb', numField('h1', 'ej.: 1.8e-5'))}</div>
    <div class="chips wrapc">${[['Acético', '1.8e-5'], ['Fórmico', '1.8e-4'], ['HF', '6.8e-4'], ['NH₃ (Kb)', '1.8e-5']].map(([n, k]) => `<button class="chip" data-k="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 2) body = `<p class="sub" style="margin:0 0 12px">Henderson–Hasselbalch: pH = pKa + log([A⁻]/[HA])</p><div class="g3">${lbl('pKa', numField('h0', '4.76'))}${lbl('[A⁻] (M)', numField('h1', 'base'))}${lbl('[HA] (M)', numField('h2', 'ácido'))}</div>`;
  if (tab === 3) body = `<div class="g2">${lbl('pH', numField('h0', 'pH'))}${lbl('[H⁺] (mol/L)', numField('h1', 'mol/L'))}</div>`;
  openSheet(`<h2 class="sh-title">pH</h2><div class="gap"></div>${tabs(['Fuerte', 'Débil', 'Buffer', 'pH ↔ [H⁺]'], tab)}${body}<div class="gap"></div>
    <button class="btn" id="hGo" style="--acc:#E85A7E;--accD:#C9446A">Calcular</button><div id="hOut"></div>
    <p class="mini">A 25 °C (Kw = 1.0 × 10⁻¹⁴). Concentraciones como aproximación de actividades.</p>`);
  bindTabs(openPH);
  let base = false; if ($('#phAB')) segBind('#phAB', i => base = i === 1);
  $$('#sheetBody [data-k]').forEach(b => b.onclick = () => $('#h1').value = b.dataset.k);
  const show = (ph, msg) => { $('#hOut').innerHTML = `<div class="res"><div class="big" style="color:var(--ink)">pH ${ph.toFixed(2)}</div><div class="phbar"><i style="left:${Math.min(100, Math.max(0, ph / 14 * 100))}%"></i></div><div class="phlbl"><span>0 ácido</span><span>7</span><span>básico 14</span></div><div class="msg">${msg}</div></div>`; sfx('ok'); };
  $('#hGo').onclick = () => {
    if (tab === 0) {
      const C = val('h0') * (isNaN(val('h1')) ? 1 : val('h1')); if (isNaN(C) || C <= 0) return res('hOut', 'Escribe una concentración mayor que 0', '', false);
      const x = (C + Math.sqrt(C * C + 4 * kw)) / 2; let ph = -Math.log10(x); if (base) ph = 14 - ph;
      show(ph, `${base ? '[OH⁻]' : '[H⁺]'} = ${N(x, 3)} M · disociación completa`);
    } else if (tab === 1) {
      const C = val('h0'), K = val('h1'); if (!(C > 0 && K > 0)) return res('hOut', 'Escribe concentración y K mayores que 0 (puedes usar 1.8e-5)', '', false);
      const x = (-K + Math.sqrt(K * K + 4 * K * C)) / 2; let ph = -Math.log10(x); if (base) ph = 14 - ph;
      show(ph, `x = ${N(x, 3)} M · se disocia el ${(100 * x / C).toFixed(2)} % · resuelto sin aproximar (ecuación cuadrática)`);
    } else if (tab === 2) {
      const p = val('h0'), A = val('h1'), H = val('h2'); if (isNaN(p) || !(A > 0 && H > 0)) return res('hOut', 'Revisa los datos', '', false);
      const r = A / H; show(p + Math.log10(r), `Relación base/ácido = ${N(r, 3)}.${r < .1 || r > 10 ? ' Fuera de 0.1–10 el buffer amortigua poco.' : ' Buen rango para amortiguar.'}`);
    } else {
      if (!isNaN(val('h0'))) { const x = 10 ** -val('h0'); $('#h1').value = x.toExponential(3); show(val('h0'), `[H⁺] = ${N(x, 3)} M · [OH⁻] = ${N(kw / x, 3)} M · pOH = ${(14 - val('h0')).toFixed(2)}`); }
      else if (val('h1') > 0) { const p = -Math.log10(val('h1')); $('#h0').value = p.toFixed(2); show(p, `pOH = ${(14 - p).toFixed(2)} · [OH⁻] = ${N(kw / val('h1'), 3)} M`); }
      else res('hOut', 'Escribe el pH o la [H⁺]', '', false);
    }
  };
}

/* ===================== gases ===================== */
function openGas() {
  const UP = { atm: 1, kPa: 1 / 101.325, mmHg: 1 / 760, bar: 1 / 1.01325, psi: 1 / 14.6959 }, UV = { L: 1, mL: .001, 'm³': 1000 };
  const st = { pu: 'atm', vu: 'L', tu: '°C' };
  const unit = (k, opts) => `<div class="row" style="margin-top:8px"><span class="fl" style="width:22px;margin:0">${k}</span><div class="chips wrapc" style="padding:0" data-u="${k}">${opts.map((o, i) => `<button class="chip${i ? '' : ' on'}" style="--acc:var(--blue)">${o}</button>`).join('')}</div></div>`;
  openSheet(`<h2 class="sh-title">Gases ideales</h2><p class="sub" style="margin:4px 0 12px">PV = nRT. Deja vacío el dato que buscas.</p>
    <div class="g2">${lbl('Presión', numField('gP', 'P'))}${lbl('Volumen', numField('gV', 'V'))}${lbl('Moles', numField('gN', 'n'))}${lbl('Temperatura', numField('gT', 'T'))}</div>
    ${unit('P', Object.keys(UP))}${unit('V', Object.keys(UV))}${unit('T', ['°C', 'K'])}<div class="gap"></div>
    <button class="btn" id="gGo" ${accSt('blue')}>Calcular</button><div id="gOut"></div>
    <p class="mini">R = 0.08206 L·atm/(mol·K). En CNTP (0 °C, 1 atm), 1 mol ocupa 22.4 L.</p>`);
  $$('#sheetBody [data-u]').forEach(box => box.querySelectorAll('button').forEach(b => b.onclick = () => { box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); st[{ P: 'pu', V: 'vu', T: 'tu' }[box.dataset.u]] = b.textContent; }));
  $('#gGo').onclick = () => {
    const R = .0820574, p = val('gP') * UP[st.pu], v = val('gV') * UV[st.vu], n = val('gN'), t = val('gT') + (st.tu === '°C' ? 273.15 : 0);
    const e = [p, v, n, t].map((x, i) => isNaN(x) ? i : -1).filter(i => i >= 0);
    if (e.length !== 1) return res('gOut', 'Llena tres datos y deja uno vacío', '', false);
    if (e[0] !== 3 && t <= 0) return res('gOut', 'La temperatura absoluta debe ser mayor que 0 K', '', false);
    if (e[0] === 0) res('gOut', `P = ${N(n * R * t / v / UP[st.pu], 4)} ${st.pu}`);
    if (e[0] === 1) res('gOut', `V = ${N(n * R * t / p / UV[st.vu], 4)} ${st.vu}`);
    if (e[0] === 2) res('gOut', `n = ${N(p * v / (R * t), 4)} mol`);
    if (e[0] === 3) { const tk = p * v / (n * R); res('gOut', `T = ${N(tk, 4)} K`, `= ${N(tk - 273.15, 4)} °C`); }
  };
}

/* ===================== reactivo limitante ===================== */
function openLimiting() {
  openSheet(`<h2 class="sh-title">Reactivo limitante</h2><p class="sub" style="margin:4px 0 12px">Escribe la reacción (Maple la balancea), las masas de los reactivos y el producto que te interesa.</p>
    <input class="field" id="lIn" placeholder="Ej.: N2 + H2 -> NH3" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="gap"></div>
    <button class="btn soft" id="lUse">Usar esta reacción</button><div id="lBox"></div>`);
  const setup = () => {
    const r = Chem.balance($('#lIn').value), box = $('#lBox');
    if (!r.ok) { box.innerHTML = `<div class="res err"><div class="big">${esc(r.error)}</div></div>`; return; }
    const prods = r.species.map((_, i) => i).slice(r.nreact); let pi = prods[0];
    box.innerHTML = `<div class="res"><div style="font-size:19px;font-weight:800">${r.text}</div></div><div class="gap"></div>
      <div class="label">Masa de cada reactivo (g)</div><div class="g2">${r.species.slice(0, r.nreact).map((f, i) => lbl(P(f), numField('lm' + i, 'g'))).join('')}</div><div class="gap"></div>
      <div class="label">Producto de interés</div><div class="seg" id="lProd">${prods.map((p, k) => `<button class="${k ? '' : 'on'}">${P(r.species[p])}</button>`).join('')}</div><div class="gap"></div>
      ${lbl('Opcional: g obtenidos en el laboratorio', numField('lReal', 'g'))}<div class="gap"></div><button class="btn" id="lGo" ${accSt('red')}>Calcular</button><div id="lOut"></div>`;
    segBind('#lProd', k => pi = prods[k]);
    $('#lGo').onclick = () => {
      const M = r.species.map(f => Chem.molarMass(Chem.parse(f).atoms)); let best = Infinity, lim = -1;
      for (let i = 0; i < r.nreact; i++) { const m = val('lm' + i); if (!(m > 0)) return res('lOut', 'Escribe la masa de todos los reactivos', '', false); const ratio = m / M[i] / r.coef[i]; if (ratio < best) { best = ratio; lim = i; } }
      const theo = best * r.coef[pi] * M[pi], real = val('lReal');
      let h = `<div class="res" style="text-align:left"><span class="fl">Reactivo limitante</span><div class="big" style="color:var(--red)">${P(r.species[lim])}</div><div class="msg">Se acaba primero: ${N(best, 4)} mol de avance (moles ÷ coeficiente), menos que los demás.</div></div>
        <div class="res" style="text-align:left"><span class="fl">Rendimiento teórico</span><div class="big">${N(theo, 4)} g de ${P(r.species[pi])}</div>`;
      if (real > 0) { const pct = 100 * real / theo; h += `<div class="msg" style="color:${pct > 100 ? 'var(--red)' : 'var(--mintD)'};font-weight:900;font-size:15px">Rendimiento porcentual: ${pct.toFixed(1)} %${pct > 100 ? ' · revisa: no puede pasar de 100 % (¿producto húmedo o impuro?)' : ''}</div>`; }
      h += `</div><div class="res" style="text-align:left"><span class="fl">Lo que sobra</span>${r.species.slice(0, r.nreact).map((f, i) => i === lim ? '' : `<div style="font-size:14px">${P(f)}: sobran ${N(val('lm' + i) - best * r.coef[i] * M[i], 4)} g (se usan ${N(best * r.coef[i] * M[i], 4)} g)</div>`).join('')}</div>`;
      $('#lOut').innerHTML = h; sfx('ok');
    };
  };
  $('#lUse').onclick = setup; $('#lIn').onkeydown = e => { if (e.key === 'Enter') setup(); };
}

/* ===================== nomenclatura (paquete de tarjetas) ===================== */
const NOMEN = [['NaCl', 'Cloruro de sodio', 'sal'], ['H2SO4', 'Ácido sulfúrico', 'oxácido'], ['HNO3', 'Ácido nítrico', 'oxácido'], ['NaOH', 'Hidróxido de sodio', 'hidróxido'], ['CaCO3', 'Carbonato de calcio', 'sal'],
  ['KMnO4', 'Permanganato de potasio', 'sal'], ['K2Cr2O7', 'Dicromato de potasio', 'sal'], ['FeCl3', 'Cloruro de hierro(III) (cloruro férrico)', 'sal'], ['FeO', 'Óxido de hierro(II) (óxido ferroso)', 'óxido'], ['Fe2O3', 'Óxido de hierro(III) (óxido férrico)', 'óxido'],
  ['CuSO4', 'Sulfato de cobre(II)', 'sal'], ['NH3', 'Amoniaco', 'hidruro'], ['HCl', 'Ácido clorhídrico (en solución acuosa)', 'hidrácido'], ['NaHCO3', 'Hidrogenocarbonato de sodio (bicarbonato de sodio)', 'sal ácida'], ['H3PO4', 'Ácido fosfórico', 'oxácido'],
  ['NaClO', 'Hipoclorito de sodio', 'sal'], ['KNO3', 'Nitrato de potasio', 'sal'], ['Na2SO3', 'Sulfito de sodio', 'sal'], ['CO2', 'Dióxido de carbono', 'óxido'], ['N2O5', 'Pentóxido de dinitrógeno', 'óxido'],
  ['SO3', 'Trióxido de azufre', 'óxido'], ['Ca(OH)2', 'Hidróxido de calcio', 'hidróxido'], ['AgNO3', 'Nitrato de plata', 'sal'], ['HClO4', 'Ácido perclórico', 'oxácido'], ['NaH', 'Hidruro de sodio', 'hidruro'],
  ['H2O2', 'Peróxido de hidrógeno', 'peróxido'], ['Al2O3', 'Óxido de aluminio', 'óxido'], ['MgSO4', 'Sulfato de magnesio', 'sal'], ['Na2CO3', 'Carbonato de sodio', 'sal'], ['NH4Cl', 'Cloruro de amonio', 'sal'],
  ['KClO3', 'Clorato de potasio', 'sal'], ['CuO', 'Óxido de cobre(II)', 'óxido'], ['Cu2O', 'Óxido de cobre(I)', 'óxido'], ['H2CO3', 'Ácido carbónico', 'oxácido'], ['HClO', 'Ácido hipocloroso', 'oxácido'],
  ['Mg(OH)2', 'Hidróxido de magnesio', 'hidróxido'], ['Al(OH)3', 'Hidróxido de aluminio', 'hidróxido'], ['H2S', 'Ácido sulfhídrico (en solución acuosa)', 'hidrácido'], ['Na2S', 'Sulfuro de sodio', 'sal'], ['BaSO4', 'Sulfato de bario', 'sal']];
PACKS.nomenclatura = { name: 'Nomenclatura inorgánica', desc: NOMEN.length + ' compuestos: óxidos, ácidos, hidróxidos y sales',
  // la mitad pregunta el nombre y la mitad la fórmula, para practicar en ambos sentidos
  cards: () => NOMEN.map(([f, n, t], i) => i % 2 ? { id: 'n' + i, deck: 'pack:nomenclatura', sub: 'Nomenclatura · ' + t, q: 'Escribe la fórmula: ' + n, a: Chem.pretty(f) } : { id: 'n' + i, deck: 'pack:nomenclatura', sub: 'Nomenclatura · ' + t, q: `¿Cómo se llama ${Chem.pretty(f)}?`, a: n }) };
function openNomen() {
  if (!S.packs) migrateDecks();
  if (!S.packs.nomenclatura) { S.packs.nomenclatura = true; save(); toast('Paquete de nomenclatura activado'); }
  deck = 'pack:nomenclatura'; show('rep'); renderRepHome();
}

/* ===================== seguridad (SGA) ===================== */
const SGA = [
  ['GHS01', 'bomb', 'Explosivo', 'Puede explotar por calor, golpe o fricción.', 'Peróxidos orgánicos, nitroglicerina', 'Lejos de calor y golpes; cantidades mínimas.'],
  ['GHS02', 'flame', 'Inflamable', 'Arde con facilidad (líquidos, sólidos o gases).', 'Etanol, acetona, hexano', 'Sin llamas cerca; usar en cabina; tapar los frascos.'],
  ['GHS03', 'circle', 'Comburente', 'Llama sobre un círculo: aporta oxígeno y aviva un incendio.', 'Permanganato de potasio, peróxido de hidrógeno concentrado, nitratos', 'Lejos de combustibles y materia orgánica.'],
  ['GHS04', 'cylinder', 'Gas a presión', 'Cilindro con gas comprimido o licuado: puede explotar con calor; el licuado congela.', 'Cilindros de N₂, CO₂, O₂', 'Asegurar el cilindro con cadena; no calentar.'],
  ['GHS05', 'tube', 'Corrosivo', 'Destruye piel, ojos y metales.', 'HCl y H₂SO₄ concentrados, NaOH', 'Gafas y guantes; siempre ácido sobre agua, nunca al revés.'],
  ['GHS06', 'skull', 'Toxicidad aguda', 'Calavera: tóxico o mortal en pequeñas cantidades.', 'Metanol, cianuros, mercurio', 'Cabina de extracción; nunca pipetear con la boca.'],
  ['GHS07', 'alert', 'Nocivo o irritante', 'Signo de exclamación: irrita piel, ojos o vías respiratorias; nocivo.', 'Acetona (irrita los ojos), ácido acético diluido', 'Gafas; ventilar; lavarse las manos.'],
  ['GHS08', 'person', 'Peligro grave para la salud', 'Silueta con estrella: cancerígeno, mutágeno, tóxico para la reproducción o los órganos.', 'Benceno, cloroformo, formaldehído', 'Mínima exposición; cabina; consultar la ficha de seguridad.'],
  ['GHS09', 'fish', 'Peligro para el medio ambiente', 'Árbol y pez: tóxico para la vida acuática.', 'Sulfato de cobre, sales de metales pesados', 'Nunca por el desagüe: usar el recipiente de residuos.'],
];
function openSGA(sel) {
  const d = sel >= 0 ? SGA[sel] : null;
  openSheet(`<h2 class="sh-title">Pictogramas de seguridad</h2><p class="sub" style="margin:4px 0 12px">Sistema Globalmente Armonizado (SGA). Están en las etiquetas de los reactivos: rombo de borde rojo y símbolo negro.</p>
    ${d ? `<div class="tile"><span class="fl" style="margin-left:0">${d[0]}</span><h3 style="font-size:21px">${d[2]}</h3><p style="margin:6px 0;font-size:15px;line-height:1.45">${d[3]}</p><p class="sub" style="font-size:14px;margin:0">Ejemplos: ${d[4]}</p><p style="color:var(--red);font-size:14px;margin:8px 0 0">En el laboratorio: ${d[5]}</p></div><div class="gap"></div>` : ''}
    <div class="sga">${SGA.map((p, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}"><div class="dia">${ic(p[1])}</div>${p[2]}</button>`).join('')}</div>
    <p class="mini">Los símbolos de esta pantalla son una representación simplificada. Antes de usar un reactivo, lee su etiqueta y su ficha de datos de seguridad (FDS).</p>`);
  $$('.sga button').forEach(b => b.onclick = () => openSGA(+b.dataset.i));
}

/* ===================== informe ===================== */
const REPORT = [['Título y datos', 'Nombre de la práctica, integrantes, curso, fecha.'], ['Objetivos', 'Qué querías comprobar o medir. Empieza con un verbo: determinar, comparar, preparar…'],
  ['Marco teórico', 'Solo lo necesario para entender la práctica: reacciones, ecuaciones y conceptos, con citas.'], ['Materiales y reactivos', 'Lista con concentraciones, purezas y los pictogramas de seguridad de cada reactivo.'],
  ['Procedimiento', 'En pasado e impersonal (“se pesaron 2.00 g…”). Anota lo que cambió frente a la guía.'], ['Datos y resultados', 'Tablas con unidades y cifras significativas; gráficas con ejes rotulados.'],
  ['Cálculos', 'Un ejemplo completo de cada cálculo; el resto en tabla. Incluye promedio, desviación e incertidumbre.'], ['Análisis', 'Compara con el valor teórico (% de error). Explica por qué difieren: fuentes de error concretas.'],
  ['Conclusiones', 'Responde cada objetivo, con números. No repitas el análisis.'], ['Bibliografía', 'En el formato que pida tu profe (APA u otro). Incluye las fichas de seguridad consultadas.']];
function openReport() {
  openSheet(`<h2 class="sh-title">Informe de laboratorio</h2><p class="sub" style="margin:4px 0 12px">Estructura típica. Revisa siempre el formato que pide tu docente.</p>
    <ol class="steps-card" style="list-style:none;margin:0;padding:6px 16px">${REPORT.map(([t, d], i) => `<li><b class="n">${i + 1}</b><div><b>${t}</b><div class="sub" style="font-size:14px">${d}</div></div></li>`).join('')}</ol><div class="gap"></div>
    <button class="btn" id="rCopy" ${accSt('blue')}>Copiar plantilla</button><div class="gap"></div>
    <div class="callout">Truco: escribe “Datos y resultados” el mismo día de la práctica, cuando todo está fresco. Réplicas y Calibración te dan los números listos para la tabla.</div>`);
  $('#rCopy').onclick = async () => { const t = REPORT.map(([a, b], i) => `${i + 1}. ${a.toUpperCase()}\n(${b})\n`).join('\n'); try { await navigator.clipboard.writeText(t); toast('Plantilla copiada: pégala en tu documento'); } catch (e) { toast('No se pudo copiar en este navegador', 'sorprendida'); } };
}

/* ===================== datos: unidades, réplicas, calibración ===================== */
const UNITS = { 'Temperatura': ['°C', 'K', '°F'], 'Presión': { atm: 101325, kPa: 1000, Pa: 1, bar: 1e5, mmHg: 101325 / 760, psi: 6894.757 },
  'Energía': { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, BTU: 1055.06, kWh: 3.6e6 }, 'Masa': { kg: 1, g: 1e-3, mg: 1e-6, 'µg': 1e-9, lb: .453592, t: 1000 },
  'Volumen': { L: 1, mL: 1e-3, 'µL': 1e-6, 'm³': 1000, 'cm³': 1e-3, 'gal (US)': 3.78541, 'ft³': 28.3168 }, 'Longitud': { m: 1, cm: .01, mm: .001, 'µm': 1e-6, nm: 1e-9, km: 1000, in: .0254, ft: .3048 },
  'Flujo': { 'L/s': 1, 'L/min': 1 / 60, 'm³/h': 1000 / 3600, 'mL/min': 1 / 60000, 'gal/min': 3.78541 / 60 } };
const convUnit = (cat, v, a, b) => { if (cat === 'Temperatura') { const k = a === '°C' ? v + 273.15 : a === '°F' ? (v - 32) * 5 / 9 + 273.15 : v; return b === '°C' ? k - 273.15 : b === '°F' ? (k - 273.15) * 9 / 5 + 32 : k; } return v * UNITS[cat][a] / UNITS[cat][b]; };
function openUnits(cat) {
  const keys = Array.isArray(UNITS[cat]) ? UNITS[cat] : Object.keys(UNITS[cat]); let from = 0;
  openSheet(`<h2 class="sh-title">Conversor de unidades</h2><div class="chips wrapc">${Object.keys(UNITS).map(k => `<button class="chip${k === cat ? ' on' : ''}" data-c="${k}" style="--acc:var(--yelD)">${k}</button>`).join('')}</div><div class="gap"></div>
    ${numField('uIn', 'Valor')}<div class="gap"></div><span class="fl">Desde</span><div class="chips wrapc" id="uFrom" style="padding-top:0">${keys.map((k, i) => `<button class="chip${i ? '' : ' on'}" style="--acc:var(--ink2)">${k}</button>`).join('')}</div>
    <div class="gap"></div><span class="fl">Equivale a</span><div id="uOut"></div>`);
  $$('#sheetBody [data-c]').forEach(b => b.onclick = () => openUnits(b.dataset.c));
  const calc = () => { const v = val('uIn'); $('#uOut').innerHTML = isNaN(v) ? '' : `<div class="tile" style="padding:8px 16px">${keys.map((k, i) => i === from ? '' : `<div class="row" style="padding:7px 0;border-bottom:2px solid var(--line)"><b class="grow f" style="font-size:18px">${N(convUnit(cat, v, keys[from], k), 6)}</b><span class="sub">${k}</span></div>`).join('')}</div>`; };
  segBind('#uFrom', i => { from = i; calc(); }); $('#uIn').oninput = calc;
}
const T95 = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086, 25: 2.060, 30: 2.042, 40: 2.021, 60: 2.000, 120: 1.980 };
const Q95 = { 3: .970, 4: .829, 5: .710, 6: .625, 7: .568, 8: .526, 9: .493, 10: .466 };
const t95 = df => { if (T95[df]) return T95[df]; if (df > 120) return 1.96; let b = 1.96; Object.keys(T95).map(Number).forEach(k => { if (k <= df) b = T95[k]; }); return b; };
// números separados por comas, espacios, punto y coma o renglones; acepta coma decimal (10,12)
const numbers = txt => String(txt).replace(/[;\n\t]/g, ' ').split(' ').filter(Boolean).flatMap(tok => { tok = tok.replace(/^,|,$/g, ''); return (tok.split(',').length === 2 && !tok.includes('.')) ? [tok.replace(',', '.')] : tok.split(','); }).filter(t => t !== '' && !isNaN(+t)).map(Number);
function openStats() {
  openSheet(`<h2 class="sh-title">Estadística de réplicas</h2><p class="sub" style="margin:4px 0 12px">Pega tus mediciones (separadas por comas, espacios o renglones). Ideal para informes de análisis químico e instrumental.</p>
    <textarea class="field" id="stIn" style="min-height:90px" placeholder="Ej.: 10.12, 10.15, 10.09, 10.31, 10.11"></textarea><div id="stOut"></div>`);
  $('#stIn').value = S.lab.stats || '';
  const calc = () => {
    S.lab.stats = $('#stIn').value; save();
    const xs = numbers($('#stIn').value), n = xs.length, out = $('#stOut');
    if (n < 2) { out.innerHTML = '<p class="mini">Escribe al menos 2 mediciones.</p>'; return; }
    const mean = xs.reduce((a, b) => a + b, 0) / n, s = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)), ci = t95(n - 1) * s / Math.sqrt(n);
    const so = [...xs].sort((a, b) => a - b); let q = '';
    if (n >= 3 && n <= 10 && so[n - 1] > so[0]) {
      const rng = so[n - 1] - so[0], lo = (so[1] - so[0]) / rng, hi = (so[n - 1] - so[n - 2]) / rng, qq = Math.max(lo, hi), v = hi >= lo ? so[n - 1] : so[0], rej = qq > Q95[n];
      q = `<div class="res" style="text-align:left"><span class="fl">Prueba Q de Dixon (95 %)</span><div style="font-weight:900;color:${rej ? 'var(--red)' : 'var(--mintD)'}">${rej ? 'Puedes descartar ' + N(v, 5) : 'No descartes ningún dato (el más alejado es ' + N(v, 5) + ')'}</div><div class="msg">Q calculado = ${qq.toFixed(3)} · Q crítico = ${Q95[n].toFixed(3)} (n = ${n})</div></div>`;
    }
    const card = (k, v) => `<div class="tile" style="padding:12px 14px"><span class="fl" style="margin-left:0">${k}</span><b class="f" style="font-size:22px">${v}</b></div>`;
    out.innerHTML = `<div class="gap"></div><div class="g2">${card('Promedio', N(mean, 5))}${card('Desviación (s)', N(s, 3))}${card('RSD', (100 * s / Math.abs(mean)).toFixed(2) + ' %')}${card('n', n)}</div>
      <div class="res" style="text-align:left"><span class="fl">Reporta así (95 % de confianza)</span><div class="big">${N(mean, 5)} ± ${N(ci, 2)}</div><div class="msg">Intervalo de confianza: x̄ ± t·s/√n, con t = ${t95(n - 1).toFixed(3)} para ${n - 1} grados de libertad.</div></div>${q}`;
  };
  $('#stIn').oninput = calc; calc();
}
function openCalib() {
  openSheet(`<h2 class="sh-title">Curva de calibración</h2><p class="sub" style="margin:4px 0 12px">Regresión lineal por mínimos cuadrados para análisis instrumental (espectrofotometría, AA, HPLC…).</p>
    <textarea class="field" id="caIn" style="min-height:130px" placeholder="Un punto por renglón: concentración, señal&#10;0, 0.002&#10;2, 0.151&#10;4, 0.298"></textarea><div class="gap"></div>
    ${numField('caY', 'Señal de la muestra (ej.: absorbancia)')}<div id="caOut"></div>`);
  $('#caIn').value = S.lab.calib || '';
  const calc = () => {
    S.lab.calib = $('#caIn').value; save();
    const pts = $('#caIn').value.split('\n').map(numbers).filter(a => a.length >= 2).map(a => ({ x: a[0], y: a[1] })), out = $('#caOut');
    if (pts.length < 3) { out.innerHTML = '<p class="mini">Escribe al menos 3 puntos (estándares): x = concentración, y = señal.</p>'; return; }
    const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
    let sxx = 0, sxy = 0, syy = 0; pts.forEach(p => { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; });
    if (!sxx) { out.innerHTML = '<div class="res err"><div class="big">Las concentraciones no pueden ser todas iguales.</div></div>'; return; }
    const m = sxy / sxx, b = my - m * mx, r2 = syy ? sxy * sxy / (sxx * syy) : 1;
    const X = pts.map(p => p.x), Y = pts.map(p => p.y), x0 = Math.min(0, ...X), x1 = Math.max(...X), y0 = Math.min(0, ...Y), y1 = Math.max(...Y);
    const W = 300, H = 170, px = x => 34 + (x - x0) / (x1 - x0 || 1) * (W - 44), py = y => 10 + (H - 30) - (y - y0) / (y1 - y0 || 1) * (H - 30);
    const svg = `<svg class="plot" viewBox="0 0 ${W} ${H}"><line x1="34" y1="${H - 20}" x2="${W - 10}" y2="${H - 20}" stroke="var(--line)" stroke-width="2"/><line x1="34" y1="10" x2="34" y2="${H - 20}" stroke="var(--line)" stroke-width="2"/>
      <line x1="${px(x0)}" y1="${py(m * x0 + b)}" x2="${px(x1)}" y2="${py(m * x1 + b)}" stroke="var(--blue)" stroke-width="2.5"/>${pts.map(p => `<circle cx="${px(p.x)}" cy="${py(p.y)}" r="5" fill="var(--red)"/>`).join('')}
      <text x="34" y="${H - 4}" font-size="10" fill="var(--ink2)">${N(x0, 3)}</text><text x="${W - 10}" y="${H - 4}" font-size="10" fill="var(--ink2)" text-anchor="end">${N(x1, 3)}</text><text x="2" y="16" font-size="10" fill="var(--ink2)">${N(y1, 3)}</text></svg>`;
    let h = `<div class="gap"></div><div class="tile" style="padding:10px">${svg}</div><div class="res" style="text-align:left"><div class="big" style="color:var(--ink);font-size:22px">y = ${N(m, 4)} x ${b >= 0 ? '+' : '−'} ${N(Math.abs(b), 3)}</div>
      <div class="msg" style="color:${r2 >= .995 ? 'var(--mintD)' : 'var(--yelD)'};font-weight:900">R² = ${r2.toFixed(4)} · ${r2 >= .995 ? 'buena linealidad' : 'revisa los puntos: R² bajo para una curva de calibración'}</div></div>`;
    const y = val('caY');
    if (!isNaN(y)) { const x = (y - b) / m, out2 = x < Math.min(...X) || x > x1; h += `<div class="res" style="text-align:left"><span class="fl">Concentración de la muestra</span><div class="big">${N(x, 4)}</div><div class="msg" style="${out2 ? 'color:var(--red);font-weight:800' : ''}">${out2 ? `Ojo: está fuera del rango de tus estándares (${N(Math.min(...X), 3)} a ${N(x1, 3)}). Diluye o agrega estándares.` : 'En las mismas unidades que tus estándares. Multiplica por el factor de dilución si diluiste la muestra.'}</div></div>`; }
    out.innerHTML = h;
  };
  $('#caIn').oninput = calc; $('#caY').oninput = calc; calc();
}
const CONSTS = [['Número de Avogadro', 'Nₐ', '6.02214076 × 10²³ mol⁻¹', '6.02214076E23'], ['Constante de los gases', 'R', '8.314 J/(mol·K)', '8.314462618'], ['', 'R', '0.08206 L·atm/(mol·K)', '0.0820574'],
  ['', 'R', '62.36 L·mmHg/(mol·K)', '62.3636'], ['', 'R', '1.987 cal/(mol·K)', '1.98720'], ['Constante de Faraday', 'F', '96 485 C/mol', '96485.33212'], ['Constante de Planck', 'h', '6.62607015 × 10⁻³⁴ J·s', '6.62607015E-34'],
  ['Velocidad de la luz', 'c', '2.99792458 × 10⁸ m/s', '2.99792458E8'], ['Constante de Boltzmann', 'k', '1.380649 × 10⁻²³ J/K', '1.380649E-23'], ['Carga elemental', 'e', '1.602176634 × 10⁻¹⁹ C', '1.602176634E-19'],
  ['Producto iónico del agua (25 °C)', 'Kw', '1.0 × 10⁻¹⁴', '1E-14'], ['Volumen molar (0 °C, 1 atm)', 'Vm', '22.414 L/mol', '22.414'], ['Gravedad estándar', 'g', '9.80665 m/s²', '9.80665'],
  ['Atmósfera', 'atm', '101 325 Pa = 760 mmHg', '101325'], ['Cero absoluto', '0 K', '−273.15 °C', '-273.15'], ['Calor específico del agua', 'c', '4.184 J/(g·°C)', '4.184']];
function openConsts() {
  openSheet(`<h2 class="sh-title">Constantes</h2><p class="sub" style="margin:4px 0 12px">Toca una para copiar su valor (para pegarlo en la calculadora).</p>
    <div class="tile" style="padding:4px 14px">${CONSTS.map((c, i) => `<button class="row" data-i="${i}" style="width:100%;text-align:left;padding:9px 0;border-bottom:2px solid var(--line)"><b style="width:44px;color:var(--blue);font-size:18px">${c[1]}</b><div class="grow">${c[0] ? `<small class="sub" style="font-size:12px;display:block">${c[0]}</small>` : ''}<span style="font-size:15px">${c[2]}</span></div></button>`).join('')}</div>
    <p class="mini">Valores exactos del SI 2019 (Nₐ, h, k, e, c) y valores de referencia comunes.</p>`);
  $$('#sheetBody [data-i]').forEach(b => b.onclick = async () => { const v = CONSTS[+b.dataset.i][3]; try { await navigator.clipboard.writeText(v); toast('Copiado: ' + v); } catch (e) { toast(v, null); } });
}

/* ===================== datos curiosos y reto ===================== */
const factOfDay = () => TRIVIA.facts.length ? TRIVIA.facts[((dayNum() * 7) % TRIVIA.facts.length + TRIVIA.facts.length) % TRIVIA.facts.length] : null;
const mapleHero = (id, h = 120) => `<div class="hero" style="margin-top:-6px;min-height:${h + 30}px"><div class="say" id="${id}Say" style="white-space:normal;width:92%;text-align:center;font-size:16px;line-height:1.4"></div><div class="plat"></div><div class="mw" id="${id}Mw" style="margin-bottom:18px"><img id="${id}Img" src="img/hq/front.webp" alt="" style="height:${h}px"></div></div>`;
function openTrivia(cat = 'Todos', idx = -1) {
  const facts = TRIVIA.facts.filter(f => cat === 'Todos' || f.c === cat); let i = idx >= 0 ? idx : Math.floor(Math.random() * facts.length);
  openSheet(`<h2 class="sh-title">Datos curiosos</h2><div class="chips wrapc">${['Todos', 'Química', 'Ciencia', 'Colombia', 'Estudiar'].map(c => `<button class="chip${c === cat ? ' on' : ''}" data-c="${c}" style="--acc:var(--yelD)">${c}</button>`).join('')}</div>
    <div class="gap"></div><span class="fl" id="tvTag"></span>${mapleHero('tv', 120)}
    <div class="row"><button class="btn grow" id="tvNext" style="--acc:var(--yel);--accD:var(--yelD);color:#5A4410">Otro dato</button><button class="btn grow" id="tvQuiz" ${accSt('lil')}>Reto rápido</button></div>`);
  const m = new Maple($('#tvMw'), $('#tvImg')); m.idle(); sheetOnClose = () => m.clear();
  const draw = () => { const f = facts[i % facts.length]; $('#tvSay').textContent = f.t; $('#tvTag').textContent = '¿Sabías que…?  ·  ' + f.c; };
  $$('#sheetBody [data-c]').forEach(b => b.onclick = () => openTrivia(b.dataset.c));
  $('#tvNext').onclick = () => { i = (i + 1 + Math.floor(Math.random() * Math.max(1, facts.length - 1))) % facts.length; draw(); Math.random() < .5 ? m.hop() : m.talk(); };
  $('#tvQuiz').onclick = openQuiz;
  draw();
}
function openQuiz() {
  const qs = shuffle([...TRIVIA.quiz]).slice(0, 5); let i = 0, ok = 0;
  openSheet(`<h2 class="sh-title">Reto rápido</h2><div class="gap"></div><div class="progress"><i id="qzBar" style="width:0;background:var(--lil)"></i></div>
    <div class="hero" style="min-height:130px"><div class="plat"></div><div class="mw" id="qzMw" style="margin-bottom:18px"><img id="qzImg" src="img/hq/front.webp" alt="" style="height:105px"></div></div><div id="qzBox"></div>`);
  const m = new Maple($('#qzMw'), $('#qzImg')); m.idle(); sheetOnClose = () => m.clear();
  const draw = () => {
    $('#qzBar').style.width = (100 * i / qs.length) + '%'; const box = $('#qzBox');
    if (i >= qs.length) {
      if (ok > (S.triviaBest || 0)) { S.triviaBest = ok; save(); }
      box.innerHTML = `<h2 class="center" style="font-size:30px">${ok} de ${qs.length}</h2><p class="sub center">${ok === qs.length ? '¡Perfecto! Eres una enciclopedia' : ok >= 3 ? '¡Muy bien!' : 'Cada error es un dato nuevo que ya sabes'} · Tu récord: ${S.triviaBest || 0}</p><div class="gap"></div><button class="btn" id="qzAgain" ${accSt('lil')}>Otra ronda</button>`;
      $('#qzAgain').onclick = openQuiz; if (ok >= 4) { m.celebrate(); confetti(); sfx('end'); } else m.wave(); return;
    }
    const q = qs[i], order = shuffle([0, 1, 2, 3]); let done = false;
    box.innerHTML = `<span class="fl">Pregunta ${i + 1} de ${qs.length}</span><h3 style="font-size:19px;margin:0 0 14px">${esc(q.q)}</h3>${order.map(k => `<button class="qopt" data-k="${k}">${esc(q.o[k])}</button>`).join('')}<p class="sub" id="qzEx" style="font-size:14px"></p><button class="btn hide" id="qzNext" ${accSt('lil')}>${i === qs.length - 1 ? 'Ver resultado' : 'Siguiente'}</button>`;
    $$('.qopt').forEach(b => b.onclick = () => {
      if (done) return; done = true; const good = +b.dataset.k === q.a;
      if (good) { ok++; sfx('ok'); m.hop(); } else { sfx('no'); m.pose('emo_sorprendida', 'idle', 900, 'a-shake', 450); }
      $$('.qopt').forEach(x => { if (+x.dataset.k === q.a) x.classList.add('ok'); else if (x === b) x.classList.add('no'); });
      $('#qzEx').textContent = (good ? '¡Correcto! ' : `Era: ${q.o[q.a]}. `) + q.e; $('#qzNext').classList.remove('hide');
    });
    $('#qzNext').onclick = () => { i++; draw(); };
  };
  draw();
}

/* ===================== horario de clases ===================== */
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], DAYS_L = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const CCOL = ['#FF5B4D', '#46A7F5', '#2FC79B', '#FFC53D', '#9C8CF2', '#FF8FB1', '#5B6CC9', '#F2994A'];
const dowM = (d = new Date()) => (d.getDay() + 6) % 7;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const hm = m => Math.floor(m / 60) + ':' + pad(m % 60);
const durTxt = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : '');
const classesOn = d => (S.classes || []).filter(c => c.days.includes(d)).sort((a, b) => a.start - b.start);
const cls = id => (S.classes || []).find(c => c.id === id);
const deckFor = c => (S.decks || []).find(d => d.name.toLowerCase() === c.name.toLowerCase());
const recalledToday = c => (c.recalls || []).some(r => r.day === dayKey());
function todayInfo() {
  const list = classesOn(dowM()), now = nowMin(), info = { list, now: null, next: null, gaps: [], recall: null };
  list.forEach(c => { if (c.start <= now && now < c.end) info.now = c; else if (c.start > now && !info.next) info.next = c; else if (c.end <= now && now - c.end <= 240 && !recalledToday(c)) info.recall = c; });
  for (let i = 0; i < list.length - 1; i++) { const a = list[i].end, b = list[i + 1].start; if (b - a >= 40 && b > now) info.gaps.push({ from: Math.max(a, now), to: b, after: list[i] }); }
  return info;
}
const clsRow = (c, nowOn = false) => `<button class="cls" data-cls="${c.id}"><span class="bar" style="background:${CCOL[c.color % 8]}"></span><span class="tm">${hm(c.start)}<small>${hm(c.end)}</small></span><span class="grow"><b>${esc(c.name)}</b>${nowOn || c.room ? `<small class="${nowOn ? 'now' : ''}">${nowOn ? 'Ahora' + (c.room ? ' · ' : '') : ''}${esc(c.room || '')}</small>` : ''}</span>${ic('chev', 'color:var(--ink2);font-size:20px')}</button>`;
const gapRow = (a, b, after) => { const mins = b - a, blk = mins >= 70 ? 45 : 25; return `<button class="gaprow" data-gap="${blk}|${after ? esc(after.name) : ''}">${ic('timer')}Hueco de ${durTxt(mins)} · bloque de ${blk} min</button>`; };
function bindSchedRows(root = document) {
  root.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => openClass(b.dataset.cls));
  root.querySelectorAll('[data-gap]').forEach(b => b.onclick = () => {
    const [blk, name] = b.dataset.gap.split('|');
    plan.task = name ? 'Repasar ' + name : 'Bloque en el hueco'; plan.focus = +blk; plan.brk = +blk === 45 ? 10 : 5;
    closeSheet(); show('foco'); renderPlan();
  });
}
function renderClasses() {
  const box = $('#hoyClasses'); if (!box) return;
  if (!(S.classes || []).length) { box.innerHTML = `<button class="big-tile" id="schAdd"><div class="ic" style="background:var(--blue)">${ic('cal')}</div><div><b>Organiza tu horario de clases</b><small>Maple te muestra la siguiente clase y encuentra huecos para estudiar</small></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}</button><div class="gap"></div>`; $('#schAdd').onclick = () => openSchedule(); return; }
  const info = todayInfo(); let h = `<div class="lh"><div class="label">${info.list.length ? 'Hoy en clase' : 'Hoy no tienes clases'}</div><button id="schSee">Ver horario</button></div><div style="height:8px"></div>`;
  if (info.recall) h += `<button class="big-tile" data-recall="${info.recall.id}"><div class="ic" style="background:var(--pink)">${ic('brain')}</div><div><b>¿Qué recuerdas de ${esc(info.recall.name)}?</b><small>3 minutos sin apuntes: fija lo de hoy</small></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}</button>`;
  if (info.now) h += clsRow(info.now, true);
  if (info.next) h += clsRow(info.next) + `<p class="mini" style="text-align:right;margin:-4px 4px 10px">Siguiente clase en ${durTxt(info.next.start - nowMin())}</p>`;
  if (info.gaps.length) h += gapRow(info.gaps[0].from, info.gaps[0].to, info.gaps[0].after);
  if (info.list.length && !info.now && !info.next && !info.recall) h += '<p class="mini" style="margin:0 4px 10px">Terminaste tus clases de hoy.</p>';
  box.innerHTML = h + '<div class="gap"></div>';
  $('#schSee').onclick = () => openSchedule();
  box.querySelectorAll('[data-recall]').forEach(b => b.onclick = () => openRecall(b.dataset.recall));
  bindSchedRows(box);
}
function openSchedule(day = dowM()) {
  const list = classesOn(day); let h = '', prev = -1;
  list.forEach(c => { if (prev >= 0 && c.start - prev >= 40) h += gapRow(prev, c.start, null); h += clsRow(c); prev = c.end; });
  openSheet(`<h2 class="sh-title">Mi horario</h2><div class="gap"></div><div class="seg" id="schDays">${DAYS.map((d, i) => `<button class="${i === day ? 'on' : ''}" style="font-size:14px">${d}</button>`).join('')}</div><div class="gap"></div>
    ${h || `<p class="sub center">Sin clases el ${DAYS_L[day]}.</p>`}<div class="gap"></div><button class="btn" id="schNew" ${accSt('blue')}>${ic('plus')}Agregar clase</button>
    ${(S.classes || []).length ? '' : '<p class="mini center">Con tu horario, Maple te muestra la siguiente clase, encuentra huecos para estudiar y te invita a recordar lo visto apenas sale la clase.</p>'}`);
  $$('#schDays button').forEach((b, i) => b.onclick = () => openSchedule(i));
  $('#schNew').onclick = () => openClassForm(null, day);
  bindSchedRows($('#sheetBody')); sheetOnClose = renderHoy;
}
function openClassForm(id, day = 0) {
  const c = id ? cls(id) : null;
  const st = c ? { days: [...c.days], start: c.start, end: c.end, color: c.color } : { days: [day], start: 480, end: 600, color: (S.classes || []).length % 8 };
  openSheet(`<h2 class="sh-title">${c ? 'Editar clase' : 'Nueva clase'}</h2><div class="gap"></div>
    <input class="field" id="cfName" maxlength="40" placeholder="Materia (ej.: Cálculo diferencial)" value="${c ? esc(c.name) : ''}">
    ${(S.decks || []).length ? `<div class="chips wrapc">${S.decks.map(d => `<button class="chip" data-n="${esc(d.name)}">${esc(d.name)}</button>`).join('')}</div>` : ''}<div class="gap"></div>
    <span class="fl">Días</span><div class="chips wrapc" id="cfDays" style="padding-top:0"></div><div class="gap"></div>
    <div class="g2"><div><span class="fl">Empieza</span><div class="stepper2"><button data-s="start|-15">${ic('back')}</button><b id="cfS"></b><button data-s="start|15">${ic('chev')}</button></div></div>
    <div><span class="fl">Termina</span><div class="stepper2"><button data-s="end|-15">${ic('back')}</button><b id="cfE"></b><button data-s="end|15">${ic('chev')}</button></div></div></div><div class="gap"></div>
    <input class="field" id="cfRoom" maxlength="40" placeholder="Salón o enlace (opcional)" value="${c ? esc(c.room || '') : ''}"><div class="gap"></div>
    <span class="fl">Color</span><div class="swatch" id="cfCol"></div><div class="gap2"></div>
    <button class="btn" id="cfSave" ${accSt('blue')}>Guardar</button>${c ? '<button class="link" id="cfDel" style="color:var(--red)">Eliminar clase</button>' : ''}`);
  const draw = () => {
    $('#cfDays').innerHTML = DAYS.map((d, i) => `<button class="chip${st.days.includes(i) ? ' on' : ''}" data-d="${i}" style="--acc:${CCOL[st.color]}">${d}</button>`).join('');
    $$('#cfDays [data-d]').forEach(b => b.onclick = () => { const i = +b.dataset.d; st.days = st.days.includes(i) ? st.days.filter(x => x !== i) : [...st.days, i]; draw(); });
    $('#cfCol').innerHTML = CCOL.map((col, i) => `<button class="${i === st.color ? 'on' : ''}" data-c="${i}" style="background:${col}"></button>`).join('');
    $$('#cfCol [data-c]').forEach(b => b.onclick = () => { st.color = +b.dataset.c; draw(); });
    $('#cfS').textContent = hm(st.start); $('#cfE').textContent = hm(st.end);
  };
  $$('#sheetBody [data-s]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.s.split('|'); st[k] = Math.min(1425, Math.max(300, st[k] + +d)); if (st.end <= st.start) { if (k === 'start') st.end = st.start + 60; else st.end = st.start + 15; } draw(); });
  $$('#sheetBody [data-n]').forEach(b => b.onclick = () => $('#cfName').value = b.dataset.n);
  $('#cfSave').onclick = () => {
    const n = $('#cfName').value.trim(); if (!n) return toast('Escribe la materia', 'sorprendida'); if (!st.days.length) return toast('Elige al menos un día', 'sorprendida');
    const data = { name: n, days: st.days.sort(), start: st.start, end: st.end, room: $('#cfRoom').value.trim(), color: st.color };
    if (c) Object.assign(c, data);
    else { S.classes = S.classes || []; S.classes.push(Object.assign({ id: 'h' + Date.now(), recalls: [], grades: [] }, data)); if (!S.decks) migrateDecks(); if (!deckFor(data)) S.decks.push({ id: 'k' + Date.now(), name: n }); }
    save(); toast('Clase guardada'); openSchedule(st.days[0]);
  };
  if (c) $('#cfDel').onclick = () => { S.classes = S.classes.filter(x => x !== c); save(); openSchedule(); toast('Clase eliminada', 'neutral', () => { S.classes.push(c); save(); openSchedule(); }); };
  draw(); sheetOnClose = renderHoy;
}
function gradeCalc(c) {
  let dw = 0, acc = 0, tw = 0; (c.grades || []).forEach(g => { tw += g.w; if (g.n != null && g.n !== '') { dw += g.w; acc += g.n * g.w / 100; } });
  const pass = S.passGrade || 3, lw = Math.max(0, 100 - dw); return { dw, acc, tw, lw, need: lw > 0 ? (pass - acc) / (lw / 100) : 0, pass };
}
function gradeSummary(c) {
  if (!(c.grades || []).length) return 'Anota tus notas y su porcentaje';
  const r = gradeCalc(c); if (r.lw <= 0) return 'Nota final: ' + r.acc.toFixed(2); if (r.need <= 0) return '¡Ya pasaste! Llevas ' + r.acc.toFixed(2);
  if (r.need > 5) return `Llevas ${r.acc.toFixed(2)} · se puso difícil`; return `Necesitas ${r.need.toFixed(1)} en el ${Math.round(r.lw)} % que falta`;
}
function openClass(id) {
  const c = cls(id); if (!c) return; const dk = deckFor(c);
  const recalls = (c.recalls || []).slice(-3).reverse();
  openSheet(`<h2 class="sh-title"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${CCOL[c.color % 8]};margin-right:8px"></span>${esc(c.name)}</h2>
    <p class="sub" style="margin:4px 0 14px">${c.days.map(d => DAYS[d]).join(', ')} · ${hm(c.start)}–${hm(c.end)}${c.room ? ' · ' + esc(c.room) : ''}</p>
    <button class="big-tile" id="clRec"><div class="ic" style="background:var(--pink)">${ic('brain')}</div><div><b>¿Qué recuerdas de la clase?</b><small>3 minutos sin mirar apuntes</small></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}</button>
    <button class="big-tile" id="clGr"><div class="ic" style="background:var(--mint)">${ic('target')}</div><div><b>¿Cuánto necesito?</b><small>${gradeSummary(c)}</small></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}</button>
    ${dk ? `<button class="big-tile" id="clCards"><div class="ic" style="background:var(--blue)">${ic('cards')}</div><div><b>Tarjetas de esta materia</b><small>${S.custom.filter(x => x.deck === dk.id).length} tarjetas</small></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}</button>` : ''}
    ${recalls.length ? `<div class="gap"></div><div class="label">Lo que recordaste</div>${recalls.map(r => `<div class="tile" style="padding:12px 14px;margin-bottom:8px"><span class="fl" style="margin-left:0">${shortDate(keyToNum(r.day))}</span><div style="font-size:14px;line-height:1.45;white-space:pre-wrap">${esc(r.text)}</div></div>`).join('')}` : ''}
    <div class="gap"></div><button class="btn soft" id="clEdit">Editar clase</button><button class="link" id="clBack">Ver horario</button>`);
  $('#clRec').onclick = () => openRecall(id); $('#clGr').onclick = () => openGrades(id); $('#clEdit').onclick = () => openClassForm(id); $('#clBack').onclick = () => openSchedule();
  if (dk) $('#clCards').onclick = () => { deck = dk.id; closeSheet(); show('rep'); renderRepHome(); };
  sheetOnClose = renderHoy;
}
function openRecall(id) {
  const c = cls(id); if (!c) return;
  openSheet(`<h2 class="sh-title">¿Qué recuerdas de ${esc(c.name)}?</h2><p class="sub" style="margin:4px 0 12px">Escribe todo lo que recuerdes de la clase, sin mirar apuntes. Recordar justo después ayuda a no olvidar, y lo que no sale te muestra qué repasar.</p>
    <div class="bigtime" id="rcT">3:00</div><textarea class="field" id="rcTx" placeholder="Ideas, fórmulas, ejemplos, dudas… lo que salga"></textarea><div class="gap"></div>
    <button class="btn" id="rcSave" ${accSt('pink')}>Guardar</button><button class="link" id="rcCard">Mejor, hacer una tarjeta</button>`);
  const end = Date.now() + 180000, t = setInterval(() => { const l = (end - Date.now()) / 1000; const e = $('#rcT'); if (!e) return clearInterval(t); e.textContent = l > 0 ? fmt(l) : '¡Tiempo!'; if (l <= 0) { clearInterval(t); sfx('brk'); } }, 500);
  sheetOnClose = () => { clearInterval(t); renderHoy(); };
  setTimeout(() => $('#rcTx') && $('#rcTx').focus(), 350);
  $('#rcSave').onclick = () => { const tx = $('#rcTx').value.trim(); if (!tx) return toast('Escribe aunque sea una idea', 'sorprendida'); (c.recalls = c.recalls || []).push({ day: dayKey(), text: tx }); c.recalls = c.recalls.slice(-20); save(); toast('¡Bien! Lo que recordaste queda guardado', 'risa'); openClass(id); };
  $('#rcCard').onclick = () => { const dk = deckFor(c); if (dk) deck = dk.id; closeSheet(); show('rep'); $('#toolNew').click(); };
}
function openGrades(id) {
  const c = cls(id); if (!c) return; c.grades = c.grades || [];
  openSheet(`<h2 class="sh-title">¿Cuánto necesito?</h2><p class="sub" style="margin:4px 0 12px">${esc(c.name)} · escala de 0 a 5</p><div id="grRes"></div><div class="gap"></div><div id="grList"></div>
    <div class="row"><input class="field grow" id="grN" maxlength="30" placeholder="Evaluación (ej.: Parcial 1)"><input class="field" id="grW" inputmode="numeric" maxlength="3" placeholder="%" style="width:70px;text-align:center;padding:16px 6px"><button class="rbtn" id="grAdd" style="width:56px;height:56px;background:var(--mint);color:#fff">${ic('plus')}</button></div>
    <div class="gap"></div><div class="row"><span class="sub" style="font-size:14px;flex:none">Nota para pasar</span><div class="seg grow" id="grPass">${[3, 3.5, 4].map(p => `<button class="${(S.passGrade || 3) === p ? 'on' : ''}">${p.toFixed(1)}</button>`).join('')}</div></div>
    <button class="link" id="grBack">Volver a ${esc(c.name)}</button>`);
  const result = () => {
    const r = gradeCalc(c), box = $('#grRes');
    if (!c.grades.length) { box.innerHTML = '<div class="callout">Agrega cada evaluación con su porcentaje (parciales, talleres, final…). Las que aún no tienen nota, déjalas vacías.</div>'; return; }
    let big, msg, col;
    if (r.lw <= 0) { big = r.acc.toFixed(2); const ok = r.acc >= r.pass - .001; msg = 'Tu nota final. ' + (ok ? '¡Pasaste!' : 'Faltó poco: habla con tu profe sobre opciones de recuperación.'); col = ok ? 'var(--mint)' : 'var(--red)'; }
    else if (r.need <= 0) { big = '¡Ya pasaste!'; msg = `Llevas ${r.acc.toFixed(2)} de ${r.pass.toFixed(1)}, y aún falta el ${Math.round(r.lw)} %.`; col = 'var(--mint)'; }
    else if (r.need > 5) { big = r.need.toFixed(1); msg = `Necesitarías más de 5 en el ${Math.round(r.lw)} % que falta. Busca a tu profe o a la monitoría: a veces hay actividades de recuperación.`; col = 'var(--red)'; }
    else { big = r.need.toFixed(1); msg = `Es el promedio que necesitas en el ${Math.round(r.lw)} % que falta para llegar a ${r.pass.toFixed(1)}. Llevas ${r.acc.toFixed(2)}.`; col = r.need > 3.8 ? 'var(--yelD)' : 'var(--mint)'; }
    box.innerHTML = `<div class="res"><div class="big" style="color:${col};font-size:40px">${big}</div><div class="msg" style="color:var(--ink)">${msg}</div>${Math.abs(r.tw - 100) > .5 ? `<div class="msg" style="color:var(--red);font-weight:800">Ojo: los porcentajes suman ${Math.round(r.tw)} %, no 100 %.</div>` : ''}</div>`;
  };
  const list = () => {
    $('#grList').innerHTML = c.grades.map((g, i) => `<div class="grade"><b>${esc(g.name)}</b><span>${g.w} %</span><input class="field" data-g="${i}" inputmode="decimal" maxlength="4" placeholder="–" value="${g.n == null ? '' : g.n}"><button class="x" data-x="${i}">${ic('x')}</button></div>`).join('');
    $$('#grList [data-g]').forEach(inp => inp.oninput = () => { const t = inp.value.replace(',', '.').trim(), g = c.grades[+inp.dataset.g]; if (t === '') g.n = null; else if (!isNaN(+t) && +t >= 0 && +t <= 5) g.n = +t; else return; save(); result(); });
    $$('#grList [data-x]').forEach(b => b.onclick = () => { c.grades.splice(+b.dataset.x, 1); save(); list(); });
    result();
  };
  $('#grAdd').onclick = () => { const n = $('#grN').value.trim(), w = parseInt($('#grW').value, 10); if (!n || !(w > 0 && w <= 100)) return toast('Escribe el nombre y el porcentaje (1 a 100)', 'sorprendida'); c.grades.push({ name: n, w, n: null }); $('#grN').value = ''; $('#grW').value = ''; save(); list(); };
  segBind('#grPass', i => { S.passGrade = [3, 3.5, 4][i]; save(); result(); });
  $('#grBack').onclick = () => openClass(id);
  list(); sheetOnClose = renderHoy;
}

/* ===================== Inicio: clases y dato del día ===================== */
function renderHoyExtra() {
  renderClasses();
  const f = factOfDay(), box = $('#hoyFact'); if (!box) return;
  if (!f) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="gap"></div><button class="fact" id="factBtn"><span class="k">${ic('bulb')} ¿Sabías que…?</span>${esc(f.t)}</button>`;
  $('#factBtn').onclick = () => { const list = TRIVIA.facts.filter(x => x.c === f.c); openTrivia(f.c, list.indexOf(f)); };
}
const _renderHoy = renderHoy;
renderHoy = function () { const r = _renderHoy.apply(this, arguments); try { renderHoyExtra(); } catch (e) {} return r; };

/* ===================== Repasar: editar y borrar tarjetas propias ===================== */
const _renderRep = renderRepHome;
renderRepHome = function () {
  const r = _renderRep.apply(this, arguments);
  let b = $('#repEdit');
  if (!b) { b = el('button', { class: 'big-tile', id: 'repEdit' }); $('#toolNew').after(b); }
  const mine = !deck.startsWith('pack:') && deck !== 'all', n = S.custom.filter(c => mine ? c.deck === deck : true).length;
  b.classList.toggle('hide', !n);
  b.innerHTML = `<div class="ic" style="background:var(--lil)">${ic('pen')}</div><div><b>Ver y editar mis tarjetas</b><small>${mine ? esc(deckName(deck)) + ' · ' : ''}${n} tarjeta${n === 1 ? '' : 's'}</small></div>${ic('chev', 'margin-left:auto;color:var(--ink2);font-size:22px')}`;
  b.onclick = () => openMyCards(mine ? deck : 'all');
  return r;
};
function openMyCards(dk) {
  const draw = () => {
    const list = S.custom.filter(c => dk === 'all' || c.deck === dk), box = $('#mcList'); if (!box) return;
    box.innerHTML = list.length ? list.map(c => `<div class="tile" style="padding:12px 14px;margin-bottom:8px"><div class="row" style="align-items:flex-start"><div class="grow"><b style="font-size:15px">${esc(c.q)}</b><div class="sub" style="font-size:13px;margin-top:2px">${esc(c.a)}</div>${dk === 'all' ? `<small class="pill" style="margin-top:6px">${esc(deckName(c.deck))}</small>` : ''}</div>
      <button class="rbtn" data-e="${c.id}" style="width:38px;height:38px;font-size:17px">${ic('pen')}</button><button class="rbtn" data-d="${c.id}" style="width:38px;height:38px;font-size:17px;color:var(--red)">${ic('x')}</button></div></div>`).join('') : '<p class="sub center">No hay tarjetas propias aquí.</p>';
    $$('#mcList [data-e]').forEach(b => b.onclick = () => openEditCard(b.dataset.e, dk));
    $$('#mcList [data-d]').forEach(b => b.onclick = () => { const c = S.custom.find(x => x.id === b.dataset.d), i = S.custom.indexOf(c); S.custom.splice(i, 1); save(); draw(); toast('Tarjeta borrada', 'neutral', () => { S.custom.splice(Math.min(i, S.custom.length), 0, c); save(); if ($('#mcList')) draw(); }); });
  };
  openSheet(`<h2 class="sh-title">${dk === 'all' ? 'Mis tarjetas' : esc(deckName(dk))}</h2><div class="gap"></div><div id="mcList"></div>`);
  draw(); sheetOnClose = renderRepHome;
}
function openEditCard(id, back) {
  const c = S.custom.find(x => x.id === id); if (!c) return;
  openSheet(`<h2 class="sh-title">Editar tarjeta</h2><div class="gap"></div><span class="fl">Materia</span><div class="chips wrapc" id="ecDeck" style="padding-top:0">${S.decks.map(d => `<button class="chip${d.id === c.deck ? ' on' : ''}" data-k="${d.id}" style="--acc:var(--blue)">${esc(d.name)}</button>`).join('')}</div><div class="gap"></div>
    <input class="field" id="ecQ" maxlength="200" placeholder="Pregunta"><div class="gap"></div><textarea class="field" id="ecA" style="min-height:110px" placeholder="Respuesta"></textarea><div class="gap"></div><button class="btn" id="ecSave" ${accSt('blue')}>Guardar cambios</button>`);
  $('#ecQ').value = c.q; $('#ecA').value = c.a; let dk = c.deck;
  $$('#ecDeck [data-k]').forEach(b => b.onclick = () => { dk = b.dataset.k; $$('#ecDeck button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#ecSave').onclick = () => { const q = $('#ecQ').value.trim(), a = $('#ecA').value.trim(); if (!q || !a) return toast('Falta pregunta o respuesta', 'sorprendida'); Object.assign(c, { q, a, deck: dk }); save(); toast('Cambios guardados'); openMyCards(back); };
}

/* ===================== Perfil: apariencia, texto, copia de seguridad ===================== */
$('#btnMe').addEventListener('click', () => {
  const foot = $('#sheetBody .foot'); if (!foot) return;
  const box = el('div', { html: `<div class="gap"></div><div class="label">Apariencia</div><div class="seg" id="meTheme">${['Auto', 'Claro', 'Oscuro'].map((t, i) => `<button class="${['auto', 'light', 'dark'][i] === (S.themeMode || 'auto') ? 'on' : ''}">${t}</button>`).join('')}</div>
    <p class="mini" style="margin:6px 4px 10px">Auto: oscuro de 8 p. m. a 6 a. m.</p>
    <button class="big-tile" id="meSci2"><div class="ic" style="background:var(--lil)">${ic('flask')}</div><div><b>Herramientas de ciencias</b><small>Química y laboratorio en Lab</small></div><span class="sw${S.sci !== false ? ' on' : ''}" id="meSciSw"></span></button>
    <button class="big-tile" id="meBig"><div class="ic" style="background:var(--blue)">${ic('type')}</div><div><b>Texto más grande</b><small>Toda la app se agranda</small></div><span class="sw${S.bigText ? ' on' : ''}" id="meBigSw"></span></button>
    <div class="gap"></div><div class="label">Copia de seguridad</div>
    <div class="tile"><p class="sub" style="font-size:14px;margin:0 0 12px">Para pasar tus datos a otro teléfono o navegador: copia tu respaldo, guárdalo (en tus notas o un chat contigo) y pégalo en el otro.</p>
    <div class="row"><button class="btn soft sm grow" id="meExp">Copiar respaldo</button><button class="btn soft sm grow" id="meImp">Pegar respaldo</button></div></div>` });
  foot.before(box);
  segBind('#meTheme', i => { S.themeMode = ['auto', 'light', 'dark'][i]; save(); applyTheme(); });
  $('#meSci2').onclick = () => { S.sci = S.sci === false; save(); $('#meSciSw').classList.toggle('on', S.sci); renderLab(); };
  $('#meBig').onclick = () => { S.bigText = !S.bigText; save(); applyTheme(); $('#meBigSw').classList.toggle('on', S.bigText); };
  $('#meExp').onclick = async () => { const t = 'MAPLE1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); try { await navigator.clipboard.writeText(t); toast('Respaldo copiado', 'feliz'); } catch (e) { toast('No se pudo copiar en este navegador', 'sorprendida'); } };
  let armed = false;
  $('#meImp').onclick = async () => {
    let t = ''; try { t = (await navigator.clipboard.readText()).trim(); } catch (e) { t = (prompt('Pega aquí tu respaldo') || '').trim(); }
    if (!t.startsWith('MAPLE1:')) return toast('No hay un respaldo de Maple copiado', 'sorprendida');
    if (!armed) { armed = true; $('#meImp').textContent = '¿Reemplazar todo?'; return; }
    try { const d = JSON.parse(decodeURIComponent(escape(atob(t.slice(7))))); if (!d.days) throw 0; S = Object.assign(DEFAULT(), d); S.updated = Date.now(); save(); closeSheet(); applyTheme(); renderAll(); toast('¡Respaldo recuperado!', 'risa'); }
    catch (e) { toast('El respaldo no es válido', 'sorprendida'); }
  };
});

/* arranque */
renderClasses(); renderHoyExtra();
window.MapleExtra = { todayInfo, dowM, nowMin, hm, durTxt, classesOn, factOfDay, applyTheme, openCalc, openTable, openMolar, openBalance, openSolutions, openPH, openGas, openLimiting, openSGA, openReport, openCalib, openStats, openUnits, openConsts, openTrivia, openQuiz, openSchedule, openClassForm, openClass, openRecall, openGrades, openMyCards, renderLab, ready };
})();
