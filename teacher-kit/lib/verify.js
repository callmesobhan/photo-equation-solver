// Does the solver's answer agree with the answer the generator worked out for itself?
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { parseFrac } = require('./frac.js');
const { equivalent } = require('./equiv.js');

const RAT = '-?\\d+(?:/\\d+)?';
/** The solver's remarks that are not part of an answer: "(= 1.5)", "(≈ 2.718)", "(double root)", "(interval notation)",
 *  "(the two sides are identical)". Brackets that belong to the maths, such as "(3/2)y", are never touched. */
const REMARK = /\s*\((?:[≈=][^()]*|double root|[^()]*interval notation[^()]*|[^()]*two sides are identical[^()]*)\)/g;
const clean = (s) => String(s).replace(/−/g, '-').replace(REMARK, '').replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
/** Only the trailing decimal remark of an expression answer: "(≈ 1.5)" or "(= 0)". */
const dropRemark = (s) => String(s).replace(/\s*\((?:≈|=)\s*[^()]*\)\s*$/, '').trim();
const rat = (t) => parseFrac(t);

/** @returns {Promise<{ok: boolean, reason?: string}>} */
async function verify(api, problem, result) {
  const e = problem.expect;
  if (!result.ok) return { ok: false, reason: 'the solver could not solve it: ' + (result.error || '').slice(0, 120) };
  if (result.needsReview) return { ok: false, reason: 'the solver doubts how the problem was read: ' + result.notes[0] };
  if (e.kind === 'roots') {
    const got = [];
    for (const line of result.answer) {
      const m = new RegExp('^x = (' + RAT + ')$').exec(clean(line));
      if (!m) return { ok: false, reason: 'unexpected answer line "' + line + '"' };
      got.push(rat(m[1]));
    }
    const a = got.map(String).sort().join(',');
    const b = e.values.map(String).sort().join(',');
    return a === b ? { ok: true } : { ok: false, reason: 'solver gave x = ' + a + ', expected x = ' + b };
  }
  if (e.kind === 'point') {
    const m = new RegExp('^x = (' + RAT + '), y = (' + RAT + ')$').exec(clean(result.answer[0] || ''));
    if (!m || result.answer.length !== 1) return { ok: false, reason: 'unexpected answer "' + result.answer.join(' | ') + '"' };
    const ok = rat(m[1]).eq(e.x) && rat(m[2]).eq(e.y);
    return ok ? { ok: true } : { ok: false, reason: 'solver gave x = ' + m[1] + ', y = ' + m[2] + '; expected x = ' + e.x + ', y = ' + e.y };
  }
  if (e.kind === 'ineq') {
    const m = new RegExp('^x (<=|≤|<|>=|≥|>) (' + RAT + ')$').exec(clean(result.answer[0] || ''));
    if (!m) return { ok: false, reason: 'unexpected answer "' + (result.answer[0] || '') + '"' };
    const op = m[1].replace('≤', '<=').replace('≥', '>=');
    return op === e.op && rat(m[2]).eq(e.value) ? { ok: true } : { ok: false, reason: 'solver gave x ' + op + ' ' + m[2] + ', expected x ' + e.op + ' ' + e.value };
  }
  if (e.kind === 'value') {
    const t = clean(result.answer[0] || '');
    const v = new RegExp('^' + RAT + '$').test(t) ? rat(t) : null;
    return v && v.eq(e.value) && result.answer.length === 1 ? { ok: true } : { ok: false, reason: 'solver gave "' + result.answer.join(' | ') + '", expected ' + e.value };
  }
  if (e.kind === 'expr') {
    if (result.answer.length !== 1) return { ok: false, reason: 'unexpected answer "' + result.answer.join(' | ') + '"' };
    const q = await equivalent(api, dropRemark(result.answer[0]), e.expr);
    return q.equal === true ? { ok: true } : { ok: false, reason: 'solver gave "' + result.answer[0] + '", expected an expression equal to ' + e.expr + ' (' + q.how + ')' };
  }
  return { ok: false, reason: 'unknown expectation ' + e.kind };
}

module.exports = { verify, clean, dropRemark };
