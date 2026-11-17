#!/usr/bin/env node
// Makes a worksheet and its answer key.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadEngine } = require('../lib/engine.js');
const { TOPICS } = require('../lib/generators.js');
const { buildWorksheet, renderHtml, renderMarkdown, renderJson } = require('../lib/worksheet.js');

const USAGE = `Worksheet maker (Photo Equation Solver teacher kit)
Usage:
  node bin/worksheet.js --topics linear,quadratic --level 2 --count 10 --seed 7 --out sheet.html
Options:
  --topics a,b,c   ${Object.keys(TOPICS).join(', ')}  (default: linear,quadratic; "all" for every topic)
  --level 1|2|3    difficulty (default 2)
  --count N        number of problems, 1 to 60 (default 10)
  --seed N         the same seed makes the same worksheet again (default: today's date as a number)
  --variants N     N different worksheets from consecutive seeds, files named ...-A, ...-B (default 1)
  --title "text"   heading of the worksheet
  --format html|md|json   (default: from the --out file name, else html). HTML opens in any browser: print it to PDF.
  --out FILE       where to write it (default: worksheet.html). "-" prints to the screen.
  --no-key         leave out the answer key
  --working        add the solver's working steps to the answer key
  --list           show the topics and exit
Every answer comes from the exact solver and is accepted only if it agrees with the answer the generator worked out
itself. If they ever disagree on too many problems, nothing is written.`;

(async () => {
  const args = process.argv.slice(2);
  const o = { topics: 'linear,quadratic', level: 2, count: 10, seed: null, variants: 1, title: '', format: '', out: 'worksheet.html', key: true, working: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const val = () => args[++i];
    if (a === '--topics') o.topics = val();
    else if (a === '--level') o.level = Number(val());
    else if (a === '--count') o.count = Number(val());
    else if (a === '--seed') o.seed = Number(val());
    else if (a === '--variants') o.variants = Number(val());
    else if (a === '--title') o.title = val();
    else if (a === '--format') o.format = val();
    else if (a === '--out') o.out = val();
    else if (a === '--no-key') o.key = false;
    else if (a === '--working') o.working = true;
    else if (a === '--list') {
      Object.entries(TOPICS).forEach(([k, t]) => console.log(k.padEnd(12) + t.title));
      return;
    } else if (a === '--help' || a === '-h') {
      console.log(USAGE);
      return;
    } else {
      console.error('Unknown option ' + a + '\n\n' + USAGE);
      process.exitCode = 2;
      return;
    }
  }
  if (![1, 2, 3].includes(o.level) || !Number.isInteger(o.count) || o.count < 1 || o.count > 60 || !(o.variants >= 1 && o.variants <= 12)) {
    console.error('--level must be 1, 2 or 3; --count 1 to 60; --variants 1 to 12.\n\n' + USAGE);
    process.exitCode = 2;
    return;
  }
  const topics = o.topics === 'all' ? Object.keys(TOPICS) : o.topics.split(',').map((s) => s.trim()).filter(Boolean);
  const baseSeed = Number.isFinite(o.seed) ? o.seed : Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const format = o.format || (/\.md$/i.test(o.out) ? 'md' : /\.json$/i.test(o.out) ? 'json' : 'html');
  const api = loadEngine();
  for (let v = 0; v < o.variants; v++) {
    const ws = await buildWorksheet(api, { topics, count: o.count, level: o.level, seed: baseSeed + v, title: o.title });
    const label = o.variants > 1 ? 'variant ' + String.fromCharCode(65 + v) + ', ' : '';
    const text = format === 'json' ? renderJson(ws) : format === 'md' ? renderMarkdown(ws, { key: o.key, working: o.working }) : renderHtml(ws, { key: o.key, working: o.working, label });
    if (o.out === '-') {
      process.stdout.write(text);
      continue;
    }
    const ext = path.extname(o.out) || '.' + format;
    const file = o.variants > 1 ? o.out.slice(0, o.out.length - path.extname(o.out).length) + '-' + String.fromCharCode(65 + v) + ext : o.out.endsWith(ext) ? o.out : o.out + ext;
    fs.writeFileSync(file, text);
    console.error('wrote ' + file + '  (' + ws.problems.length + ' problems, seed ' + ws.seed + (ws.dropped ? ', ' + ws.dropped + ' candidate problem(s) dropped because the solver and the generator disagreed' : '') + ')');
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
