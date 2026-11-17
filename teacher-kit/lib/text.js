// Writing maths as text: one form the solver reads (input) and one for people (display).
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUP[Number(c)])).join('');

/** coeffs[k] is the coefficient of v^k. style 'input' -> x^2, style 'display' -> x² with a true minus sign. */
function poly(coeffs, style = 'input', v = 'x') {
  const parts = [];
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (c === 0) continue;
    const mag = Math.abs(c);
    let body;
    if (k === 0) body = String(mag);
    else {
      const pow = k === 1 ? v : style === 'input' ? v + '^' + k : v + sup(k);
      body = (mag === 1 ? '' : String(mag)) + pow;
    }
    parts.push({ neg: c < 0, body });
  }
  if (!parts.length) return '0';
  const minus = style === 'input' ? '-' : '−';
  return parts.map((p, i) => (i === 0 ? (p.neg ? minus : '') + p.body : (p.neg ? ' ' + minus + ' ' : ' + ') + p.body)).join('');
}

/** "3/2" -> "3⁄2"-free plain text kept as is; a negative number in brackets when it follows an operator. */
const paren = (n) => (n < 0 ? '(' + n + ')' : String(n));

const toDisplay = (s) => String(s).replace(/ - /g, ' − ').replace(/^-/, '−').replace(/\*/g, '·').replace(/<=/g, '≤').replace(/>=/g, '≥');

module.exports = { poly, sup, paren, toDisplay };
