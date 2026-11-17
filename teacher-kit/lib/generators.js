// Problem generators. Each builds a problem from chosen numbers, so it knows its own answer independently of the solver:
//   { topic, level, prompt, lines, input, expect }
//     prompt  the instruction for the student ("Solve for x:")
//     lines   the maths as shown to the student (one or more lines)
//     input   the same maths as the solver reads it
//     expect  what a correct answer is, worked out here with exact fractions, not by the solver:
//             { kind: 'roots', values: [Frac] } | { kind: 'point', x, y } | { kind: 'ineq', op, value }
//             | { kind: 'value', value } | { kind: 'expr', expr }
// The worksheet builder asks the solver for every answer and keeps a problem only when the solver agrees with `expect`.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { F } = require('./frac.js');
const { poly, sup } = require('./text.js');

const M = '−'; // true minus sign for display
const signed = (c) => (c < 0 ? M + Math.abs(c) : String(c));

/** a x + b as text, in 'input' or 'display' style. */
const lin = (a, b, style) => poly([b, a], style);

/** a x + b y as text. */
function lin2(a, b, style) {
  const minus = style === 'input' ? '-' : M;
  const term = (c, v, first) => {
    if (c === 0) return '';
    const mag = Math.abs(c);
    const body = (mag === 1 ? '' : String(mag)) + v;
    return first ? (c < 0 ? minus : '') + body : (c < 0 ? ' ' + minus + ' ' : ' + ') + body;
  };
  const x = term(a, 'x', true);
  const y = term(b, 'y', x === '');
  return (x + y) || '0';
}

const rhs = (n, style) => (style === 'input' ? String(n) : signed(n));

// ---------- linear equations ----------
function linear(rng, level) {
  let a, b, c, d, input, display;
  if (level === 1) {
    // a x + b = d, whole-number answer
    const x0 = rng.int(-9, 9);
    a = rng.nonzero(-9, 9);
    if (Math.abs(a) === 1) a *= rng.pick([2, 3, 5]);
    b = rng.nonzero(-12, 12);
    d = a * x0 + b;
    input = lin(a, b, 'input') + ' = ' + d;
    display = lin(a, b, 'display') + ' = ' + rhs(d, 'display');
    return { topic: 'linear', level, prompt: 'Solve for x.', lines: [display], input, expect: { kind: 'roots', values: [F(x0)] } };
  }
  if (level === 2) {
    // a x + b = c x + d, whole-number answer
    const x0 = rng.int(-9, 9);
    a = rng.int(2, 9) * rng.pick([1, -1]);
    c = rng.int(-6, 6);
    while (c === a) c = rng.int(-6, 6);
    b = rng.nonzero(-12, 12);
    d = a * x0 + b - c * x0;
    input = lin(a, b, 'input') + ' = ' + lin(c, d, 'input');
    display = lin(a, b, 'display') + ' = ' + lin(c, d, 'display');
    return { topic: 'linear', level, prompt: 'Solve for x.', lines: [display], input, expect: { kind: 'roots', values: [F(x0)] } };
  }
  // level 3: a(x + b) = c x + d, answer may be a fraction
  a = rng.int(2, 7) * rng.pick([1, -1]);
  b = rng.nonzero(-7, 7);
  c = rng.int(-5, 5);
  while (c === a) c = rng.int(-5, 5);
  d = rng.nonzero(-15, 15);
  const left = (style) => {
    const minus = style === 'input' ? '-' : M;
    const coef = a < 0 ? minus + (Math.abs(a) === 1 ? '' : Math.abs(a)) : a === 1 ? '' : String(a);
    return coef + '(x ' + (b < 0 ? minus : '+') + ' ' + Math.abs(b) + ')';
  };
  input = left('input') + ' = ' + lin(c, d, 'input');
  display = left('display') + ' = ' + lin(c, d, 'display');
  return { topic: 'linear', level, prompt: 'Solve for x. Give the answer as a fraction if it is not a whole number.', lines: [display], input, expect: { kind: 'roots', values: [F(d - a * b, a - c)] } };
}

