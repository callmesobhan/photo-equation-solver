#!/usr/bin/env node
// Command line use of the solver, for agents that run shell commands.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const fs = require('node:fs');
const { solveText } = require('../lib/mcp.js');
const { parseResult } = require('../lib/result.js');

const USAGE = `Photo Equation Solver (exact, offline maths)
Usage:
  photo-equation-solver "x^2 - 5x + 6 = 0"
  photo-equation-solver --for t "v = u + a*t"        solve a formula for one letter
  photo-equation-solver --png graph.png "plot(x^2, x, -3, 3)"   save a graph (needs the optional @napi-rs/canvas)
  photo-equation-solver --json "det([[1,2],[3,4]])"   machine-readable: {"ok", "readAs", "answer": [...], "working": [...], "check", "notes", "text", ...}
  photo-equation-solver help finance                 syntax help; "help" alone lists the topics
The maths can also be piped in on standard input. Exit code 1 means the solver could not solve it (or, for several numbered problems, could not solve one of them).`;

(async () => {
  const args = process.argv.slice(2);
  let solveFor = '';
  let png = '';
  let json = false;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--for') solveFor = args[++i] || '';
    else if (a === '--png') png = args[++i] || '';
    else if (a === '--json') json = true;
    else if (a === '--help' || a === '-h') {
      console.log(USAGE);
      return;
    } else rest.push(a);
  }
  let equation = rest.join(' ').trim();
  if (!equation && !process.stdin.isTTY) equation = fs.readFileSync(0, 'utf8').trim();
  if (!equation) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  const r = await solveText(equation, solveFor);
  if (png && r.image) fs.writeFileSync(png, Buffer.from(r.image, 'base64'));
  const f = parseResult(r.text, r.ok, equation);
  if (json) {
    // the fields of the library's result (see lib/api.d.ts); "picture" is the file name, true, or false (the library returns the PNG itself)
    delete f.picture;
    console.log(JSON.stringify({ ...f, picture: r.image ? (png || true) : false }));
  } else console.log(r.text);
  if (png && !r.image && r.ok) console.error('(no picture was returned for this input)');
  if (!f.ok) process.exitCode = 1; // also when one of several numbered problems failed
})();
