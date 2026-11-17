// The solver as a library: structured results for programs that embed it.
//
//   const { solve } = require('photo-equation-solver-mcp');
//   const r = await solve('x^2 - 5x + 6 = 0');
//   r.ok, r.readAs, r.answer, r.working, r.check, r.notes, r.needsReview, r.error, r.text, r.picture
//
// Nothing here opens a network connection. The solver computes on the calling thread: a hard problem blocks the
// event loop until it is done, so run it in a worker thread or a child process if your program must stay responsive.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { solveText, hasCanvas } = require('./mcp.js');
const { parseResult } = require('./result.js');
const pkg = require('../package.json');

/**
 * Solves one input: an equation, an expression, a command such as integrate(x^2, x, 0, 3), a short English question,
 * or several problems numbered 1) 2) one per line. Never throws and never rejects: a failure is a result with ok: false.
 * @param {string} input
 * @param {{ solveFor?: string }} [options]
 */
async function solve(input, options) {
  const o = options && typeof options === 'object' ? options : {};
  const text = typeof input === 'string' ? input : '';
  const r = await solveText(text, o.solveFor);
  const parsed = parseResult(r.text, r.ok, text.trim());
  parsed.picture = r.image || null;
  return parsed;
}

/** Solves each input separately, in order. One failing input never stops the others. */
async function solveMany(inputs, options) {
  const out = [];
  for (const input of Array.isArray(inputs) ? inputs : []) out.push(await solve(input, options));
  return out;
}

/** The syntax help for a topic ("finance", "stats", ...), or the list of topics when none is given. */
async function help(topic) {
  const t = typeof topic === 'string' ? topic.trim() : '';
  const r = await solveText(t ? 'help ' + t : 'help');
  return { ok: r.ok, topic: t || null, text: r.text };
}

module.exports = { solve, solveMany, help, parseResult, hasCanvas, version: pkg.version };