// ---------- quadratic equations ----------
function quadratic(rng, level) {
  let a = 1;
  let r1, r2, roots;
  if (level === 1) {
    r1 = rng.nonzero(-8, 8);
    do r2 = rng.nonzero(-8, 8); while (r2 === r1);
    roots = [F(r1), F(r2)];
    const b = -(r1 + r2);
    const c = r1 * r2;
    return build(1, b, c, roots, 'Solve for x.');
  }
  if (level === 2) {
    a = rng.pick([2, 3, -1, -2, 4]);
    r1 = rng.nonzero(-6, 6);
    if (rng.chance(0.2)) r2 = r1; // a repeated root now and then
    else do r2 = rng.int(-6, 6); while (r2 === r1);
    roots = r1 === r2 ? [F(r1)] : [F(r1), F(r2)];
    return build(a, -a * (r1 + r2), a * r1 * r2, roots, 'Solve for x.');
  }
  // level 3: rational roots p/q and r/s from (q x - p)(s x - r) = 0
  let p, q, r, s;
  do {
    q = rng.int(1, 4);
    s = rng.int(1, 4);
    p = rng.nonzero(-7, 7);
    r = rng.nonzero(-7, 7);
  } while (F(p, q).eq(F(r, s)) || (q === 1 && s === 1));
  return build(q * s, -(q * r + s * p), p * r, [F(p, q), F(r, s)], 'Solve for x. Give the roots as fractions if they are not whole numbers.');

  function build(A, B, C, rs, prompt) {
    const coeffs = [C, B, A];
    return { topic: 'quadratic', level, prompt, lines: [poly(coeffs, 'display') + ' = 0'], input: poly(coeffs, 'input') + ' = 0', expect: { kind: 'roots', values: rs } };
  }
}

// ---------- systems of two linear equations ----------
function system(rng, level) {
  let a1, b1, c1, a2, b2, c2, x, y;
  for (;;) {
    if (level === 1) {
      const x0 = rng.int(-8, 8);
      const y0 = rng.int(-8, 8);
      a1 = 1; b1 = 1; c1 = x0 + y0;
      a2 = 1; b2 = -1; c2 = x0 - y0;
      x = F(x0); y = F(y0);
      break;
    }
    a1 = rng.nonzero(-5, 5); b1 = rng.nonzero(-5, 5);
    a2 = rng.nonzero(-5, 5); b2 = rng.nonzero(-5, 5);
    const det = a1 * b2 - a2 * b1;
    if (det === 0) continue;
    if (level === 2) {
      const x0 = rng.int(-6, 6);
      const y0 = rng.int(-6, 6);
      c1 = a1 * x0 + b1 * y0; c2 = a2 * x0 + b2 * y0;
      x = F(x0); y = F(y0);
    } else {
      c1 = rng.nonzero(-12, 12); c2 = rng.nonzero(-12, 12);
      x = F(c1 * b2 - c2 * b1, det); y = F(a1 * c2 - a2 * c1, det);
    }
    break;
  }
  const eq = (a, b, c, style) => lin2(a, b, style) + ' = ' + rhs(c, style);
  return {
    topic: 'system',
    level,
    prompt: 'Solve the system of equations for x and y.' + (level === 3 ? ' Give fractions if the values are not whole numbers.' : ''),
    lines: [eq(a1, b1, c1, 'display'), eq(a2, b2, c2, 'display')],
    input: eq(a1, b1, c1, 'input') + '; ' + eq(a2, b2, c2, 'input'),
    expect: { kind: 'point', x, y },
  };
}

// ---------- linear inequalities ----------
const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
function inequality(rng, level) {
  const op = rng.pick(['<', '<=', '>', '>=']);
  const showOp = op.replace('<=', '≤').replace('>=', '≥');
  let a, b, c, d, input, display;
  if (level === 1) {
    a = rng.nonzero(-9, 9);
    if (Math.abs(a) === 1) a *= rng.pick([2, 3]);
    b = rng.nonzero(-12, 12);
    d = rng.int(-20, 20);
    c = 0;
    input = lin(a, b, 'input') + ' ' + op + ' ' + d;
    display = lin(a, b, 'display') + ' ' + showOp + ' ' + rhs(d, 'display');
  } else {
    a = rng.int(2, 9) * rng.pick([1, -1]);
    c = rng.int(-6, 6);
    while (c === a) c = rng.int(-6, 6);
    b = rng.nonzero(-12, 12);
    d = rng.nonzero(-12, 12);
    input = lin(a, b, 'input') + ' ' + op + ' ' + lin(c, d, 'input');
    display = lin(a, b, 'display') + ' ' + showOp + ' ' + lin(c, d, 'display');
  }
  const t = F(d - b, a - c);
  return {
    topic: 'inequality',
    level,
    prompt: 'Solve the inequality. Write the solution as an inequality in x.',
    lines: [display],
    input,
    expect: { kind: 'ineq', op: a - c > 0 ? op : FLIP[op], value: t },
  };
}

