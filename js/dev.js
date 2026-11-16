/* Maple · modo developer
   Se abre tocando 5 veces el logo "Maple" y pide contraseña.
   Ojo: es un candado práctico, no seguridad real (todo corre en el navegador). */
(() => {
'use strict';
const RW = window.MapleRewards;
const LK = 'maple-dev';                       // ajustes del candado: solo en este dispositivo
const DEF_PASS = 'maple2026';
const loc = () => { try { return JSON.parse(localStorage.getItem(LK) || '{}'); } catch (e) { return {}; } };
const setLoc = o => { try { localStorage.setItem(LK, JSON.stringify(Object.assign(loc(), o))); } catch (e) {} };
// hash simple (FNV-1a de 2 vueltas) para no guardar la contraseña en claro
const hash = str => { let h1 = 0x811c9dc5, h2 = 0x01000193; for (const ch of 'maple:' + str) { const c = ch.codePointAt(0); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; } return h1.toString(16) + h2.toString(16); };
const passHash = () => loc().hash || hash(DEF_PASS);
const unlocked = () => loc().until > Date.now();

/* contenido propio (viaja con el respaldo y la nube) */
const DV = () => { S.dev = S.dev || {}; S.dev.phrases = S.dev.phrases || []; S.dev.facts = S.dev.facts || []; S.dev.quiz = S.dev.quiz || []; return S.dev; };
function applyContent() {
  const d = DV(), T = window.MAPLE_TRIVIA;
  if (RW) RW.PHRASES.propias = d.phrases.slice();
  if (T) {
    T.facts = T.facts.filter(f => !f._dev).concat(d.facts.map(f => Object.assign({ _dev: 1 }, f)));
    T.quiz = T.quiz.filter(q => !q._dev).concat(d.quiz.map(q => Object.assign({ _dev: 1 }, q)));
  }
}
// TRIVIA en extra.js guarda la misma referencia del objeto: mutamos sus arreglos en el mismo objeto
(() => { const T = window.MAPLE_TRIVIA; if (!T) return; const f0 = T.facts, q0 = T.quiz;
  Object.defineProperty(T, 'facts', { get: () => f0, set: v => { f0.length = 0; f0.push(...v); }, configurable: true });
  Object.defineProperty(T, 'quiz', { get: () => q0, set: v => { q0.length = 0; q0.push(...v); }, configurable: true });
})();
applyContent();

/* ---------- entrada: 5 toques en el logo ---------- */
let taps = 0, tapT = 0;
const brand = $('.top .brand');
brand.style.cursor = 'pointer';
brand.addEventListener('click', () => {
  taps = Date.now() - tapT < 700 ? taps + 1 : 1; tapT = Date.now();
  if (taps >= 5) { taps = 0; unlocked() ? openDev() : askPass(); }
});
function askPass() {
  openSheet(`<h2 class="sh-title">Modo developer</h2><p class="sub" style="margin:0 0 14px">Escribe la contraseña.</p>
    <input class="field" id="dvPass" type="password" autocomplete="off" placeholder="Contraseña"><div class="gap"></div>
    <button class="btn" id="dvGo" style="--acc:var(--ink);--accD:#000">Entrar</button>`);
  setTimeout(() => $('#dvPass').focus(), 300);
  const go = () => {
    if (hash($('#dvPass').value) === passHash()) { setLoc({ until: Date.now() + 12 * 3600e3 }); drawBadge(); openDev(); toast('Modo developer activo', 'feliz'); }
    else { $('#dvPass').value = ''; toast('Contraseña incorrecta', 'sorprendida'); }
  };
  $('#dvGo').onclick = go; $('#dvPass').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function drawBadge() {
  let b = $('#devBadge');
  if (unlocked()) { if (!b) { b = el('button', { id: 'devBadge', class: 'devbadge', html: '&lt;/&gt; DEV' }); brand.after(b); b.onclick = openDev; } }
  else if (b) b.remove();
}

/* ---------- panel ---------- */
let tab = 'jugar';
const TABS = [['jugar', 'Recompensas'], ['probar', 'Probar'], ['contenido', 'Contenido'], ['datos', 'Datos']];
function openDev() {
  if (!unlocked()) return askPass();
  const r = RW.R(), st = RW.stageOf(r.got);
  const body = {
    jugar: () => `
      <div class="label">Hojas</div>
      <div class="tile dv"><div class="row"><b class="grow">${r.got - r.spent} disponibles · ${r.got} ganadas</b></div>
        <div class="dvrow">${[10, 50, 100, 500].map(n => `<button data-add="${n}">+${n}</button>`).join('')}<button data-add="-10">−10</button></div>
        <div class="row" style="margin-top:10px"><input class="field grow" id="dvGot" inputmode="numeric" placeholder="Fijar hojas ganadas" style="padding:12px 14px"><button class="rbtn" id="dvGotGo" style="width:48px;height:48px;background:var(--ink);color:#fff">${ic('check')}</button></div>
        <button class="link" id="dvRefund" style="margin-top:6px">Devolver todo lo gastado</button></div>
      <div class="gap"></div><div class="label">Etapa del árbol · ${RW.STAGES[st][1]}</div>
      <div class="tile dv"><input type="range" id="dvStage" min="0" max="${RW.STAGES.length - 1}" value="${st}" style="width:100%">
        <div class="dvrow" style="justify-content:space-between;font-size:12px;color:var(--ink2)"><span>Semilla</span><span>Arce de otoño</span></div>
        <div class="dvrow"><button id="dvGarden">Ver jardín 3D</button><button id="dvGrow">Simular “creció”</button></div></div>
      <div class="gap"></div><div class="label">Armario</div>
      <div class="tile dv"><div class="dvrow"><button id="dvUnlock">Desbloquear todo</button><button id="dvLock">Bloquear todo</button></div></div>`,
    probar: () => `
      <div class="label">Pantallas y avisos</div>
      <div class="tile dv"><div class="dvrow wrap">
        <button data-t="letter">Carta de Maple</button><button data-t="back">Bienvenida de vuelta</button>
        <button data-t="pop">“+3 hojas”</button><button data-t="goal">Meta cumplida</button>
        <button data-t="confetti">Confeti</button><button data-t="welcome">Bienvenida inicial</button></div></div>
      <div class="gap"></div><div class="label">Emociones de Maple</div>
      <div class="tile dv"><div class="dvrow wrap">${['feliz', 'risa', 'neutral', 'sorprendida', 'sad', 'tired', 'molesta', 'asustada'].map(e => `<button data-emo="${e}">${e}</button>`).join('')}
        <button data-emo="hop">saltar</button><button data-emo="celebrate">celebrar</button></div></div>
      <div class="gap"></div><div class="label">Bloque de foco</div>
      <div class="tile dv"><div class="dvrow wrap"><button id="dvEndRun">Terminar bloque ya</button><button id="dvRun1">Bloque de 1 min</button></div></div>
      <div class="gap"></div><div class="label">Historial de prueba</div>
      <div class="tile dv"><p class="sub" style="font-size:13px;margin:0 0 8px">Crea 3 semanas de estudio inventadas para ver gráficas, patrones, carta y semanas constantes.</p>
        <div class="dvrow"><button id="dvFake">Generar 3 semanas</button><button id="dvFakeX">Quitar lo generado</button></div></div>`,
    contenido: () => `
      <div class="label">Frases de Maple (una por línea, máx. 32 letras)</div>
      <textarea class="field" id="dvPhr" style="min-height:120px" placeholder="¡Hoy toca química!">${esc(DV().phrases.join('\n'))}</textarea>
      <div class="gap"></div><div class="label">Datos curiosos propios (uno por línea · Categoría: texto)</div>
      <textarea class="field" id="dvFacts" style="min-height:140px" placeholder="Química: El agua se expande al congelarse.">${esc(DV().facts.map(f => f.c + ': ' + f.t).join('\n'))}</textarea>
      <div class="gap"></div><div class="label">Preguntas del quiz (pregunta | correcta | 3 incorrectas)</div>
      <textarea class="field" id="dvQuiz" style="min-height:120px" placeholder="¿Símbolo del sodio? | Na | So | S | N">${esc(DV().quiz.map(q => [q.q, ...q.o.slice(q.a, q.a + 1), ...q.o.filter((_, i) => i !== q.a)].join(' | ')).join('\n'))}</textarea>
      <div class="gap"></div><button class="btn" id="dvSaveC" style="--acc:var(--ink);--accD:#000">Guardar contenido</button>`,
    datos: () => `
      <div class="label">Estado de la app (JSON)</div>
      <textarea class="field mono" id="dvJson" style="min-height:240px" spellcheck="false"></textarea>
      <div class="dvrow"><button id="dvJsonGo">Aplicar cambios</button><button id="dvJsonCopy">Copiar</button></div>
      <div class="gap"></div><div class="label">Contraseña</div>
      <div class="row"><input class="field grow" id="dvNewP" type="password" placeholder="Nueva contraseña" style="padding:12px 14px"><button class="rbtn" id="dvNewPGo" style="width:48px;height:48px;background:var(--ink);color:#fff">${ic('check')}</button></div>
      <div class="gap"></div><div class="tile dv"><div class="dvrow wrap"><button id="dvExit">Salir del modo dev</button><button id="dvWipe" class="danger">Borrar todos los datos</button></div></div>`,
  };
  openSheet(`<h2 class="sh-title">${ic('code', 'vertical-align:-3px;margin-right:6px')}Developer</h2>
    <div class="seg dvtabs">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div><div class="gap"></div>
    <div id="dvBody">${body[tab]()}</div>`);
  $$('#sheetBody [data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; openDev(); });
  const q = s => $('#sheetBody ' + s), on = (s, f) => { const e = q(s); if (e) e.onclick = f; };
  const done = (msg) => { save(); try { RW.renderStrip(); RW.applyScene(); renderHoy(); } catch (e) {} if (msg) toast(msg, 'feliz'); const sh = $('.sheet'), y = sh.scrollTop; openDev(); sh.scrollTop = y; };
  sheetOnClose = () => renderHoy();

  if (tab === 'jugar') {
    $$('#sheetBody [data-add]').forEach(b => b.onclick = () => { const n = +b.dataset.add; r.got = Math.max(r.spent, r.got + n); done(); });
    on('#dvGotGo', () => { const v = parseInt(q('#dvGot').value, 10); if (isNaN(v)) return; r.got = Math.max(0, v); r.spent = Math.min(r.spent, r.got); done('Hojas fijadas'); });
    on('#dvRefund', () => { r.spent = 0; done('Hojas devueltas'); });
    q('#dvStage').onchange = e => { const t = RW.STAGES[+e.target.value][0]; const avail = r.got - r.spent; r.got = t; r.spent = Math.max(0, t - Math.max(0, avail)); if (r.spent > r.got) r.spent = r.got; done('Etapa: ' + RW.STAGES[+e.target.value][1]); };
    on('#dvGarden', () => RW.openGarden());
    on('#dvGrow', () => { r.grew = true; save(); toast('¡Tu árbol creció! Ahora es: ' + RW.STAGES[st][1], 'risa'); try { confetti(); } catch (e) {} RW.renderStrip(); });
    on('#dvUnlock', () => { RW.SHOP.forEach(([id]) => r.inv[id] = 1); done('Todo desbloqueado'); });
    on('#dvLock', () => { r.inv = {}; r.deco = []; r.bg = 'none'; done('Armario bloqueado'); });
  }
  if (tab === 'probar') {
    const T = {
      letter: () => { const k = dayKey(RW.mondayOf(new Date(Date.now() - 7 * 864e5))); delete r.letters[k]; delete r.once['letter' + k]; save(); RW.openLetter(k); },
      back: () => { r.backSeen = ''; const keep = {}; for (let i = 0; i < 4; i++) { const k = dayKey(new Date(Date.now() - i * 864e5)); if (S.days[k]) { keep[k] = S.days[k]; delete S.days[k]; } } S.dev._hidden = Object.assign(S.dev._hidden || {}, keep); save(); closeSheet(); show('hoy'); renderHoy(); toast('Ocultos los últimos 4 días (se restauran con “Quitar lo generado”)', 'feliz'); },
      pop: () => { closeSheet(); setTimeout(() => RW.earn(3, 'prueba'), 300); },
      goal: () => { const d = today(); d.goalHit = false; d.min = Math.max(d.min, (S.goal || 60)); closeSheet(); checkGoal(); },
      confetti: () => { closeSheet(); confetti(); },
      welcome: () => { S.onboarded = false; save(); location.reload(); },
    };
    $$('#sheetBody [data-t]').forEach(b => b.onclick = T[b.dataset.t]);
    $$('#sheetBody [data-emo]').forEach(b => b.onclick = () => {
      const e = b.dataset.emo; closeSheet(); show('hoy');
      setTimeout(() => { try { if (e === 'hop') mHero.hop(); else if (e === 'celebrate') mHero.celebrate(); else mHero.pose('emo_' + e, 'idle', 1800, 'a-talk', 450); } catch (x) { toast('No disponible: ' + e, 'sorprendida'); } }, 350);
    });
    on('#dvEndRun', () => { if (!S.run) return toast('No hay un bloque corriendo', 'sorprendida'); S.run.endAt = Date.now() - 500; save(); closeSheet(); show('foco'); });
    on('#dvRun1', () => { closeSheet(); plan.task = plan.task || 'Prueba'; plan.focus = 1; show('foco'); renderPlan(); });
    on('#dvFake', () => {
      const L = [15, 25, 25, 45]; let n = 0;
      for (let i = 1; i <= 21; i++) {
        if (Math.random() < .35) continue;
        const dt = new Date(Date.now() - i * 864e5), k = dayKey(dt); if (S.days[k] && !S.days[k]._fake) continue;
        const b = 1 + Math.floor(Math.random() * 3), dur = L[Math.floor(Math.random() * 4)];
        S.days[k] = { _fake: 1, min: b * dur, blocks: b, cards: Math.floor(Math.random() * 25), focus: Array.from({ length: b }, () => 2 + Math.floor(Math.random() * 4)), distract: Math.floor(Math.random() * 3), sleep: ['<6', '6-7', '7-9', '7-9'][Math.floor(Math.random() * 4)], habits: {},
          log: Array.from({ length: b }, () => ({ h: [9, 15, 20][Math.floor(Math.random() * 3)], dur, spent: dur, done: true, dist: Math.floor(Math.random() * 3), rate: 2 + Math.floor(Math.random() * 4) })) };
        r.log[k] = b * 3; n++;
      }
      done(n + ' días de prueba creados');
    });
    on('#dvFakeX', () => { Object.keys(S.days).forEach(k => { if (S.days[k]._fake) { delete S.days[k]; delete r.log[k]; } }); Object.assign(S.days, (S.dev._hidden || {})); S.dev._hidden = {}; done('Historial de prueba quitado'); });
  }
  if (tab === 'contenido') {
    on('#dvSaveC', () => {
      const d = DV(), bad = [];
      d.phrases = q('#dvPhr').value.split('\n').map(x => x.trim()).filter(Boolean).map(x => x.slice(0, 32));
      d.facts = q('#dvFacts').value.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return i > 0 && i < 20 ? { c: x.slice(0, i).trim(), t: x.slice(i + 1).trim() } : { c: 'Ciencia', t: x }; });
      d.quiz = q('#dvQuiz').value.split('\n').map(x => x.trim()).filter(Boolean).map((x, li) => { const p = x.split('|').map(y => y.trim()).filter(Boolean); if (p.length !== 5) { bad.push(li + 1); return null; } const o = p.slice(1, 5); return { q: p[0], o, a: 0, e: '' }; }).filter(Boolean);
      applyContent(); save();
      toast(bad.length ? 'Guardado. Revisa las líneas del quiz: ' + bad.join(', ') : 'Contenido guardado', bad.length ? 'sorprendida' : 'risa');
      try { $('#say').textContent = sayLine(); } catch (e) {}
    });
  }
  if (tab === 'datos') {
    q('#dvJson').value = JSON.stringify(S, null, 2);
    on('#dvJsonGo', () => { try { const o = JSON.parse(q('#dvJson').value); if (typeof o !== 'object' || !o) throw 0; localStorage.setItem('maple-estudio-v1', JSON.stringify(Object.assign(o, { updated: Date.now() }))); toast('Aplicado. Recargando…', 'feliz'); setTimeout(() => location.reload(), 600); } catch (e) { toast('El JSON tiene un error', 'sorprendida'); } });
    on('#dvJsonCopy', () => { try { navigator.clipboard.writeText(q('#dvJson').value).then(() => toast('Copiado')); } catch (e) { q('#dvJson').select(); } });
    on('#dvNewPGo', () => { const v = q('#dvNewP').value; if (v.length < 4) return toast('Mínimo 4 caracteres', 'sorprendida'); setLoc({ hash: hash(v) }); q('#dvNewP').value = ''; toast('Contraseña cambiada', 'risa'); });
    on('#dvExit', () => { setLoc({ until: 0 }); drawBadge(); closeSheet(); toast('Saliste del modo developer'); });
    on('#dvWipe', () => {
      const b = q('#dvWipe');
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Toca otra vez para confirmar'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Borrar todos los datos'; } }, 3000); return; }
      try { localStorage.removeItem('maple-estudio-v1'); localStorage.removeItem('maple-tree3d'); } catch (e) {}
      location.reload();
    });
  }
}

/* ícono */
document.querySelector('svg symbol').parentNode.insertAdjacentHTML('beforeend', '<symbol id="i-code" viewBox="0 0 24 24"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></symbol>');
drawBadge();
window.MapleDev = { openDev };
})();
