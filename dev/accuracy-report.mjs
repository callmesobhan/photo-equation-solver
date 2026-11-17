// Writes docs/ACCURACY.md from a full run of the test suite. Nothing in the report is typed by hand except the
// descriptions of what each test compares against; every number comes from the suite's own output.
//
// Usage:
//   node dev/accuracy-report.mjs                      runs dev/run-all.sh (about 8 minutes) and writes the report
//   node dev/accuracy-report.mjs --log run.log        reads the output of an earlier run (add --started / --finished ISO times)
//   --out FILE                                        default docs/ACCURACY.md
// Environment: PY=/path/to/python (the Python with the oracle packages), as for run-all.sh.
// The report is refused when the run did not end with "ALL GOOD": it must describe a passing run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const outFile = path.resolve(opt('--out') || path.join(root, 'docs', 'ACCURACY.md'));

// ---------- the run ----------
let logText;
let started = opt('--started');
let finished = opt('--finished');
const logArg = opt('--log');
if (logArg) {
  logText = fs.readFileSync(logArg, 'utf8');
  const st = fs.statSync(logArg);
  finished = finished || st.mtime.toISOString();
} else {
  const tmpLog = path.join(os.tmpdir(), 'pes-accuracy-' + process.pid + '.log');
  started = new Date().toISOString();
  console.error('running dev/run-all.sh (about 8 minutes) ...');
  const fd = fs.openSync(tmpLog, 'w');
  const r = spawnSync('bash', [path.join(here, 'run-all.sh')], { stdio: ['ignore', fd, fd], env: process.env });
  fs.closeSync(fd);
  finished = new Date().toISOString();
  logText = fs.readFileSync(tmpLog, 'utf8');
  fs.rmSync(tmpLog, { force: true });
  if (r.status !== 0) { console.error('the suite failed (exit ' + r.status + '); no report written. Last lines:\n' + logText.split('\n').slice(-15).join('\n')); process.exit(1); }
}
if (!/\nALL GOOD\s*$/.test(logText)) { console.error('the log does not end with "ALL GOOD": no report written'); process.exit(1); }

// ---------- parse ----------
const sections = [];
let cur = null;
for (const line of logText.split('\n')) {
  const m = /^== (\d+[a-z]*(?:-\d+)?)\. (.*)$/.exec(line);
  if (m) { cur = { id: m[1], title: m[2], lines: [] }; sections.push(cur); continue; }
  if (/^== build/.test(line)) { cur = null; continue; }
  if (cur) cur.lines.push(line);
}
const skipped = sections.filter((s) => /\bskipped\b/.test(s.title));

/** Reads the summary lines of one section: how many things were compared, and whether anything failed. */
function tally(s) {
  s = { ...s, ticksOnly: TICKS.has(s.id) };
  let total = 0;
  let declined = 0;
  let failed = false;
  let ticks = 0;
  for (const raw of s.lines) {
    const l = raw.trim();
    if (!l || /^(?:==|ALL |wrote |network requests|page errors|file is pure|payload )/.test(l)) continue;
    if (/✗|\bFAIL\b/.test(l)) failed = true;
    if (/^✓/.test(l)) ticks++;
    let m;
    if ((m = /^(\d+)\/(\d+)\b/.exec(l))) { total += Number(m[2]); if (m[1] !== m[2]) failed = true; }
    else if ((m = /^solved (\d+)\/(\d+)/.exec(l))) { total += Number(m[2]); if (m[1] !== m[2]) failed = true; }
    else if ((m = /^(\d+) of (\d+) /.exec(l))) { total += Number(m[2]); if (m[1] !== m[2]) failed = true; }
    else if ((m = /^(\d+) passed, (\d+) failed, (\d+) total/.exec(l))) { total += Number(m[3]); if (m[2] !== '0') failed = true; }
    else if ((m = /^✓ (\d+) /.exec(l))) total += Number(m[1]);
    else if (!s.ticksOnly && (m = /^✓ [^:]+: (\d+)\b/.exec(l))) total += Number(m[1]);
    else if ((m = /^(\d+)\b/.exec(l))) total += Number(m[1]);
    else continue;
    const bad = /\b([1-9]\d*) (?:WRONG|bad|differ|failed)\b/.exec(l);
    if (bad) failed = true;
    for (const d of l.matchAll(/(\d+) (?:politely (?:declined|undecided|rejected)|not checkable)/g)) declined += Number(d[1]);
  }
  return { total: s.ticksOnly ? ticks : total || ticks, declined, failed, ticks };
}

