/* Maple · lógica de química y calculadora (sin interfaz). Masas atómicas IUPAC en data/elements.json. */
"use strict";
const Chem = (() => {
  let E = [], bySym = {};
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const setData = arr => { E = arr; bySym = {}; arr.forEach(e => bySym[e.s] = e); };
  const normalize = f => { let o = ''; for (const ch of String(f).trim()) { const i = SUB.indexOf(ch); if (i >= 0) o += i; else if ('·*•∙'.includes(ch)) o += '.'; else if (ch !== ' ') o += ch; } return o; };
  const isUp = c => c >= 'A' && c <= 'Z', isLo = c => c >= 'a' && c <= 'z', isD = c => c >= '0' && c <= '9';
  function parse(formula) {
    const f = normalize(formula); if (!f) return { ok: false, error: 'Escribe una fórmula' };
    const total = {};
    for (let part of f.split('.').filter(Boolean)) {
      let j = 0; while (j < part.length && isD(part[j])) j++;
      const mult = j ? +part.slice(0, j) : 1; part = part.slice(j);
      const st = { s: part, i: 0, err: '' };
      const atoms = group(st);
      if (st.err) return { ok: false, error: st.err };
      if (st.i < part.length) return { ok: false, error: `No entendí “${part.slice(st.i)}”` };
      for (const k in atoms) total[k] = (total[k] || 0) + atoms[k] * mult;
    }
    if (!Object.keys(total).length) return { ok: false, error: 'Escribe una fórmula' };
    return { ok: true, atoms: total };
  }
  function num(st) { let j = st.i; while (j < st.s.length && isD(st.s[j])) j++; if (j === st.i) return 1; const n = +st.s.slice(st.i, j); st.i = j; return n; }
  function group(st) {
    const out = {}, s = st.s;
    while (st.i < s.length && !st.err) {
      const c = s[st.i];
      if (c === '(' || c === '[') {
        st.i++; const inner = group(st);
        if (st.i >= s.length || !')]'.includes(s[st.i])) { st.err = 'Falta cerrar un paréntesis'; return out; }
        st.i++; const n = num(st); for (const k in inner) out[k] = (out[k] || 0) + inner[k] * n;
      } else if (c === ')' || c === ']') return out;
      else if (isUp(c)) {
        let sym = c; st.i++;
        if (st.i < s.length && isLo(s[st.i])) { sym += s[st.i]; st.i++; }
        if (!bySym[sym]) { st.err = `“${sym}” no es un elemento (revisa mayúsculas: Co ≠ CO)`; return out; }
        const n = num(st); out[sym] = (out[sym] || 0) + n;
      } else { st.err = `Carácter inesperado: “${c}”`; return out; }
    }
    return out;
  }
  const molarMass = atoms => Object.entries(atoms).reduce((a, [k, n]) => a + bySym[k].m * n, 0);
  function pretty(formula) {
    const f = normalize(formula).replace(/\./g, '·'); let o = '';
    for (let i = 0; i < f.length; i++) {
      const ch = f[i], prev = f[i - 1];
      if (isD(ch) && i > 0 && ((isD(prev) && SUB.includes(o[o.length - 1])) || (!isD(prev) && prev !== '·'))) o += SUB[+ch]; else o += ch;
    }
    return o;
  }
  // ---------- balanceo con fracciones exactas ----------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const fr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; };
  const fsub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  const fmul = (a, b) => fr(a[0] * b[0], a[1] * b[1]);
  const fdiv = (a, b) => fr(a[0] * b[1], a[1] * b[0]);
  function balance(reaction) {
    const sides = String(reaction).replace(/→|⟶|⇌|=/g, '->').split('->');
    if (sides.length !== 2) return { ok: false, error: 'Separa reactivos y productos con -> o =' };
    const species = []; let nreact = 0;
    for (let si = 0; si < 2; si++) for (const sp of sides[si].split('+')) {
      const t = sp.trim().replace(/^\d+/, '').trim(); if (!t) continue;
      const p = parse(t); if (!p.ok) return { ok: false, error: `${t}: ${p.error}` };
      species.push({ f: t, atoms: p.atoms }); if (si === 0) nreact++;
    }
    if (!nreact || nreact === species.length) return { ok: false, error: 'Faltan reactivos o productos' };
    const elems = [...new Set(species.flatMap(s => Object.keys(s.atoms)))], n = species.length;
    const M = elems.map(el => species.map((s, i) => fr((s.atoms[el] || 0) * (i < nreact ? 1 : -1), 1)));
    const piv = []; let r = 0;
    for (let c = 0; c < n && r < M.length; c++) {
      let p = -1; for (let k = r; k < M.length; k++) if (M[k][c][0] !== 0) { p = k; break; }
      if (p < 0) continue;
      [M[r], M[p]] = [M[p], M[r]];
      const pv = M[r][c]; for (let k = 0; k < n; k++) M[r][k] = fdiv(M[r][k], pv);
      for (let k = 0; k < M.length; k++) if (k !== r && M[k][c][0] !== 0) { const f = M[k][c]; for (let q = 0; q < n; q++) M[k][q] = fsub(M[k][q], fmul(f, M[r][q])); }
      piv.push(c); r++;
    }
    const free = [...Array(n).keys()].filter(c => !piv.includes(c));
    if (free.length !== 1) return { ok: false, error: free.length > 1 ? 'No tiene una única forma de balancearse (revisa las fórmulas)' : 'No se puede balancear: revisa las fórmulas' };
    const fc = free[0], sol = Array.from({ length: n }, () => [0, 1]); sol[fc] = [1, 1];
    piv.forEach((c, k) => sol[c] = fr(-M[k][fc][0], M[k][fc][1]));
    let l = 1; sol.forEach(x => l = l * x[1] / gcd(l, x[1]));
    let coef = sol.map(x => x[0] * l / x[1]);
    const g = coef.reduce((a, x) => gcd(a, x), 0); coef = coef.map(x => x / g);
    if (coef.some(x => x <= 0)) { if (coef.every(x => x < 0)) coef = coef.map(x => -x); else return { ok: false, error: 'No se puede balancear: revisa reactivos y productos' }; }
    const parts = [[], []]; species.forEach((s, i) => parts[i < nreact ? 0 : 1].push((coef[i] === 1 ? '' : coef[i]) + pretty(s.f)));
    return { ok: true, coef, species: species.map(s => s.f), nreact, text: parts[0].join(' + ') + '  →  ' + parts[1].join(' + ') };
  }
  const sup = s => String(s).split('').map(c => c === '-' ? '⁻' : isD(c) ? SUP[+c] : c).join('');
  function fmt(x, sig = 4) {
    if (Number.isNaN(x)) return '—'; if (!isFinite(x)) return x > 0 ? '∞' : '−∞'; if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax >= 1e-3 && ax < 1e6) { const dec = Math.min(8, Math.max(0, sig - 1 - Math.floor(Math.log10(ax)))); let s = x.toFixed(dec); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s.replace('-', '−'); }
    let ex = Math.floor(Math.log10(ax)), m = x / 10 ** ex; if (Math.abs(m) >= 9.9995 && sig <= 4) { m /= 10; ex++; }
    let ms = m.toFixed(sig - 1); if (ms.includes('.')) ms = ms.replace(/0+$/, '').replace(/\.$/, '');
    return (ms + ' × 10' + sup(ex)).replace('-', '−');
  }
  return { setData, parse, molarMass, pretty, balance, fmt, sup, get E() { return E; }, get bySym() { return bySym; } };
})();

