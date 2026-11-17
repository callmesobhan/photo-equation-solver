// A seeded random generator (mulberry32), so a worksheet can be made again from its seed.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

function makeRng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** integer in [lo, hi] */
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    /** integer in [lo, hi] but never 0 */
    nonzero(lo, hi) {
      let v = 0;
      while (v === 0) v = lo + Math.floor(next() * (hi - lo + 1));
      return v;
    },
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

module.exports = { makeRng };