// what each section compares against: the text after " vs " in its title, or these descriptions
// sections whose summary lines carry sizes and file counts, not numbers of checks: count one check per ✓ line
const TICKS = new Set(['12', '14', '14b', '14c', '14d', '13']);
const GROUPS = { oracle: 'Compared with independent software or exact arithmetic', self: 'Checked against itself, by construction, or by numerical scans', product: 'The packages and interfaces' };
const META = {
  '1': { group: 'self', area: 'Hand-written cases', against: 'answers written by hand beforehand' },
  '2': { group: 'self', area: 'Documentation', against: "the skill's own examples, and the built-in help for every command" },
  '3': { group: 'oracle', area: 'Property tests (arithmetic, polynomials with known roots, linear systems, quadratics, trig equations)', against: 'exact rational arithmetic (Fraction), numpy' },
  '4': { group: 'self', area: 'Fuzz: random garbage input', against: 'no oracle: it must never crash, hang or print garbage', noDecline: true },
  '5': { group: 'self', area: 'Fuzz: every command with random arguments', against: 'no oracle: it must never crash, hang or print garbage', noDecline: true },
  '8f': { group: 'self', area: 'Differential equations', against: 'substituting every answer back into its equation' },
  '8t': { group: 'self', area: 'Plain-English phrasings', against: 'the command each phrase stands for (must give exactly the same answer)' },
  '8ze': { group: 'self', area: 'Worksheet noise (labels, bullets, trailing instructions)', against: 'the clean answer of the same case (must not change)' },
  '8h': { group: 'self', area: 'Random limits, Taylor polynomials, definite integrals and sums', against: 'numerical evaluation' },
  '8i': { group: 'self', area: 'Random equations and inequalities', against: 'a numerical scan of the original equation' },
  '8g': { group: 'self', area: 'Random rational functions (partial fractions, integrals, inverse Laplace)', against: 'numerical evaluation at random points' },
  '8r': { group: 'self', area: 'Series convergence and radius of convergence', against: 'known theory for the standard families' },
  '8zb': { group: 'self', area: 'Exact surds and trigonometry', against: 'exact values, and equivalence at random points' },
  '11': { group: 'product', area: 'The Google AI Edge Gallery page', against: 'real Chromium, offline, called the way the app calls it (graphs and answer cards included)' },
  '8zg': { group: 'product', area: 'Photo kit (typed form of ten handwritten test items)', against: 'the expected answers' },
  '8zh': { group: 'product', area: 'MCP server', against: 'a real stdio session, and the Gallery page (every hand-written case must give the same text)' },
  '8zi': { group: 'product', area: 'Package documentation', against: 'every command line in the package documents must run' },
  '8zj': { group: 'product', area: 'Embedding library', against: 'every hand-written case must split into fields and print back to the same text; TypeScript declarations compiled' },
  '8zk': { group: 'product', area: 'Teacher kit', against: 'a second method (substitution, finite differences, quadrature) and a mutation test of the working checker' },
  '12': { group: 'product', area: 'Gallery skill folder and zip', against: 'the structure the app needs' },
  '14': { group: 'product', area: 'Local and Agent skill packages', against: 'structure, size, security-scan hygiene and smoke tests of the assembled copies' },
  '14b': { group: 'product', area: 'Text-only marketplace package', against: 'structure, scan hygiene, and a simulated buyer install' },
  '14c': { group: 'product', area: 'Claude Code bundle', against: 'the installer run in a scratch home (install, reinstall, refuse a foreign folder, uninstall)' },
  '14d': { group: 'product', area: 'Teacher kit package', against: 'the unzipped copy run from its own folder' },
  '13': { group: 'product', area: 'Licence copies', against: 'the LICENSE at the root (must be identical)' },
};
function describe(s) {
  if (META[s.id]) return META[s.id];
  const m = /^(.*?) (?:vs|against) (.*)$/.exec(s.title);
  const area = m ? m[1] : s.title;
  const against = m ? m[2] : 'see the test';
  return { group: 'oracle', area: area.charAt(0).toUpperCase() + area.slice(1), against: against.replace(/ \(.*$/, '') };
}

const rows = sections.map((s) => ({ s, d: describe(s), t: tally(s) }));
const bad = rows.filter((r) => r.t.failed);
if (bad.length) { console.error('failures found in sections: ' + bad.map((r) => r.s.id).join(', ') + '; no report written'); process.exit(1); }

// ---------- metadata ----------
const sh = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: 'utf8', cwd: root }); return r.status === 0 ? r.stdout.trim() : ''; };
const commit = sh('git', ['rev-parse', '--short', 'HEAD']);
const dirty = sh('git', ['status', '--porcelain']).split('\n').filter((l) => l && !/docs\/ACCURACY\.md$/.test(l)).length > 0;
const PY = process.env.PY || 'python3';
const pyv = spawnSync(PY, ['-c', "import numpy, sympy, scipy, mpmath, pint, periodictable, numpy_financial, networkx; print(' '.join(f'{n} {m.__version__}' for n, m in [('numpy', numpy), ('sympy', sympy), ('scipy', scipy), ('mpmath', mpmath), ('pint', pint), ('periodictable', periodictable), ('numpy-financial', numpy_financial), ('networkx', networkx)]))"], { encoding: 'utf8' });
const oracleList = pyv.status === 0 ? pyv.stdout.trim().split(/\s+(?=[a-z-]+ \d)/).join(', ') : 'not recorded';
const fmt = (n) => n.toLocaleString('en-US');
const cell = (t) => String(t).replace(/\|/g, '\\|');
const minutes = started && finished ? Math.max(1, Math.round((new Date(finished) - new Date(started)) / 60000)) : null;
const day = (finished || new Date().toISOString()).slice(0, 10);

