#!/usr/bin/env node
// Checks a student's working, line by line.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const fs = require('node:fs');
const { loadEngine } = require('../lib/engine.js');
const { checkWorking, formatReport } = require('../lib/working.js');
const { solveAmbiguous, formatAmbiguousReport } = require('../lib/ambiguity.js');

const USAGE = `Check a student's working (Photo Equation Solver teacher kit)
Usage:
  node bin/check-working.js working.txt [--ocr-tolerant] [--json]
  node bin/check-working.js - < working.txt [--ocr-tolerant]
  node bin/check-working.js --problem "2(x+3) = 14" --step "2x + 6 = 14" --step "2x = 20" --step "x = 10"
  node bin/check-working.js --ambiguous "x + 1/2 = 3" [--json]
  node bin/check-working.js --ambiguous "2x + [5|S] = 14" [--json]
The file holds the problem on its first line and then one step per line. Lines may start with "Step 2:", "2." or "=>".
A line starting with "=" continues an expression chain:   3x + 2x   then   = 5x .
Equations and inequalities in one unknown: a step is right when it has the same solutions as the line above it.
Expressions: a step is right when it equals the line above it.
--ocr-tolerant checks whether a seemingly wrong/unreadable handwritten step is explained by a single visual OCR slip (e.g. l->1, O->0, S->5, fraction grouping) without excusing genuine algebraic sign/arithmetic errors.
--ambiguous branches across plausible OCR/grouping readings (or explicit [a|b] VLM uncertainty brackets) and flags any answer disagreement.
Exit code 0: every step valid (or consensus). 1: a wrong step was found (or ambiguous branches disagree). 3: no wrong step, but some line could not be compared. 2: usage.`;

(async () => {
  const args = process.argv.slice(2);
  let json = false;
  let ocrTolerant = false;
  let ambiguousExpr = '';
  let problem = '';
  const steps = [];
  let file = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') json = true;
    else if (a === '--ocr-tolerant') ocrTolerant = true;
    else if (a === '--ambiguous') ambiguousExpr = args[++i] || '';
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
  if (ambiguousExpr) {
    const r = await solveAmbiguous(loadEngine(), ambiguousExpr);
    console.log(json ? JSON.stringify(r, null, 2) : formatAmbiguousReport(r));
    process.exitCode = !r.ok ? 2 : r.consensus ? 0 : 1;
    return;
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
  const r = await checkWorking(loadEngine(), text, { ocrTolerant });
  console.log(json ? JSON.stringify(r, null, 2) : formatReport(r));
  process.exitCode = r.firstWrong ? 1 : r.firstUnknown ? 3 : 0;
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 2;
});