// ---------- derivatives ----------
/** Derivative of a polynomial, as coefficients. */
const dPoly = (co) => co.slice(1).map((c, i) => c * (i + 1));

function derivative(rng, level) {
  const mk = (fIn, fDisp, dIn) => ({ topic: 'derivative', level, prompt: 'Find the derivative f′(x).', lines: ['f(x) = ' + fDisp], input: 'derivative(' + fIn + ', x)', expect: { kind: 'expr', expr: dIn } });
  const P = (deg, lo, hi) => {
    const co = [];
    for (let k = 0; k <= deg; k++) co.push(k === deg ? rng.nonzero(lo, hi) : rng.int(lo, hi));
    return co;
  };
  if (level === 1) {
    const co = P(rng.int(2, 3), -9, 9);
    return mk(poly(co, 'input'), poly(co, 'display'), poly(dPoly(co), 'input'));
  }
  if (level === 2) {
    const kind = rng.int(1, 4);
    const k = rng.int(2, 5);
    const c = rng.nonzero(-6, 6);
    const cs = c === 1 ? '' : c === -1 ? '-' : String(c);
    const csd = c === 1 ? '' : c === -1 ? M : signed(c);
    if (kind === 1) return mk(`${c}*sin(${k}*x)`, `${csd}sin(${k}x)`, `${c * k}*cos(${k}*x)`);
    if (kind === 2) return mk(`${c}*e^(${k}*x)`, `${csd}e^(${k}x)`, `${c * k}*e^(${k}*x)`);
    if (kind === 3) {
      const co = P(2, -6, 6);
      return mk(`${poly(co, 'input')} + ${c}*cos(x)`, `${poly(co, 'display')} ${c < 0 ? M : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}cos(x)`, `${poly(dPoly(co), 'input')} + ${-c}*sin(x)`);
    }
    const co = P(2, -6, 6);
    return mk(`${c}*ln(x) + ${poly(co, 'input')}`, `${csd}ln(x) + ${poly(co, 'display')}`, `${c}/x + ${poly(dPoly(co), 'input')}`);
  }
  // level 3: chain and product rules
  const kind = rng.int(1, 3);
  if (kind === 1) {
    const n = rng.int(2, 5);
    const a = rng.nonzero(-4, 4);
    const b = rng.nonzero(-6, 6);
    return mk(`(${lin(a, b, 'input')})^${n}`, `(${lin(a, b, 'display')})${sup(n)}`, `${n * a}*(${lin(a, b, 'input')})^${n - 1}`);
  }
  if (kind === 2) {
    const n = rng.int(1, 3);
    const xn = n === 1 ? 'x' : `x^${n}`;
    const dxn = n === 1 ? '1' : n === 2 ? '2*x' : `${n}*x^${n - 1}`;
    return mk(`${xn}*e^x`, `x${n === 1 ? '' : sup(n)}e^x`, `(${dxn} + ${xn})*e^x`);
  }
  const n = rng.int(1, 3);
  const xn = n === 1 ? 'x' : `x^${n}`;
  const dxn = n === 1 ? '1' : n === 2 ? '2*x' : `${n}*x^${n - 1}`;
  return mk(`${xn}*sin(x)`, `x${n === 1 ? '' : sup(n)}sin(x)`, `${dxn}*sin(x) + ${xn}*cos(x)`);
}

