/* Maple · versión minimalista: 4 pestañas (Hoy, Estudiar, Lab, Tú), tarjeta "¿Qué toca ahora?",
   registro diario que se recoge, botón "+" para anotar rápido y Tú con una sola entrada. */
"use strict";
(() => {
const X = window.MapleExtra;

/* ===================== navegación: 4 pestañas ===================== */
const TAB = { hoy: 'hoy', foco: 'est', rep: 'est', lab: 'lab', calma: 'tu' };
const prevShow = show;
show = function (v) {
  if (v === 'est') v = S.estTab || 'foco';
  if (v === 'tu') v = 'calma';
  if (v === 'foco' || v === 'rep') S.estTab = v;
  prevShow(v);
  $$('.dock button').forEach(b => b.classList.toggle('on', b.dataset.v === TAB[v]));
  if (v === 'calma') renderTu();
  if (v === 'foco' || v === 'rep') drawSwitch();
};

/* ===================== Estudiar: cambiar entre foco y tarjetas ===================== */
function makeSwitch(where) {
  const w = el('div', { class: 'estsw' });
  w.innerHTML = `<div class="seg"><button data-e="foco">${ic('timer')} Foco</button><button data-e="rep">${ic('cards')} Tarjetas</button></div>
    <div class="estlinks"><button data-l="ex">${ic('cal')} Exámenes</button><button data-l="park">${ic('note')} Para después<span class="cnt"></span></button><button data-l="sch">${ic('calcheck')} Horario</button></div>`;
  w.querySelectorAll('[data-e]').forEach(b => b.onclick = () => show(b.dataset.e));
  w.querySelector('[data-l=ex]').onclick = openExams;
  w.querySelector('[data-l=park]').onclick = openParking;
  w.querySelector('[data-l=sch]').onclick = () => X.openSchedule();
  where.prepend(w);
}
makeSwitch($('#f-plan')); makeSwitch($('#r-home'));
function drawSwitch() {
  const v = S.estTab || 'foco', n = S.parking.filter(p => !p.done).length;
  $$('.estsw [data-e]').forEach(b => b.classList.toggle('on', b.dataset.e === v));
  $$('.estsw .cnt').forEach(c => c.textContent = n ? ' · ' + n : '');
}

/* ===================== Hoy: "¿Qué toca ahora?" ===================== */
const hero = $('#heroBox');
const nowBox = el('div', { id: 'nowBox' });
hero.after(nowBox);
const checkTile = $('#energy').closest('.tile');
nowBox.after(checkTile);

// lo más útil para este momento, en orden de prioridad
function candidates() {
  const out = [], h = new Date().getHours(), d = today();
  const add = (icon, color, title, sub, fn, cta) => out.push({ icon, color, title, sub, fn, cta });
  let info = null; try { info = X.todayInfo(); } catch (e) {}
  const ex = typeof nextExam === 'function' ? nextExam() : null;
  if (ex && ex.left === 0) add('bolt', 'var(--lil)', '¡Hoy es tu examen de ' + ex.name + '!', 'Nervios a favor y un minuto de aire', openExamKit, 'Abrir el kit');
  if (info && info.now) add('cal', 'var(--blue)', 'En clase: ' + info.now.name, 'Hasta las ' + X.hm(info.now.end) + (info.now.room ? ' · ' + info.now.room : ''), () => X.openClass(info.now.id), 'Ver clase');
  if (info && info.recall) add('brain', 'var(--pink)', '¿Qué recuerdas de ' + info.recall.name + '?', '3 minutos sin apuntes fijan lo de hoy', () => X.openRecall(info.recall.id), 'Recordar');
  examTasksToday().forEach(t => add('cal', 'var(--lil)', 'Hoy toca: ' + t.label, t.exam.name + ' · plan del examen', () => openExam(t.exam.id), 'Ver plan'));
  const tm = S.tomorrow;
  if (tm.day === dayKey() && tm.items.some(i => !i.done)) add('note', '#5B6CC9', 'Lo que dejaste para hoy', tm.items.find(i => !i.done).text, openCarry, 'Ver lista');
  const due = dueCards('all').length;
  if (due >= 5) add('cards', 'var(--blue)', `Repasar ${due} tarjetas`, `Unos ${Math.max(3, Math.round(due * .6))} minutos`, () => { show('rep'); $('#btnReview').click(); }, 'Empezar repaso');
  if (h >= 21 && S.tomorrow.day !== dayKey(new Date(Date.now() + 86400000))) add('moon', '#5B6CC9', 'Cerrar el día', 'Lista de mañana y a dormir', openNight, 'Cerrar el día');
  if (info && info.gaps.length) { const g = info.gaps[0], blk = g.to - g.from >= 70 ? 45 : 25; add('timer', 'var(--red)', `Hueco de ${X.durTxt(g.to - g.from)}`, `Bloque de ${blk} min para repasar ${g.after.name}`, () => { plan.task = 'Repasar ' + g.after.name; plan.focus = blk; plan.brk = blk === 45 ? 10 : 5; show('foco'); renderPlan(); }, 'Empezar'); }
  const last = (Object.values(S.days).flatMap(x => x.log || []).slice(-1)[0] || {});
  const task = plan.task || S.lastTask || '';
  applyEnergy();
  add('timer', 'var(--red)', task ? 'Seguir con: ' + task : `Un bloque de ${plan.focus} min`, task ? `${plan.focus} min de foco y ${plan.brk} de descanso` : 'Elige qué hacer y prepara tu espacio', () => { show('foco'); renderPlan(); }, 'Empezar');
  if (due > 0 && due < 5) add('cards', 'var(--blue)', `Repasar ${due} tarjeta${due === 1 ? '' : 's'}`, 'Un par de minutos', () => { show('rep'); $('#btnReview').click(); }, 'Repasar');
  return out;
}
function renderNow() {
  const c = candidates(), [a, ...rest] = c;
  if (!a) { nowBox.innerHTML = ''; return; }
  let h = `<div class="now"><span class="k">¿Qué toca ahora?</span><div class="row" style="gap:14px;margin-top:6px"><div class="ic" style="background:${a.color}">${ic(a.icon)}</div><div class="grow"><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></div></div>
    <button class="btn" id="nowGo" style="--acc:${a.color};--accD:rgba(0,0,0,.18);margin-top:14px">${esc(a.cta)}</button></div>`;
  const next = rest.filter(r => r.title !== a.title).slice(0, 2);
  if (next.length) h += `<div class="after">${next.map((r, i) => `<button data-n="${i}">${ic(r.icon, 'color:' + r.color)}<span>${esc(r.title)}</span>${ic('chev', 'margin-left:auto;color:var(--ink2)')}</button>`).join('')}</div>`;
  nowBox.innerHTML = h;
  $('#nowGo').onclick = a.fn;
  nowBox.querySelectorAll('[data-n]').forEach(b => b.onclick = next[+b.dataset.n].fn);
}

/* registro de energía y sueño: se recoge cuando ya respondiste hoy */
let checkOpen = false;
const NAMES = ['sin pilas', 'baja', 'normal', 'bien', '¡con todo!'];
function renderCheck() {
  const e = energy(), d = today(), done = e && d.sleep && !checkOpen;
  checkTile.classList.toggle('collapsed', !!done);
  let sum = checkTile.querySelector('.ci-sum');
  if (!sum) { sum = el('button', { class: 'ci-sum' }); checkTile.prepend(sum); sum.onclick = () => { checkOpen = true; renderCheck(); }; }
  if (done) sum.innerHTML = `<img src="img/hq/pe_${FACES[e - 1][0]}.webp" alt=""><span class="grow">Energía ${NAMES[e - 1]} · dormí ${d.sleep} h</span><span class="chg">Cambiar</span>`;
}

const prevHoy = renderHoy;
renderHoy = function () {
  const r = prevHoy.apply(this, arguments);
  try { renderNow(); renderCheck(); renderClassLine(); } catch (e) { console.error(e); }
  return r;
};
// al responder energía y sueño, el registro se recoge solo
checkTile.addEventListener('click', e => { if (e.target.closest('#energy button, #sleepSeg button')) setTimeout(() => { if (energy() && today().sleep) { checkOpen = false; renderCheck(); } }, 50); });

/* horario de hoy en una sola línea */
function renderClassLine() {
  let line = $('#classLine');
  if (!line) { line = el('button', { id: 'classLine', class: 'classline' }); checkTile.after(line); }
  const has = (S.classes || []).length;
  let txt = 'Agregar mi horario de clases';
  if (has) { const info = X.todayInfo(), n = info.list.length; txt = n ? `Hoy: ${n} clase${n === 1 ? '' : 's'}` + (info.next ? ` · siguiente ${X.hm(info.next.start)} ${info.next.name}` : info.now ? '' : ' · ya terminaste') : 'Hoy no tienes clases'; }
  line.innerHTML = `${ic('calcheck')}<span class="grow">${esc(txt)}</span>${ic('chev', 'color:var(--ink2)')}`;
  line.onclick = () => X.openSchedule();
}

/* ===================== Tú ===================== */
function renderTu() {
  const h = new Date().getHours(), sug = $('#tuSug'); let s = null;
  const ex = nextExam();
  if (ex && ex.left === 0) s = ['bolt', 'Hoy es tu examen: abre el kit', openExamKit];
  else if (h >= 21 || h < 5) s = ['moon', 'Es de noche: cierra el día y descansa', openNight];
  else if ((energy() || 3) <= 2) s = ['wind', 'Con poca energía, respira 1 minuto', () => $('#calmBreath').click()];
  sug.innerHTML = s ? `<button class="sugg">${ic(s[0])}<span>${s[1]}</span>${ic('chev', 'margin-left:auto')}</button>` : '';
  if (s) sug.firstChild.onclick = s[2];
  // progreso de la semana
  let mins = 0; for (let i = 0; i < 7; i++) mins += (S.days[dayKey(new Date(Date.now() - i * 86400000))] || {}).min || 0;
  const g = (S.goal || 60) * 5, pct = Math.min(1, mins / g);
  $('#tuRing').innerHTML = ringSVG(pct, 'var(--mint)', Math.round(pct * 100) + '%');
  $('#tuProgT').textContent = `${mins} min esta semana`;
  const nb = Object.keys(S.badges || {}).length;
  $('#tuProgS').textContent = `${nb} logro${nb === 1 ? '' : 's'} · toca para ver patrones y logros`;
}
$('#tuProg').onclick = openProgress;
$('#tuSet').onclick = () => $('#btnMe').click();

/* ===================== botón "+": anotar rápido ===================== */
$('#btnPlus').onclick = () => {
  openSheet(`<h2 class="sh-title">Anotar rápido</h2><div class="gap"></div>
    <div class="row"><input class="field grow" id="qIdea" maxlength="140" placeholder="Una idea para después…"><button class="rbtn" id="qIdeaGo" style="width:56px;height:56px;background:var(--yel);color:#5A4410">${ic('plus')}</button></div>
    <div class="gap"></div><div class="qgrid">
      <button data-q="card">${ic('cards')}<span>Tarjeta</span></button><button data-q="exam">${ic('cal')}<span>Examen</span></button>
      <button data-q="class">${ic('calcheck')}<span>Clase</span></button><button data-q="park">${ic('note')}<span>Ver ideas</span></button></div>`);
  const saveIdea = () => { const v = $('#qIdea').value.trim(); if (!v) return; addParking(v); $('#qIdea').value = ''; toast('Guardado en “Para después”'); drawSwitch(); };
  $('#qIdeaGo').onclick = saveIdea; $('#qIdea').onkeydown = e => { if (e.key === 'Enter') saveIdea(); };
  const go = { card: () => { closeSheet(); show('rep'); $('#toolNew').click(); }, exam: openExams, class: () => X.openClassForm(null, X.dowM()), park: openParking };
  $$('#sheetBody [data-q]').forEach(b => b.onclick = go[b.dataset.q]);
  setTimeout(() => $('#qIdea') && $('#qIdea').focus(), 300);
};

/* recordar la última tarea para proponerla en "¿Qué toca ahora?" */
const prevPlan = renderPlan;
renderPlan = function () { const r = prevPlan.apply(this, arguments); if (plan.task) { S.lastTask = plan.task; } return r; };

/* arranque */
renderHoy();
if ($('#v-calma').classList.contains('on')) renderTu();
})();