/* Calculadora: descenso recursivo con + − × ÷ ^ !, paréntesis, multiplicación implícita, notación E,
   sin cos tan (y sus inversas), ln log √ ∛, π, e, Ans. */
const Calc = (() => {
  const FUNCS = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'cbrt', 'abs', 'exp'];
  const C = { deg: true, ans: 0 };
  function tokenize(src) {
    const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt')
      .replace(/sin⁻¹/g, 'asin').replace(/cos⁻¹/g, 'acos').replace(/tan⁻¹/g, 'atan').replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3').replace(/,/g, '.');
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        if (s[j] === 'E') { let k = j + 1; if (s[k] === '+' || s[k] === '-') k++; while (k < s.length && /[0-9]/.test(s[k])) k++; j = k; }
        const txt = s.slice(i, j); if ((txt.match(/\./g) || []).length > 1 || txt === '.') return [{ t: 'err', v: 'Número mal escrito: ' + txt }];
        t.push({ t: 'num', v: parseFloat(txt) }); i = j;
      } else if ('+-*/^!()'.includes(c)) { t.push({ t: 'op', v: c }); i++; }
      else {
        const w = [...FUNCS, 'pi', 'Ans', 'e'].find(f => s.startsWith(f, i));
        if (!w) return [{ t: 'err', v: `No entendí “${c}”` }];
        t.push({ t: FUNCS.includes(w) ? 'fn' : 'id', v: w }); i += w.length;
      }
    }
    return t;
  }
  function evaluate(src) {
    const toks = tokenize(src); if (!toks.length) return { ok: false, error: '' };
    if (toks[0].t === 'err') return { ok: false, error: toks[0].v };
    let depth = 0; toks.forEach(t => { if (t.t === 'op' && t.v === '(') depth++; if (t.t === 'op' && t.v === ')') depth--; });
    for (let k = 0; k < depth; k++) toks.push({ t: 'op', v: ')' });
    const st = { t: toks, i: 0, err: '' };
    const v = expr(st);
    if (!st.err && st.i < toks.length) st.err = 'Sobra algo al final';
    if (st.err) return { ok: false, error: st.err };
    if (Number.isNaN(v)) return { ok: false, error: 'Fuera del dominio (p. ej. raíz o log de un negativo)' };
    if (!isFinite(v)) return { ok: false, error: 'División por cero o número demasiado grande' };
    return { ok: true, v };
  }
  const peek = st => st.t[st.i], is = (st, o) => { const p = peek(st); return p && p.t === 'op' && p.v === o; };
  function expr(st) { let v = term(st); while (!st.err && (is(st, '+') || is(st, '-'))) { const o = st.t[st.i++].v; const r = term(st); v = o === '+' ? v + r : v - r; } return v; }
  const startsPrim = st => { const p = peek(st); return p && (['num', 'fn', 'id'].includes(p.t) || (p.t === 'op' && p.v === '(')); };
  function term(st) {
    let v = unary(st);
    while (!st.err) {
      if (is(st, '*') || is(st, '/')) { const o = st.t[st.i++].v; const r = unary(st); v = o === '*' ? v * r : (r !== 0 ? v / r : Infinity); }
      else if (startsPrim(st)) v *= unary(st); else break;
    }
    return v;
  }
  function unary(st) { if (is(st, '-')) { st.i++; return -unary(st); } if (is(st, '+')) { st.i++; return unary(st); } return power(st); }
  function power(st) { const b = postfix(st); if (is(st, '^')) { st.i++; return Math.pow(b, unary(st)); } return b; }
  function postfix(st) {
    let v = primary(st);
    while (is(st, '!')) { st.i++; if (v < 0 || v !== Math.floor(v) || v > 170) { st.err = 'El factorial es para enteros de 0 a 170'; return 0; } let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; }
    return v;
  }
  function primary(st) {
    const p = peek(st); if (!p) { st.err = 'Falta un número al final'; return 0; }
    if (p.t === 'num') { st.i++; return p.v; }
    if (p.t === 'id') { st.i++; return p.v === 'pi' ? Math.PI : p.v === 'e' ? Math.E : C.ans; }
    if (p.t === 'op' && p.v === '(') { st.i++; const v = expr(st); if (!is(st, ')')) { st.err = 'Falta cerrar un paréntesis'; return 0; } st.i++; return v; }
    if (p.t === 'fn') {
      st.i++; const x = is(st, '(') ? primary(st) : postfix(st); const k = C.deg ? Math.PI / 180 : 1;
      switch (p.v) {
        case 'sin': return Math.sin(x * k);
        case 'cos': return Math.cos(x * k);
        case 'tan': return C.deg && (Math.abs(x) - 90) % 180 === 0 ? Infinity : Math.tan(x * k);
        case 'asin': return Math.abs(x) <= 1 ? Math.asin(x) / k : NaN;
        case 'acos': return Math.abs(x) <= 1 ? Math.acos(x) / k : NaN;
        case 'atan': return Math.atan(x) / k;
        case 'ln': return x > 0 ? Math.log(x) : NaN;
        case 'log': return x > 0 ? Math.log10(x) : NaN;
        case 'sqrt': return x >= 0 ? Math.sqrt(x) : NaN;
        case 'cbrt': return Math.cbrt(x);
        case 'abs': return Math.abs(x);
        case 'exp': return Math.exp(x);
      }
    }
    st.err = 'Expresión incompleta'; return 0;
  }
  return { evaluate, state: C };
})();
if (typeof module !== 'undefined') module.exports = { Chem, Calc };