// ---------- definite integrals of polynomials ----------
function integral(rng, level) {
  const deg = level === 1 ? 2 : 3;
  const co = [];
  for (let k = 0; k <= deg; k++) co.push(k === deg ? rng.nonzero(-6, 6) : rng.int(-6, 6));
  let lo, hi;
  if (level === 1) { lo = 0; hi = rng.int(1, 4); }
  else if (level === 2) { lo = rng.int(-2, 1); hi = lo + rng.int(1, 4); }
  else { lo = rng.int(-4, 2); hi = lo + rng.int(2, 6); }
  let value = F(0);
  co.forEach((c, k) => {
    const hiPow = F(hi ** (k + 1));
    const loPow = F(lo ** (k + 1));
    value = value.add(F(c).mul(hiPow.sub(loPow)).div(F(k + 1)));
  });
  return {
    topic: 'integral',
    level,
    prompt: 'Evaluate the definite integral. Give an exact answer (a fraction if it is not a whole number).',
    lines: ['∫ from ' + signed(lo) + ' to ' + signed(hi) + ' of (' + poly(co, 'display') + ') dx'],
    input: 'integrate(' + poly(co, 'input') + ', x, ' + lo + ', ' + hi + ')',
    expect: { kind: 'value', value },
  };
}

// ---------- fractions ----------
function fractions(rng, level) {
  const frac = () => {
    const d = rng.int(2, level === 1 ? 9 : 12);
    return F(rng.int(1, d * (level === 1 ? 1 : 2) - 1), d);
  };
  const show = (f) => (f.d === 1 ? String(f.n) : f.n + '/' + f.d);
  const a = frac(), b = frac(), c = frac();
  let input, display, value;
  if (level === 1) {
    const plus = rng.chance(0.5);
    input = `${show(a)} ${plus ? '+' : '-'} ${show(b)}`;
    display = `${show(a)} ${plus ? '+' : M} ${show(b)}`;
    value = plus ? a.add(b) : a.sub(b);
  } else if (level === 2) {
    const o1 = rng.chance(0.5), o2 = rng.chance(0.5);
    input = `${show(a)} ${o1 ? '+' : '-'} ${show(b)} ${o2 ? '+' : '-'} ${show(c)}`;
    display = `${show(a)} ${o1 ? '+' : M} ${show(b)} ${o2 ? '+' : M} ${show(c)}`;
    value = o1 ? a.add(b) : a.sub(b);
    value = o2 ? value.add(c) : value.sub(c);
  } else {
    const times = rng.chance(0.5);
    input = `(${show(a)} + ${show(b)}) ${times ? '*' : '/'} (${show(c)})`;
    display = `(${show(a)} + ${show(b)}) ${times ? '×' : '÷'} (${show(c)})`;
    value = times ? a.add(b).mul(c) : a.add(b).div(c);
  }
  return { topic: 'fractions', level, prompt: 'Work out the value. Give the answer as a fraction in lowest terms.', lines: [display], input, expect: { kind: 'value', value } };
}

// ---------- determinants ----------
function det(m) {
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return m[0].reduce((s, v, j) => {
    const minor = m.slice(1).map((r) => r.filter((_, k) => k !== j));
    return s + (j % 2 ? -1 : 1) * v * det(minor);
  }, 0);
}
function determinant(rng, level) {
  const n = level === 1 ? 2 : 3;
  const lo = level === 3 ? -6 : level === 2 ? -3 : -5;
  const hi = level === 3 ? 9 : level === 2 ? 6 : 9;
  const m = Array.from({ length: n }, () => Array.from({ length: n }, () => rng.int(lo, hi)));
  return {
    topic: 'determinant',
    level,
    prompt: 'Find the determinant of the matrix.',
    lines: m.map((r) => '| ' + r.map((v) => String(v).padStart(3)).join(' ') + ' |'),
    matrix: m,
    input: 'det([' + m.map((r) => '[' + r.join(', ') + ']').join(', ') + '])',
    expect: { kind: 'value', value: F(det(m)) },
  };
}

const TOPICS = {
  linear: { title: 'Linear equations', make: linear },
  quadratic: { title: 'Quadratic equations', make: quadratic },
  system: { title: 'Systems of two equations', make: system },
  inequality: { title: 'Linear inequalities', make: inequality },
  derivative: { title: 'Derivatives', make: derivative },
  integral: { title: 'Definite integrals', make: integral },
  fractions: { title: 'Fractions', make: fractions },
  determinant: { title: 'Determinants', make: determinant },
};

module.exports = { TOPICS };