// ---------- write ----------
const fuzzTotal = rows.filter((r) => r.d.noDecline).reduce((n, r) => n + r.t.total, 0);
const checkTotal = rows.filter((r) => !r.d.noDecline).reduce((n, r) => n + r.t.total, 0);
const grand = checkTotal + fuzzTotal;
const oracleTotal = rows.filter((r) => r.d.group === 'oracle').reduce((n, r) => n + r.t.total, 0);
const md = [];
md.push('# Accuracy report');
md.push('');
md.push('This page is **generated** by `node dev/accuracy-report.mjs` from a full run of the test suite (`dev/run-all.sh`). The counts below are the suite\'s own output; nothing is typed in by hand except the one-line description of what each test compares against.');
md.push('');
md.push('| | |');
md.push('|---|---|');
md.push('| Run | ' + day + (minutes ? ', about ' + minutes + ' minutes' : '') + ' |');
md.push('| Commit | `' + (commit || 'unknown') + '`' + (dirty ? ' **plus uncommitted changes**' : '') + ' |');
md.push('| Result | every test passed (`ALL GOOD`) |');
md.push('| Node.js | ' + process.version + ' |');
md.push('| Python oracles | ' + oracleList + ' |');
if (skipped.length) md.push('| **Skipped** | ' + skipped.map((s) => s.id).join(', ') + ' (a required package was missing: this report is incomplete) |');
md.push('');
md.push('## In short');
md.push('');
md.push('The suite recorded **' + fmt(checkTotal) + ' checks** across ' + rows.length + ' areas, plus ' + fmt(fuzzTotal) + ' random inputs in the fuzz tests (which must never crash, hang or print garbage), and none failed. **' + fmt(oracleTotal) + '** of the checks compare the solver\'s answer with an independent implementation (sympy, scipy, numpy, mpmath, pint, periodictable, numpy-financial, networkx, exact rational arithmetic or brute force). Most batteries run twice with different random seeds, and the totals count both runs.');
md.push('');
md.push('A "check" is one answer compared with its oracle, or one test condition. Different batteries count differently (an expression, an equation, a phrase, a command call), so the numbers are comparable within a row, not between rows.');
md.push('');
for (const g of ['oracle', 'self', 'product']) {
  const rs = rows.filter((r) => r.d.group === g);
  if (!rs.length) continue;
  md.push('## ' + GROUPS[g]);
  md.push('');
  md.push('| Area | Compared with | Checks | Failed | Declined or undecided |');
  md.push('|---|---|---:|---:|---:|');
  for (const r of rs) md.push('| ' + cell(r.d.area) + ' | ' + cell(r.d.against) + ' | ' + fmt(r.t.total) + ' | 0 | ' + (r.d.noDecline || !r.t.declined ? '–' : fmt(r.t.declined)) + ' |');
  md.push('');
}
md.push('"Declined or undecided" counts inputs where the solver (or the checker) gave no verdict rather than guess: a refusal is not counted as an error, and it is not counted as agreement either. Random garbage input in the fuzz tests is expected to be refused, so those rows show a dash.');
md.push('');
md.push('## What this does not show');
md.push('');
md.push('- **It is not a proof.** Random testing samples the space of inputs; it does not cover it. Two programs that agree on thousands of inputs can still both be wrong on one the tests did not reach.');
md.push('- **The oracles are other people\'s software.** sympy, scipy and the rest have bugs too. Agreement between two independent implementations is strong evidence, not certainty. Where there is no second implementation, the table says what the answer was checked against (substitution, a numerical scan, known theory).');
md.push('- **Reading a photograph is not tested here.** A model reads the picture and writes the maths as text; the solver then echoes how it understood that text ("Read as:") so a misreading is easy to see. How well a model reads your handwriting is a property of the model and the picture. The repository has been tried on an iPhone with Gemma 4 E4B in Google AI Edge Gallery, with typed problems and simulated handwriting; see the Status section of the [README](../README.md).');
md.push('- **Agents and hosts.** The Local and Agent packages and the MCP server are covered by automated tests (a real stdio session, every documented command line). They have not been run inside every agent product or with every local model.');
md.push('- **Decimals are approximate.** Exact answers (fractions, radicals, symbolic forms) are exact. Decimal values are printed to about 8 significant digits, and the numerical batteries compare within a stated tolerance.');
md.push('- **Counts are per commit.** This report describes the commit named above. Run the suite again after any change.');
md.push('');
md.push('## Reproduce it');
md.push('');
md.push('```');
md.push('pip install -r dev/tests/requirements.txt      # the Python oracles (optional: those batteries are skipped without them)');
md.push('cd dev && ./run-all.sh                          # builds, then runs every test (about 8 minutes)');
md.push('node dev/accuracy-report.mjs                    # runs the suite and writes this page (refuses if anything failed)');
md.push('```');
md.push('');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, md.join('\n'));
console.log('wrote ' + path.relative(root, outFile) + ': ' + fmt(checkTotal) + ' checks + ' + fmt(fuzzTotal) + ' fuzz inputs, ' + rows.length + ' areas' + (skipped.length ? ', ' + skipped.length + ' skipped' : ''));
