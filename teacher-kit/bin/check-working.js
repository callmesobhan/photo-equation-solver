#!/usr/bin/env node
// Checks a student's working, line by line.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const fs = require('node:fs');
const { loadEngine } = require('../lib/engine.js');
const { checkWorking, formatReport } = require('../lib/working.js');

const USAGE = `Check a student's working (Photo Equation Solver teacher kit)
Usage:
  node bin/check-working.js working.txt
  node bin/check-working.js - < working.txt
  node bin/check-working.js --problem "2(x+3) = 14" --step "2x + 6 = 14" --step "2x = 20" --step "x = 10"
  add --json for machine-readable output
The file holds the problem on its first line and then one step per line. Lines may start with "Step 2:", "2." or "=>".
A line starting with "=" continues an expression chain:   3x + 2x   then   = 5x .
Equations and inequalities in one unknown: a step is right when it has the same solutions as the line above it.
Expressions: a step is right when it equals the line above it.
Exit code 0: every step valid. 1: a wrong step was found. 3: no wrong step, but some line could not be compared. 2: usage.`;

(async () => {
  const args = process.argv.slice(2);
  let json = false;
  let problem = '';
  const steps = [];
  let file = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') json = true;
    else if (a === '--problem') problem = args[++i] || '';
    else if (a === '--step') steps.push(args[++i] || '');
    else if (a === '--help' || a === '-h') {
      console.log(USAGE);
      return;
    } else if (a === '-' || !a.startsWith('--')) file = a;
    else {
      console.error('Unknown option ' + a + '\n\n' + USAGE);
      process.exitCode = 2;
      return;
    }
  }
  let text;
  if (problem) text = [problem, ...steps].join('\n');
  else if (file === '-') text = fs.readFileSync(0, 'utf8');
  else if (file) text = fs.readFileSync(file, 'utf8');
  else {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  const r = await checkWorking(loadEngine(), text);
  console.log(json ? JSON.stringify(r, null, 2) : formatReport(r));
  process.exitCode = r.firstWrong ? 1 : r.firstUnknown ? 3 : 0;
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 2;
});
