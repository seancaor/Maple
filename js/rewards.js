/* Maple · recompensas y retroalimentación
   Principio (teoría de la autodeterminación): premiar el CÓMO se estudia con recompensas
   que informan, nunca castigar. Sin rankings, sin "perdiste la racha". */
(() => {
'use strict';
const X = window.MapleExtra || {};

/* ---------- íconos extra ---------- */
const sprite = document.querySelector('svg symbol').parentNode;
sprite.insertAdjacentHTML('beforeend', `
<symbol id="i-maple" viewBox="0 0 24 24"><path d="M12 2.5l1.5 3.4 2.4-1-.5 3.9 3.2-1.5-.8 2.8 2.7 1-3.4 2.7.7 1.7-4-.4L12 19.5l-1.8-4.4-4 .4.7-1.7L3.5 11.1l2.7-1-.8-2.8 3.2 1.5-.5-3.9 2.4 1z"/><path d="M12 13v8.5"/></symbol>
<symbol id="i-gift" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>
<symbol id="i-image" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></symbol>`);

/* ---------- estado ---------- */
const R = () => {
  if (!S.rw) S.rw = {};
  const r = S.rw;
  r.got = r.got || 0; r.spent = r.spent || 0; r.inv = r.inv || {}; r.once = r.once || {};
  r.log = r.log || {}; r.letters = r.letters || {}; r.deco = r.deco || []; r.phr = r.phr || [];
  if (!r.bg) r.bg = 'none';
  if (!r.phrRefund) { // las frases ahora son gratis: devolver lo gastado en ellas
    const P = { animo: 15, calma: 15, ciencia: 25 };
    Object.keys(P).forEach(k => { if (r.inv[k]) { r.spent = Math.max(0, r.spent - P[k]); delete r.inv[k]; } });
    r.phr = []; r.phrRefund = 1;
  }
  return r;
};
const avail = () => R().got - R().spent;

/* etapas del árbol: dependen de las hojas ganadas en total (gastar no lo encoge) */
const STAGES = [[0, 'Semilla'], [8, 'Brote'], [25, 'Plantita'], [50, 'Arbolito'], [90, 'Árbol joven'], [150, 'Árbol'], [230, 'Árbol en flor'], [340, 'Gran arce'], [500, 'Arce de otoño']];
const stageOf = n => { let s = 0; STAGES.forEach(([t], i) => { if (n >= t) s = i; }); return s; };

/* ---------- ganar hojas ---------- */
function earn(n, why, opts = {}) {
  if (!n) return 0;
  const r = R(), before = stageOf(r.got);
  r.got += n; const k = dayKey(); r.log[k] = (r.log[k] || 0) + n;
  save();
  if (!opts.silent) leafPop(n, why);
  const after = stageOf(r.got);
  if (after > before) { r.grew = true; save(); setTimeout(() => { toast('¡Tu árbol creció! Ahora es: ' + STAGES[after][1], 'risa'); try { confetti(); } catch (e) {} }, opts.silent ? 1600 : 2400); }
  try { renderStrip(); } catch (e) {}
  return n;
}
const earnOnce = (key, n, why, opts) => { const r = R(); if (r.once[key]) return 0; r.once[key] = 1; return earn(n, why, opts); };
function leafPop(n, why) {
  const p = el('div', { class: 'leafpop', html: `${ic('maple')}<b>+${n}</b><span>${esc(why || '')}</span>` });
  document.body.append(p); requestAnimationFrame(() => p.classList.add('on'));
  setTimeout(() => { p.classList.remove('on'); setTimeout(() => p.remove(), 400); }, 2300);
}

/* ---------- días activos y semana ---------- */
const mondayOf = dt => { const d = new Date(dt); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
const addDays = (dt, n) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
const isActive = d => !!d && ((d.min || 0) > 0 || (d.cards || 0) > 0 || !!d.recall);
function weekStats(mon) {
  const st = { days: 0, min: 0, blocks: 0, cards: 0, leaves: 0, best: null, night: 0, list: [] };
  for (let i = 0; i < 7; i++) {
    const dt = addDays(mon, i), k = dayKey(dt), d = S.days[k] || {};
    const a = isActive(d); st.list.push(a);
    if (a) st.days++;
    st.min += d.min || 0; st.blocks += d.blocks || 0; st.cards += d.cards || 0; st.leaves += R().log[k] || 0;
    if (R().once['night' + k]) st.night++;
    if ((d.min || 0) > 0 && (!st.best || d.min > st.best[1])) st.best = [dt, d.min];
  }
  return st;
}
/* "semanas constantes": semanas seguidas con 3 días o más. Descansar 4 días no rompe nada. */
function steadyWeeks() {
  let n = 0, mon = mondayOf(new Date());
  if (weekStats(mon).days >= 3) n++;
  mon = addDays(mon, -7);
  while (weekStats(mon).days >= 3 && n < 60) { n++; mon = addDays(mon, -7); }
  return n;
}
function weekDots() {
  const mon = mondayOf(new Date()), st = weekStats(mon), tk = dayKey();
  return `<span class="wdots">${'LMXJVSD'.split('').map((l, i) => { const k = dayKey(addDays(mon, i)); return `<i class="${st.list[i] ? 'on' : ''}${k === tk ? ' td' : ''}" title="${l}"></i>`; }).join('')}</span>`;
}

/* ---------- el árbol (SVG procedural) ---------- */
function treeSVG(stage, deco = [], cls = '') {
  const has = d => deco.includes(d);
  const soil = `<ellipse cx="100" cy="184" rx="74" ry="11" fill="#C9A27A" opacity=".55"/>`;
  let body = '';
  const G = stage >= 8 ? ['#E8643A', '#F29A38', '#D9483B'] : stage >= 6 ? ['#4FB262', '#62C373', '#3FA055'] : ['#5DBB63', '#72C977', '#4AA853'];
  let h = 0, R0 = 0;
  if (stage === 0) body = `<path d="M84 184c4-12 28-12 32 0z" fill="#B98B60"/><ellipse cx="100" cy="171" rx="7" ry="5" fill="#8A5A3B"/>`;
  else if (stage <= 2) {
    const top = stage === 1 ? 158 : 138;
    body = `<path d="M100 184V${top}" stroke="#4AA853" stroke-width="4" stroke-linecap="round" fill="none"/>
      <ellipse cx="89" cy="${top + 4}" rx="11" ry="6" fill="#72C977" transform="rotate(-25 89 ${top + 4})"/><ellipse cx="111" cy="${top + 2}" rx="11" ry="6" fill="#5DBB63" transform="rotate(25 111 ${top + 2})"/>
      ${stage === 2 ? `<ellipse cx="88" cy="${top + 22}" rx="12" ry="6" fill="#5DBB63" transform="rotate(-20 88 ${top + 22})"/><ellipse cx="112" cy="${top + 20}" rx="12" ry="6" fill="#72C977" transform="rotate(20 112 ${top + 20})"/>` : ''}`;
  } else {
    h = [0, 0, 0, 52, 66, 80, 88, 96, 100][stage]; R0 = [0, 0, 0, 28, 36, 46, 52, 58, 60][stage];
    const cy = 184 - h - R0 * .55, tw = 5 + stage * 1.3;
    body = `<path d="M${100 - tw / 2} 184 L${100 - tw / 3} ${cy + 8} L${100 + tw / 3} ${cy + 8} L${100 + tw / 2} 184z" fill="#8A5A3B"/>
      <path d="M100 ${cy + 30}l-${R0 * .45} -${R0 * .35}M100 ${cy + 22}l${R0 * .45} -${R0 * .4}" stroke="#8A5A3B" stroke-width="${2 + stage * .4}" stroke-linecap="round"/>`;
    const blobs = [[0, -.15, .78, 0], [-.62, .2, .62, 1], [.62, .2, .62, 2], [-.36, -.5, .6, 1], [.38, -.48, .58, 2], [0, .28, .62, 1]];
    body += blobs.map(([x, y, r, c]) => `<circle cx="${100 + x * R0}" cy="${cy + y * R0}" r="${r * R0}" fill="${G[c]}"/>`).join('');
    if (stage >= 6 && stage < 8) body += [[-.5, -.2], [.4, -.55], [.1, .15], [.62, .1], [-.2, -.6], [-.7, .35], [.3, .45]].map(([x, y]) => `<circle cx="${100 + x * R0}" cy="${cy + y * R0}" r="3.6" fill="#FF9FBF"/><circle cx="${100 + x * R0}" cy="${cy + y * R0}" r="1.4" fill="#FFE07A"/>`).join('');
    if (stage >= 7) body += [[-.25, -.1], [.45, .2], [-.55, -.35]].map(([x, y]) => `<circle cx="${100 + x * R0}" cy="${cy + y * R0}" r="4.5" fill="${stage >= 8 ? '#FFC53D' : '#FF6B5C'}"/>`).join('');
    if (stage >= 8) body += `<g class="fall"><path d="M40 120l3 6 6-2-4 5 3 4-6-1-2 5-1-6-6 0 5-4z" fill="#F29A38"/><path d="M160 140l3 5 5-1-3 4 2 4-5-1-2 4-1-5-5 0 4-3z" fill="#E8643A"/></g>`;
    if (has('lanterns')) body += `<path d="M${100 - R0 * .9} ${cy + R0 * .55}Q100 ${cy + R0 * .95} ${100 + R0 * .9} ${cy + R0 * .55}" stroke="#7A6A5A" stroke-width="1.3" fill="none"/>${[-.6, -.2, .2, .6].map(x => `<circle cx="${100 + x * R0}" cy="${cy + R0 * .72 + (1 - Math.abs(x)) * 6}" r="4" fill="#FFD25A" stroke="#E8A93A" stroke-width="1"/>`).join('')}`;
    if (has('swing')) { const sx = 100 - R0 * .55, sy = cy + R0 * .45; body += `<path d="M${sx - 8} ${sy}V170M${sx + 8} ${sy}V170" stroke="#7A6A5A" stroke-width="1.4"/><rect x="${sx - 11}" y="169" width="22" height="4" rx="2" fill="#C98A54"/>`; }
    if (has('bird')) { const bx = 100 + R0 * .78, by = cy - R0 * .55; body += `<g><ellipse cx="${bx}" cy="${by}" rx="8" ry="6.5" fill="#46A7F5"/><circle cx="${bx + 6}" cy="${by - 5}" r="4.5" fill="#46A7F5"/><circle cx="${bx + 7.5}" cy="${by - 6}" r="1.1" fill="#2E2A28"/><path d="M${bx + 10.5} ${by - 5}l4 1.2-4 1.3z" fill="#FFB23D"/></g>`; }
  }
  if (has('mush')) body += `<g><rect x="46" y="174" width="4" height="9" rx="2" fill="#F3E6D6"/><path d="M41 176a7 6 0 0 1 14 0z" fill="#FF5B4D"/><circle cx="46" cy="172" r="1.3" fill="#fff"/><rect x="57" y="177" width="3" height="6" rx="1.5" fill="#F3E6D6"/><path d="M54 179a4.5 4 0 0 1 9 0z" fill="#FF5B4D"/></g>`;
  if (has('bench')) body += `<g fill="#B07A4C"><rect x="140" y="168" width="34" height="4" rx="2"/><rect x="140" y="160" width="34" height="3" rx="1.5"/><rect x="143" y="172" width="3" height="11"/><rect x="168" y="172" width="3" height="11"/></g>`;
  if (has('butter')) body += `<g class="flut"><path d="M58 108c-6-6-10 2-4 5-6 3-2 10 4 4 0 0 0 0 0 0z" fill="#B7A8FF"/><path d="M58 108c6-6 10 2 4 5 6 3 2 10-4 4z" fill="#9C8CF2"/></g><g class="flut d2"><path d="M150 96c-5-5-8 2-3 4-5 3-2 8 3 3z" fill="#FF8FB1"/><path d="M150 96c5-5 8 2 3 4 5 3 2 8-3 3z" fill="#FF6F9C"/></g>`;
  return `<svg class="tree ${cls}" viewBox="0 0 200 200" aria-hidden="true">${soil}${body}</svg>`;
}

/* ---------- fondos de la escena de Maple ---------- */
const SCENES = {
  sky: ['Cielo', 'linear-gradient(#CFEAFF,#F2F9FF)', `<ellipse cx="60" cy="40" rx="26" ry="10" fill="#fff"/><ellipse cx="78" cy="34" rx="16" ry="10" fill="#fff"/><ellipse cx="300" cy="56" rx="30" ry="11" fill="#fff"/><ellipse cx="318" cy="49" rx="17" ry="10" fill="#fff"/>`],
  dusk: ['Atardecer', 'linear-gradient(#FFC9A0,#FFE6D2 55%,#FFF4EA)', `<circle cx="300" cy="110" r="34" fill="#FFB36B" opacity=".7"/><ellipse cx="80" cy="44" rx="30" ry="8" fill="#FFD9BF"/>`],
  night: ['Noche estrellada', 'linear-gradient(#2E3A6B,#4E5C96)', `<circle cx="310" cy="38" r="15" fill="#FFF3C4"/><circle cx="317" cy="33" r="13" fill="#3A4679"/>${[[40, 30], [90, 60], [150, 24], [220, 50], [260, 22], [60, 100], [350, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join('')}`],
  forest: ['Bosque', 'linear-gradient(#DDF2E0,#F2FAF3)', `${[[20, 1], [60, .8], [310, .9], [350, 1.1]].map(([x, s]) => `<path d="M${x} 160l${-18 * s} 0 ${18 * s} ${-60 * s} ${18 * s} ${60 * s}z" fill="#B9E2C0"/>`).join('')}`],
  autumn: ['Otoño', 'linear-gradient(#FFE3C4,#FFF4E8)', `${[[50, 40, '#F29A38'], [120, 80, '#E8643A'], [290, 36, '#F2B13B'], [340, 96, '#E8643A']].map(([x, y, c]) => `<g transform="translate(${x} ${y}) scale(.9)"><path d="M0 -9l2 4 4-1-1 5 4 2-5 2 1 4-5-2-5 2 1-4-5-2 4-2-1-5 4 1z" fill="${c}"/></g>`).join('')}`],
  lab: ['Laboratorio', 'linear-gradient(#E9E5FF,#F7F5FF)', `<path d="M40 60v30l-14 28h40L52 90V60z" fill="none" stroke="#B7A8FF" stroke-width="3" stroke-linejoin="round"/><path d="M300 50v58a10 10 0 0 0 20 0V50" fill="none" stroke="#B7A8FF" stroke-width="3"/>${[[46, 44, 4], [60, 30, 3], [310, 34, 3.5], [322, 22, 2.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#CFC5FF"/>`).join('')}`],
};
function applyScene() {
  const hero = $('#heroBox'); if (!hero) return;
  let sc = hero.querySelector('.scene');
  const id = R().bg;
  if (!SCENES[id]) { if (sc) sc.remove(); hero.classList.remove('has-scene', 'scene-dark'); return; }
  if (!sc) { sc = el('div', { class: 'scene' }); hero.prepend(sc); }
  const [, bg, svg] = SCENES[id];
  sc.style.background = bg;
  sc.innerHTML = `<svg viewBox="0 0 380 160" preserveAspectRatio="xMidYMid slice">${svg}</svg>`;
  hero.classList.add('has-scene'); hero.classList.toggle('scene-dark', id === 'night');
}

/* ---------- frases de Maple ---------- */
const PHRASES = {
  animo: ['Paso a pasito, ¡vamos!', 'Hoy sumas, no compites', 'Lo difícil se vuelve fácil', 'Un bloque y ya ganaste'],
  ciencia: ['Bajemos la energía de activación', 'Ni se crea ni se destruye: se repasa', 'Hoy catalizamos tu foco', 'Aprender es una reacción lenta'],
  calma: ['Sin prisa, pero sin pausa', 'Tu ritmo está bien', 'Respira, vamos con calma', 'Descansar también suma'],
};
const prevSay = sayLine;
sayLine = function () {
  const s = prevSay.apply(this, arguments);
  if (!/^(¡Buen|Buenas)/.test(s)) return s;
  const pool = Object.values(PHRASES).flat();  // las frases son de Maple: siempre incluidas
  const h = new Date().getHours(), seed = dayNum() * 7 + Math.floor(h / 2);
  return seed % 3 === 0 ? s : pool[seed % pool.length];
};

/* ---------- armario: lo que se desbloquea ---------- */
const SHOP = [
  // [id, tipo, nombre, precio, etapa mínima del árbol]
  ['sky', 'bg', 'Cielo', 15, 0], ['dusk', 'bg', 'Atardecer', 25, 0], ['forest', 'bg', 'Bosque', 35, 0], ['lab', 'bg', 'Laboratorio', 40, 0], ['night', 'bg', 'Noche estrellada', 50, 0], ['autumn', 'bg', 'Otoño', 60, 0],
  ['mush', 'deco', 'Hongos', 12, 0], ['bench', 'deco', 'Banca', 20, 0], ['butter', 'deco', 'Mariposas', 30, 2], ['bird', 'deco', 'Pajarito', 30, 3], ['lanterns', 'deco', 'Farolitos', 40, 3], ['swing', 'deco', 'Columpio', 45, 4],
];
const PREVIEW = { phr: id => '“' + PHRASES[id][0] + '”' };

/* ---------- retroalimentación al terminar un bloque ---------- */
const prevFinish = finishFocus;
finishFocus = function (completed) {
  const run = S.run ? Object.assign({}, S.run) : null;
  const res = prevFinish.apply(this, arguments);
  if (!run || run.kind === 'break') return res;
  try {
    const d = today(), lg = (d.log || [])[d.log.length - 1] || {}, spent = lg.spent || 0, dist = run.distract || 0, e = energy(), low = e && e <= 2;
    let msg = '', n = 0;
    if (completed) {
      n = 2 + (run.focus >= 45 ? 1 : 0) + (dist === 0 ? 1 : 0) + (low ? 1 : 0);
      if (low) msg = `Con poca energía y lo terminaste. Un bloque corto en un día difícil vale mucho.`;
      else if (dist === 0) msg = `${run.focus} minutos sin distracciones. Así se entrena la atención sostenida.`;
      else msg = `Te distrajiste ${dist === 1 ? 'una vez' : dist + ' veces'} y volviste. Volver al foco es justamente la habilidad que se entrena.`;
      if (d.blocks >= 2) msg += ` Es tu bloque ${d.blocks} de hoy.`;
      const r = R();
      if (r.back === dayKey() && !r.once['back' + dayKey()]) { r.once['back' + dayKey()] = 1; n += 2; msg = '¡Volviste! Retomar después de unos días es lo más difícil, y ya lo hiciste.'; }
    } else if (spent >= 5) { n = 1; msg = `${spent} minutos también suman. Parar a tiempo es mejor que forzarte.`; }
    else msg = 'Parar también está bien. Cuando quieras, empezamos con algo más corto.';
    if (n) earn(n, '', { silent: true });
    fbCard($('#doneSub'), msg, n, 'fbFocus');
  } catch (err) { console.error(err); }
  return res;
};
function fbCard(after, msg, n, id) {
  if (!after) return; const old = document.getElementById(id); if (old) old.remove();
  after.after(el('div', { id, class: 'fb', html: `<div class="fb-t">${esc(msg)}</div>${n ? `<div class="fb-l">${ic('maple')}+${n} hoja${n === 1 ? '' : 's'}</div>` : ''}` }));
}

/* ---------- retroalimentación al terminar un repaso ---------- */
const mastered = () => Object.values(S.cards || {}).filter(c => c.box >= 5).length;
const MILES = [10, 25, 50, 100, 200, 400];
let mBefore = 0;
document.addEventListener('click', e => { if (e.target.closest('#btnReview, [data-start-rev]')) mBefore = mastered(); }, true);
const prevEnd = endSession;
endSession = function () {
  const s = session, before = mBefore || mastered();
  const res = prevEnd.apply(this, arguments);
  try {
    if (!s) return res;
    const first = s.cards.filter(c => !c._again), n = first.length;
    // aciertos al primer intento: los "otra vez" se suman al final
    const again = s.cards.length - n, ok1 = Math.max(0, n - again);
    const now = mastered(), newM = Math.max(0, now - before);
    let msg = ok1 >= n * .7 ? `Recordaste ${ok1} de ${n} sin mirar. Sacar la respuesta de la memoria es lo que más la fija.`
      : ok1 >= n * .4 ? `Recordaste ${ok1} de ${n}. Las que fallaste vuelven pronto, justo cuando más sirve repasarlas.`
      : `Hoy costó: ${ok1} de ${n}. Equivocarte al intentar recordar también te enseña; mañana te las vuelvo a mostrar.`;
    if (newM) msg += ` ${newM === 1 ? 'Una tarjeta quedó dominada' : newM + ' tarjetas quedaron dominadas'}.`;
    const nl = Math.min(6, 1 + Math.ceil(n / 5));
    earn(nl, '', { silent: true });
    fbCard($('#rEndSub'), msg, nl, 'fbRev');
    const m = MILES.find(x => before < x && now >= x);
    if (m) setTimeout(() => { earnOnce('mast' + m, 5, `${m} tarjetas dominadas`); toast(`¡${m} tarjetas dominadas! Eso ya es conocimiento tuyo`, 'risa'); }, 2600);
    mBefore = 0;
  } catch (err) { console.error(err); }
  return res;
};

/* ---------- otras acciones que suman ---------- */
document.addEventListener('click', e => {
  const k = dayKey();
  if (e.target.closest('#rcSave')) { const t = $('#rcTx'); if (t && t.value.trim()) setTimeout(() => { today().recall = 1; save(); earnOnce('rc' + k + (($('#sheetBody .sh-title') || {}).textContent || ''), 2, 'recordar la clase'); }, 60); }
  if (e.target.closest('#tmDone')) setTimeout(() => earnOnce('night' + k, 2, 'cerrar el día'), 400);
  if (e.target.closest('#whySave')) setTimeout(() => earnOnce('why', 3, 'tu porqué'), 400);
}, true);
const prevGoal = checkGoal;
checkGoal = function () { const had = today().goalHit; const r = prevGoal.apply(this, arguments); if (!had && today().goalHit) setTimeout(() => earnOnce('goal' + dayKey(), 3, 'meta del día'), 2200); return r; };
const prevBadges = checkBadges;
checkBadges = function () { const b = Object.keys(S.badges || {}).length; const r = prevBadges.apply(this, arguments); const nb = Object.keys(S.badges || {}).length - b; if (nb > 0) setTimeout(() => earn(3 * nb, nb === 1 ? 'logro nuevo' : nb + ' logros'), 3200); return r; };

/* ---------- carta de Maple (domingo) ---------- */
const DOWN = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function pendingLetter() {
  const now = new Date();
  const wk = (now.getDay() === 0 && now.getHours() >= 17) ? mondayOf(now) : addDays(mondayOf(now), -7);
  const k = dayKey(wk); if (R().letters[k]) return null;
  const st = weekStats(wk); if (!st.days) return null;
  return k;
}
function letterHTML(k) {
  const mon = new Date(k + 'T00:00:00'); const st = weekStats(mon), pv = weekStats(addDays(mon, -7));
  const nm = S.name ? ', ' + esc(S.name) : '';
  const P = [];
  const cur = k === dayKey(mondayOf(new Date()));
  P.push(`${cur ? 'Esta semana' : 'La semana pasada'} estudiaste <b>${st.days} día${st.days === 1 ? '' : 's'}</b>: ${st.min} min de foco${st.blocks ? ` en ${st.blocks} bloque${st.blocks === 1 ? '' : 's'}` : ''}${st.cards ? ` y ${st.cards} tarjetas repasadas` : ''}.${st.leaves ? ` Ganaste ${st.leaves} hojas.` : ''}`);
  if (!pv.days) P.push('Es la primera semana que te acompaño, y ya es un comienzo.');
  else if (st.min > pv.min + 10) P.push(`Son ${st.min - pv.min} minutos más que la semana anterior. Se nota el esfuerzo.`);
  else if (st.min < pv.min * .7) P.push('Fue una semana más liviana que la anterior. Eso pasa, y no borra nada de lo que ya construiste.');
  else P.push('Mantuviste un ritmo parecido al de la semana anterior. La constancia rinde más que los arranques.');
  if (st.best) P.push(`Tu mejor día fue el ${DOWN[st.best[0].getDay()]}, con ${st.best[1]} minutos.`);
  try { const ins = insights(); if (ins.length) P.push('Algo que he notado: ' + ins[0][2]); } catch (e) {}
  let sug;
  if (!st.cards && dueCards('all').length) sug = 'repasar tarjetas un par de días, aunque sea un rato. Espaciar el repaso fija más que estudiar todo de una vez.';
  else if (st.days < 3) sug = 'estudiar 3 días, aunque sean 15 minutos. Poco tiempo repartido rinde más que una maratón.';
  else if (!st.night) sug = 'cerrar el día un par de noches. Sacar los pendientes de la cabeza ayuda a dormir, y dormir fija lo aprendido.';
  else sug = 'seguir así y dejarte un día libre de verdad. Descansar también es parte del plan.';
  P.push(`Para la próxima semana te propongo ${sug}`);
  return `<p>Hola${nm}:</p>${P.map(p => `<p>${p}</p>`).join('')}<p class="sign">Con cariño,<br>Maple</p>`;
}
function openLetter(k, fromArchive) {
  const r = R(); const first = !r.letters[k];
  if (first) { r.letters[k] = { html: letterHTML(k) }; save(); }
  const mon = new Date(k + 'T00:00:00'), sun = addDays(mon, 6);
  openSheet(`<div class="portrait sm"><img src="img/hq/p_feliz.webp" alt=""></div>
    <h2 class="sh-title center">Tu semana</h2><p class="sub center" style="margin:0 0 12px">${mon.getDate()} ${MES[mon.getMonth()]} – ${sun.getDate()} ${MES[sun.getMonth()]}</p>
    <div class="letter">${r.letters[k].html}</div>
    ${fromArchive ? '<button class="link" id="lBack">Volver al jardín</button>' : ''}`);
  if (fromArchive) $('#lBack').onclick = openGarden;
  if (first) { setTimeout(() => earnOnce('letter' + k, 2, 'leer tu carta'), 700); sheetOnClose = () => renderHoy(); }
}

/* ---------- volver después de unos días ---------- */
function daysAway() {
  for (let i = 1; i <= 60; i++) if (isActive(S.days[dayKey(new Date(Date.now() - i * 86400000))])) return i - 1;
  return -1; // nunca ha estudiado
}

/* ---------- avisos en Hoy: carta / bienvenida ---------- */
function renderNotes() {
  let box = $('#rwNote');
  if (!box) { box = el('div', { id: 'rwNote' }); const nb = $('#nowBox'); if (nb) nb.before(box); else $('#heroBox').after(box); }
  box.innerHTML = '';
  const r = R(), k = dayKey(), away = daysAway();
  if (away >= 3 && !isActive(today()) && r.backSeen !== k) {
    box.innerHTML = `<div class="tile note-b"><img src="img/hq/pe_feliz.webp" alt=""><div class="grow"><b>¡Qué bueno verte!</b><small>Sin culpas: empecemos con 10 minutos.</small></div><button class="pill-btn" id="bkGo">Empezar</button><button class="x" id="bkX" aria-label="Cerrar">${ic('x')}</button></div><div class="gap"></div>`;
    $('#bkGo').onclick = () => { r.back = k; r.backSeen = k; save(); plan.task = plan.task || 'Retomar'; plan.focus = 10; plan.brk = 5; show('foco'); renderPlan(); };
    $('#bkX').onclick = () => { r.backSeen = k; save(); renderNotes(); };
    return;
  }
  const lk = pendingLetter();
  if (lk) {
    box.innerHTML = `<button class="tile note-b" id="ltGo"><div class="ic" style="background:var(--pink)">${ic('mail')}</div><div class="grow"><b>Maple te escribió</b><small>Tu semana en una carta</small></div>${ic('chev', 'color:var(--ink2);font-size:20px')}</button><div class="gap"></div>`;
    $('#ltGo').onclick = () => openLetter(lk);
  }
}

/* ---------- tira del jardín en Hoy ---------- */
function renderStrip() {
  let s = $('#gardenStrip');
  if (!s) { s = el('button', { id: 'gardenStrip', class: 'gstrip' }); const after = $('#classLine') || $('#nowBox'); if (!after) return; after.after(s); }
  const r = R(), st = stageOf(r.got), wk = weekStats(mondayOf(new Date()));
  s.classList.toggle('grew', !!r.grew);
  const th = getThumb();
  s.innerHTML = `${th ? `<img class="tree mini" src="${th}" alt="">` : treeSVG(st, r.deco, 'mini')}<span class="grow"><b>${ic('maple')}${avail()} hojas</b><small>${STAGES[st][1]} · ${wk.days} de 7 días</small></span>${weekDots()}`;
  s.onclick = openGarden;
}

/* ---------- el jardín ---------- */
let gTab = 'bg';
function openGarden() {
  const r = R(); r.grew = false; save();
  const st = stageOf(r.got), nx = STAGES[st + 1], prevT = STAGES[st][0];
  const pct = nx ? (r.got - prevT) / (nx[0] - prevT) : 1, sw = steadyWeeks(), wk = weekStats(mondayOf(new Date()));
  const letters = Object.keys(r.letters).sort().reverse().slice(0, 8);
  openSheet(`<h2 class="sh-title">Tu jardín</h2>
    <div class="garden ${SCENES[r.bg] ? 'has-scene' : ''}" id="g3box" style="${SCENES[r.bg] ? 'background:' + SCENES[r.bg][1] : ''}">${treeSVG(st, r.deco)}<span class="g3hint">Arrastra para girar · toca el árbol</span></div>
    <div class="gname"><b>${STAGES[st][1]}</b><span>${ic('maple')}${avail()} hojas para usar</span></div>
    <div class="gbar"><i style="width:${Math.round(pct * 100)}%"></i></div>
    <p class="sub" style="font-size:13px;margin:6px 2px 0">${nx ? `Faltan ${nx[0] - r.got} hojas para que sea ${nx[1].toLowerCase()}. Gastar hojas no encoge tu árbol.` : 'Tu arce llegó a su forma más bonita.'}</p>
    <div class="gap"></div>
    <div class="tile"><div class="row" style="align-items:center"><div class="grow"><b style="font-size:15px">Esta semana: ${wk.days} de 7 días</b><small class="sub" style="display:block;font-size:13px;margin-top:2px">${sw ? `${sw} semana${sw === 1 ? '' : 's'} constante${sw === 1 ? '' : 's'} seguidas` : 'Con 3 días ya es una semana constante'}</small></div>${weekDots()}</div>
      <p class="sub" style="font-size:13px;margin:10px 0 0">Aquí no hay rachas que se rompan: 3 días por semana ya cuentan, y descansar es parte del plan.</p></div>
    <div class="gap"></div><div class="label">Armario de Maple</div>
    <div class="seg" id="gSeg"><button data-t="bg">Fondos</button><button data-t="deco">Árbol</button></div>
    <div class="gap"></div><div class="shop" id="gShop"></div>
    <div class="gap"></div><details class="more-d"><summary>Cómo ganar hojas</summary><div class="tile" style="padding:6px 16px"><ul class="list earn">
      <li><span class="t">Terminar un bloque de foco</span><b>2–5</b></li><li><span class="t">Un bloque sin distracciones, o con poca energía</span><b>+1</b></li>
      <li><span class="t">Repasar tarjetas</span><b>2–6</b></li><li><span class="t">Recordar lo de una clase</span><b>2</b></li>
      <li><span class="t">Cumplir tu meta del día</span><b>3</b></li><li><span class="t">Cerrar el día</span><b>2</b></li>
      <li><span class="t">Volver después de unos días</span><b>+2</b></li><li><span class="t">Cada logro nuevo</span><b>3</b></li></ul></div>
      <p class="sub" style="font-size:13px;margin:8px 2px 0">Las hojas premian cómo estudias, no cuánto tiempo pasas frente al libro.</p></details>
    ${letters.length ? `<div class="gap"></div><div class="label">Cartas de Maple</div><div class="tile" style="padding:4px 16px"><ul class="list">${letters.map(k => { const m = new Date(k + 'T00:00:00'); return `<li><button class="t" data-l="${k}" style="text-align:left">${ic('mail', 'color:var(--pink);margin-right:8px;vertical-align:-3px')}Semana del ${m.getDate()} ${MES[m.getMonth()]}</button></li>`; }).join('')}</ul></div>` : ''}`);
  const drawShop = () => {
    $$('#gSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === gTab));
    const box = $('#gShop'); box.innerHTML = '';
    if (gTab === 'bg') box.append(shopItem(['none', 'bg', 'Sin fondo', 0, 0]));
    SHOP.filter(i => i[1] === gTab).forEach(i => box.append(shopItem(i)));
  };
  const shopItem = ([id, t, name, price, minS]) => {
    const own = id === 'none' || r.inv[id], locked = st < minS;
    const on = t === 'bg' ? r.bg === id : t === 'deco' ? r.deco.includes(id) : r.phr.includes(id);
    const prev = t === 'bg' ? `<div class="thumb" style="background:${id === 'none' ? 'var(--soft)' : SCENES[id][1]}"></div>` : t === 'deco' ? `<div class="thumb dec">${treeSVG(Math.max(3, st), [id])}</div>` : `<div class="thumb ph">${ic('chat')}</div>`;
    const sub = t === 'phr' ? PREVIEW.phr(id) : locked ? `Se abre cuando tu árbol sea ${STAGES[minS][1].toLowerCase()}` : own ? (on ? 'Puesto' : 'Tuyo') : `${price} hojas`;
    const b = el('button', { class: 'shop-i' + (on ? ' on' : '') + (locked ? ' lk' : ''), html: `${prev}<span class="grow"><b>${esc(name)}</b><small>${esc(sub)}</small></span>${own ? (on ? ic('check', 'color:var(--mint);font-size:22px') : '') : locked ? ic('lock', 'color:var(--ink2)') : `<span class="price">${ic('maple')}${price}</span>`}` });
    b.onclick = () => {
      if (locked) return toast('Sigue cuidando tu árbol para abrir esto', 'feliz');
      if (!own) {
        if (avail() < price) return toast(`Te faltan ${price - avail()} hojas. ¡Un bloque más y casi!`, 'feliz');
        r.spent += price; r.inv[id] = 1; sfx('ok'); toast('¡Desbloqueaste ' + name + '!', 'risa');
        if (t === 'bg') r.bg = id; else if (t === 'deco') r.deco.push(id); else r.phr.push(id);
      } else {
        if (t === 'bg') r.bg = id;
        else if (t === 'deco') r.deco = on ? r.deco.filter(x => x !== id) : r.deco.concat(id);
        else r.phr = on ? r.phr.filter(x => x !== id) : r.phr.concat(id);
      }
      save(); applyScene(); renderStrip(); $('#say').textContent = sayLine(); const sh = $('.sheet'), y = sh.scrollTop; openGarden(); sh.scrollTop = y;
    };
    return b;
  };
  $$('#gSeg button').forEach(b => b.onclick = () => { gTab = b.dataset.t; drawShop(); });
  $$('#sheetBody [data-l]').forEach(b => b.onclick = () => openLetter(b.dataset.l, true));
  drawShop();
  mount3D(st, r);
  sheetOnClose = () => { unmount3D(); renderHoy(); };
}

/* ---------- jardín 3D (three.js, se carga solo al abrir el jardín) ---------- */
let G3 = null, g3mod = null;
const thumbKey = (st, r) => [st, r.deco.slice().sort().join(','), r.bg].join('|');
function getThumb() { try { const t = JSON.parse(localStorage.getItem('maple-tree3d') || 'null'); const r = R(); return t && t.k === thumbKey(stageOf(r.got), r) ? t.img : null; } catch (e) { return null; } }
function unmount3D() {
  if (!G3) return;
  try { const r = R(); localStorage.setItem('maple-tree3d', JSON.stringify({ k: thumbKey(stageOf(r.got), r), img: G3.snapshot(112) })); } catch (e) {}
  try { G3.destroy(); } catch (e) {} G3 = null;
}
async function mount3D(st, r) {
  const box = $('#g3box'); if (!box) return;
  if (G3) { unmount3D(); }
  try {
    g3mod = g3mod || await import(new URL('js/garden3d.js', document.baseURI).href);
    const b = $('#g3box'); if (!b || b !== box) return;
    G3 = g3mod.mount(box, { stage: st, deco: r.deco, bg: r.bg, onTap: () => { sfx('soft'); } });
    box.classList.add('is3d');
    setTimeout(() => { try { const rr = R(); localStorage.setItem('maple-tree3d', JSON.stringify({ k: thumbKey(stageOf(rr.got), rr), img: G3.snapshot(112) })); renderStrip(); } catch (e) {} }, 900);
  } catch (e) { console.warn('jardín 3D no disponible', e); }
}

/* ---------- Tú: entrada al jardín ---------- */
(() => {
  const prog = $('#tuProg'); if (!prog) return;
  const row = el('button', { class: 'big-tile row-t', id: 'tuGarden', html: `<div class="ic" style="background:var(--mint)">${ic('maple')}</div><div><b>Mi jardín</b><small id="tuGardenS"></small></div>${ic('chev', '').replace('class="i"', 'class="i go"')}` });
  prog.after(el('div', { class: 'gap' }), row);
  row.onclick = openGarden;
})();
const drawTuG = () => { const s = $('#tuGardenS'); if (s) s.textContent = `${STAGES[stageOf(R().got)][1]} · ${avail()} hojas`; };

/* ---------- enganches ---------- */
const prevHoy = renderHoy;
renderHoy = function () {
  const r = prevHoy.apply(this, arguments);
  try { applyScene(); renderStrip(); renderNotes(); drawTuG(); } catch (e) { console.error(e); }
  return r;
};
const prevShow = show;
show = function () { const r = prevShow.apply(this, arguments); try { drawTuG(); } catch (e) {} return r; };

window.MapleRewards = { PHRASES, SHOP, renderStrip, applyScene, R, earn, earnOnce, openGarden, openLetter, treeSVG, stageOf, STAGES, weekStats, mondayOf, pendingLetter };
renderHoy();
})();
