// Exact rational numbers for the generators' own arithmetic (small numbers only: integers up to 2^53).
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

class Frac {
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error('Frac needs integers and a non-zero denominator');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
    if (!Number.isSafeInteger(this.n) || !Number.isSafeInteger(this.d)) throw new Error('number too large');
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  eq(o) { return this.n === o.n && this.d === o.d; }
  sign() { return Math.sign(this.n); }
  isInt() { return this.d === 1; }
  toString() { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; }
}
const F = (n, d = 1) => new Frac(n, d);

/** "3/2", "-4", "7" -> Frac, or null when the text is not a plain rational number. */
function parseFrac(text) {
  const m = /^\s*([+-]?\d+)(?:\s*\/\s*(\d+))?\s*$/.exec(String(text).replace(/−/g, '-'));
  if (!m) return null;
  const d = m[2] === undefined ? 1 : Number(m[2]);
  return d === 0 ? null : new Frac(Number(m[1]), d);
}

module.exports = { Frac, F, parseFrac, gcd };
