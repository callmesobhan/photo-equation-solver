// Are two expressions equal? Asked of the exact solver: first by simplifying their difference to 0, and failing that by
// evaluating the difference exactly at several rational points (one different value is proof of "not equal"; agreement
// at every point is reported as "sampled", which is strong evidence but not a proof).
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const NAMES = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'log10', 'log2', 'sqrt', 'cbrt', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'exp', 'abs', 'ln', 'log', 'pi'];

/** Splits a run of letters into function names and single-letter variables. e (Euler's number) is a constant. */
function pieces(run) {
  const out = [];
  let i = 0;
  while (i < run.length) {
    const f = NAMES.find((n) => run.startsWith(n, i));
    if (f) { out.push({ fn: f }); i += f.length; }
    else { out.push({ v: run[i] }); i++; }
  }
  return out;
}

function variablesOf(text) {
  const vars = new Set();
  for (const m of String(text).matchAll(/[A-Za-z]+/g)) for (const p of pieces(m[0])) if (p.v && p.v !== 'e') vars.add(p.v);
  return [...vars].sort();
}

const POINTS = ['3/2', '-2', '5/3', '7/4', '-3/2', '1/3', '5/2', '3']; // negative points too: sqrt(x^2) is not x
function substitute(text, vars, sample) {
  return String(text).replace(/[A-Za-z]+/g, (run) =>
    pieces(run).map((p) => (p.fn ? p.fn : p.v === 'e' ? 'e' : '(' + POINTS[(sample + 2 * vars.indexOf(p.v)) % POINTS.length] + ')')).join('')
  );
}

/** The numeric value the solver printed for an answer, or NaN when it printed none we can trust:
 *  "(≈ 1.5)" or "(= 0)" at the end, a plain number, or a plain fraction. Never a number from inside an expression. */
const valueOf = (s) => {
  const NUM = '-?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?';
  let m = new RegExp('\\(\\s*[≈=]\\s*(' + NUM + ')\\s*\\)\\s*$', 'i').exec(s);
  if (m) return Number(m[1]);
  m = new RegExp('^\\s*(' + NUM + ')\\s*$', 'i').exec(s);
  if (m) return Number(m[1]);
  m = /^\s*(-?\d+)\s*\/\s*(\d+)\s*$/.exec(s);
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2]);
  return NaN;
};

/** @returns {Promise<{equal: boolean|null, how: string}>} equal null means "could not decide". */
async function equivalent(api, a, b) {
  const diff = '(' + a + ') - (' + b + ')';
  const s = await api.solve('simplify(' + diff + ')');
  if (s.ok && s.answer.length === 1 && s.answer[0].trim() === '0') return { equal: true, how: 'simplified to 0' };
  const vars = variablesOf(diff);
  let zero = 0;
  for (let i = 0; i < POINTS.length; i++) {
    const r = await api.solve(substitute(diff, vars, i));
    if (!r.ok || r.answer.length < 1) continue;
    const v = valueOf(r.answer[0]);
    if (Number.isNaN(v)) continue; // no trustworthy number: this point proves nothing either way
    if (Math.abs(v) > 1e-9) return { equal: false, how: 'differ at ' + vars.map((x, k) => x + ' = ' + POINTS[(i + 2 * k) % POINTS.length]).join(', ') };
    zero++;
  }
  if (zero >= 4) return { equal: true, how: 'equal at ' + zero + ' test points' };
  return { equal: null, how: 'could not be decided' };
}

module.exports = { equivalent, variablesOf, substitute };
