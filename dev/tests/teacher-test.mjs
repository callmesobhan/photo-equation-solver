// The teacher kit (teacher-kit/): worksheet generator, answer key and student-working checker.
//  1. generators: every problem the generators can make (every topic and level, many seeds) is solved by the solver and agrees
//     with the answer the generator worked out for itself; and a second, separate check made here: roots substituted back into
//     the equation, derivatives against a finite difference, integrals against numerical quadrature;
//  2. worksheets: built from a seed (same seed, same sheet), unique problems, no candidate dropped, HTML / Markdown / JSON,
//     HTML-escaping, and the answer key contains every answer;
//  3. working checker: a table of student work with the verdict it must give, and a mutation test: correct chains of steps are
//     never called wrong (no false accusations) and a corrupted step is found at exactly that step;
//  4. the command line tools: options, files written, exit codes.
// Usage: node teacher-test.mjs
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, compileRelation } from './mathexpr.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.join(here, '..', '..', 'teacher-kit');
const require = createRequire(import.meta.url);
const api = require(path.join(here, '..', '..', 'mcp-server', 'lib', 'api.js'));
const { TOPICS } = require(path.join(kit, 'lib', 'generators.js'));
const { makeRng } = require(path.join(kit, 'lib', 'rng.js'));
const { verify } = require(path.join(kit, 'lib', 'verify.js'));
const { buildWorksheet, renderHtml, renderMarkdown, renderJson } = require(path.join(kit, 'lib', 'worksheet.js'));
const { checkWorking, parseLines } = require(path.join(kit, 'lib', 'working.js'));
const { F } = require(path.join(kit, 'lib', 'frac.js'));

let bad = 0;
const check = (ok, name, detail = '') => {
  if (!ok) { bad++; console.log('✗ ' + name + (detail ? '  ' + detail : '')); }
};
const num = (f) => Number(f.n) / Number(f.d);

// ---------- 1. generators ----------
const SEEDS = 25;
let made = 0;
const perTopic = {};
for (const [topic, t] of Object.entries(TOPICS)) {
  for (const level of [1, 2, 3]) {
    const rng = makeRng(1000 * level + topic.length);
    for (let i = 0; i < SEEDS; i++) {
      const p = t.make(rng, level);
      const r = await api.solve(p.input);
      const v = await verify(api, p, r);
      made++;
      perTopic[topic] = (perTopic[topic] || 0) + 1;
      check(v.ok, 'generator and solver agree: ' + p.input, v.reason);
      check(p.topic === topic && p.level === level && p.prompt && (p.lines.length || p.matrix), 'problem has topic, level, prompt and lines: ' + p.input);
      // a second check, separate from the one the product makes
      const e = p.expect;
      try {
        if (e.kind === 'roots') {
          const f = compileRelation(p.input);
          e.values.forEach((root) => check(Math.abs(f({ x: num(root) })) < 1e-9, 'root satisfies the equation: ' + p.input + ' at x = ' + root));
        } else if (e.kind === 'point') {
          p.input.split(';').forEach((eq) => check(Math.abs(compileRelation(eq)({ x: num(e.x), y: num(e.y) })) < 1e-9, 'point satisfies ' + eq));
        } else if (e.kind === 'ineq') {
          // one side of the boundary satisfies the inequality, the other does not
          const [lhs, rel, rhsText] = /^(.*?)\s*(<=|>=|<|>)\s*(.*)$/.exec(p.input).slice(1);
          const g = (x) => compile(lhs)({ x }) - compile(rhsText)({ x });
          const holds = (x) => (rel.startsWith('<') ? g(x) < 0 : g(x) > 0);
          const t0 = num(e.value);
          const wantRight = e.op.startsWith('>');
          check(holds(wantRight ? t0 + 1 : t0 - 1) && !holds(wantRight ? t0 - 1 : t0 + 1), 'inequality holds on the side the key says: ' + p.input);
        } else if (e.kind === 'expr') {
          const F = compile(/^derivative\((.*), x\)$/.exec(p.input)[1]);
          const G = compile(r.answer[0].replace(/\s*\(≈[^)]*\)$/, ''));
          for (const x of [0.37, 1.21, 2.05]) {
            const h = 1e-5;
            const fd = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
            check(Math.abs(G({ x }) - fd) < 1e-4 * Math.max(1, Math.abs(fd)), 'derivative matches a finite difference: ' + p.input + ' at x = ' + x, 'answer ' + r.answer[0] + ': ' + G({ x }) + ' vs ' + fd);
          }
        } else if (e.kind === 'value' && topic === 'integral') {
          const m = /^integrate\((.*), x, (-?\d+), (-?\d+)\)$/.exec(p.input);
          const F = compile(m[1]);
          const a = Number(m[2]);
          const b = Number(m[3]);
          const n = 2000; // Simpson
          let s = F({ x: a }) + F({ x: b });
          for (let k = 1; k < n; k++) s += F({ x: a + (k * (b - a)) / n }) * (k % 2 ? 4 : 2);
          const q = (s * (b - a)) / (3 * n);
          check(Math.abs(q - num(e.value)) < 1e-6 * Math.max(1, Math.abs(q)), 'integral matches quadrature: ' + p.input, q + ' vs ' + e.value);
        }
      } catch (err) {
        check(false, 'second check could not run: ' + p.input, err.message);
      }
    }
  }
}
console.log((bad ? '' : '✓ ') + 'generators: ' + made + ' problems (' + Object.entries(perTopic).map(([k, v]) => k + ' ' + v).join(', ') + ') agree with the solver and with a second, separate check');

// ---------- 2. worksheets ----------
const all = Object.keys(TOPICS);
const ws1 = await buildWorksheet(api, { topics: all, count: 24, level: 2, seed: 42, title: 'Test <b>sheet</b> & "quotes"' });
const ws1b = await buildWorksheet(api, { topics: all, count: 24, level: 2, seed: 42, title: 'Test <b>sheet</b> & "quotes"' });
const ws2 = await buildWorksheet(api, { topics: all, count: 24, level: 2, seed: 43 });
check(renderJson(ws1) === renderJson(ws1b), 'the same seed makes the same worksheet');
check(renderJson(ws1) !== renderJson(ws2), 'a different seed makes a different worksheet');
check(ws1.problems.length === 24 && new Set(ws1.problems.map((p) => p.input)).size === 24, 'problems are unique');
check(ws1.dropped === 0 && ws2.dropped === 0, 'no candidate problem was dropped (generator and solver always agree)', 'dropped ' + ws1.dropped + ', ' + ws2.dropped);
check(all.every((t) => ws1.problems.some((p) => p.topic === t)), 'every topic appears when all are asked for');
check(ws1.problems.every((p) => p.answer.length > 0 && p.input && p.lines.length), 'every problem has an answer');
const html = renderHtml(ws1, { key: true, working: true });
check(!/<b>sheet<\/b>/.test(html) && /&lt;b&gt;sheet&lt;\/b&gt; &amp; &quot;quotes&quot;/.test(html), 'HTML: the title is escaped');
check((html.match(/<li>/g) || []).length >= 48, 'HTML: every problem is on the sheet and in the key');
check(ws1.problems.every((p) => p.answer.every((a) => html.includes(a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\^\(([^()]*)\)/g, '<sup>$1</sup>').replace(/\^(-?[0-9A-Za-z]+)/g, '<sup>$1</sup>')))), 'HTML: the key contains every answer');
check(!/Answer key/.test(renderHtml(ws1, { key: false })), 'HTML: --no-key leaves the key out');
check(/Answer key/.test(renderMarkdown(ws1)) && !/Answer key/.test(renderMarkdown(ws1, { key: false })), 'Markdown: key on and off');
check(JSON.parse(renderJson(ws1)).problems.length === 24, 'JSON parses');
for (const level of [1, 3]) {
  const w = await buildWorksheet(api, { topics: all, count: 16, level, seed: 5 });
  check(w.problems.length === 16 && w.dropped === 0, 'level ' + level + ' builds with nothing dropped');
}
let threw = '';
try { await buildWorksheet(api, { topics: ['nonsense'] }); } catch (e) { threw = e.message; }
check(/Unknown topic/.test(threw), 'an unknown topic is refused');
console.log((bad ? '' : '✓ ') + 'worksheets: seeded, unique, nothing dropped, HTML (escaped) / Markdown / JSON, key complete');

// ---------- 3. working checker ----------
const T = [
  // [name, text, statuses, firstWrong, firstExtra, finished, finalMatches]
  ['wrong constant', '2(x + 3) = 14\n2x + 6 = 14\n2x = 20\nx = 10', ['start', 'ok', 'wrong', 'ok'], 3, null, true, false],
  ['all correct', 'Solve: 2(x + 3) = 14\n2x + 6 = 14\n2x = 8\nx = 4', ['start', 'ok', 'ok', 'ok'], null, null, true, true],
  ['sign error moving a term', '3x + 5 = 2x - 7\n3x - 2x = -7 + 5\nx = -2', ['start', 'wrong', 'ok'], 2, null, true, false],
  ['correct with fractions', 'x/2 + 1 = 4\nx/2 = 3\nx = 6', ['start', 'ok', 'ok'], null, null, true, true],
  ['wrong fraction step', 'x/2 + 1 = 4\nx/2 = 3\nx = 3/2', ['start', 'ok', 'wrong'], 3, null, true, false],
  ['factoring, both roots', 'x^2 - 5x + 6 = 0\n(x - 2)(x - 3) = 0\nx = 2 or x = 3', ['start', 'ok', 'ok'], null, null, true, true],
  ['factoring, one root lost', 'x^2 - 5x + 6 = 0\n(x - 2)(x - 3) = 0\nx = 2', ['start', 'ok', 'wrong'], 3, null, true, false],
  ['root lost by dividing', 'x^2 = 9\nx = 3', ['start', 'wrong'], 2, null, true, false],
  ['squaring adds a solution', 'sqrt(x) = x - 2\nx = (x - 2)^2\nx^2 - 5x + 4 = 0\nx = 1 or x = 4', ['start', 'extra', 'ok', 'ok'], null, 2, true, false],
  ['two unknowns, correct', '2x + 3y = 6\n3y = 6 - 2x\ny = 2 - 2x/3', ['start', 'ok', 'ok'], null, null, null, true],
  ['two unknowns, wrong', '2x + 3y = 6\n3y = 6 - 2x\ny = 2 - x/3', ['start', 'ok', 'wrong'], 3, null, null, false],
  ['inequality correct', '5x - 2 > 3x + 8\n2x > 10\nx > 5', ['start', 'ok', 'ok'], null, null, true, true],
  ['inequality, sign not flipped', '-2x > 6\nx > -3', ['start', 'wrong'], 2, null, true, false],
  ['expression chain', 'Simplify: 3x + 2x\n= 5x\n= 5x + 0', ['start', 'ok', 'ok'], null, null, null, null],
  ['expression, wrong step', '(x + 1)^2\n= x^2 + 1\n= x^2 + 1 + 0', ['start', 'wrong', 'ok'], 2, null, null, null],
  ['labels and arrows', 'Step 1: 2x + 6 = 14\n2. 2x = 8\n⇒ x = 4', ['start', 'ok', 'ok'], null, null, true, true],
  ['not finished', '2x + 6 = 14\n2x = 8', ['start', 'ok'], null, null, false, true],
  ['unequal sign (not compared)', 'x + 1 = 2\nx ≠ 3', ['start', 'unknown'], null, null, null, null],
  ['equation then expression (not compared)', 'x + 1 = 2\nx', ['start', 'unknown'], null, null, null, null],
];
for (const [name, text, statuses, firstWrong, firstExtra, finished, finalMatches] of T) {
  let r;
  try { r = await checkWorking(api, text); } catch (e) { check(false, 'working: ' + name, e.message); continue; }
  check(JSON.stringify(r.steps.map((s) => s.status)) === JSON.stringify(statuses), 'working "' + name + '": statuses', JSON.stringify(r.steps.map((s) => s.status + ' ' + s.reason)));
  check(r.firstWrong === firstWrong, 'working "' + name + '": first wrong step', String(r.firstWrong));
  check(r.firstExtra === firstExtra, 'working "' + name + '": first extra step', String(r.firstExtra));
  if (finished !== null) check(r.finished === finished, 'working "' + name + '": finished', String(r.finished));
  if (finalMatches !== null) check(r.finalMatches === finalMatches, 'working "' + name + '": final line matches the problem', String(r.finalMatches));
}
check(JSON.stringify(parseLines('1) 2x = 4\nStep 2: x = 2\n\n  \n⇒ x = 2').map((l) => l.text)) === JSON.stringify(['2x = 4', 'x = 2', 'x = 2']), 'labels, arrows and blank lines are stripped');
let tooShort = '';
try { await checkWorking(api, 'x = 1'); } catch (e) { tooShort = e.message; }
check(/at least two lines/.test(tooShort), 'one line is refused');

// mutation test
const fac = (r) => '(x ' + (r < 0 ? '+ ' + -r : '- ' + r) + ')';
const sgn = (n) => (n < 0 ? '(' + n + ')' : String(n));
const rng = makeRng(2026);
let chains = 0;
let falseAccusations = 0;
let found = 0;
let wrongPlace = 0;
for (let i = 0; i < 40; i++) {
  // linear: a x + b = c x + d
  const a = rng.int(2, 9);
  let c = rng.int(-5, 5);
  while (c === a) c = rng.int(-5, 5);
  const b = rng.int(-9, 9);
  const d = rng.int(-9, 9);
  const sol = F(d - b, a - c).toString();
  const chain = (m = {}) => [
    `${a}x + ${sgn(b)} = ${c}x + ${sgn(d)}`,
    `${a}x - ${sgn(c)}x = ${sgn(d)} - ${sgn(b)}` + (m[2] ? ' + 1' : ''),
    `${a - c}x = ${d - b}` + (m[3] ? ' + 1' : ''),
    `x = ${sol}` + (m[4] ? ' + 1' : ''),
  ];
  const good = await checkWorking(api, chain().join('\n'));
  chains++;
  if (good.firstWrong !== null || good.steps.some((s) => s.status === 'unknown')) { falseAccusations++; check(false, 'correct chain was not accepted: ' + chain().join(' | '), JSON.stringify(good.steps.map((s) => s.status + ' ' + s.reason))); }
  for (const k of [2, 3, 4]) {
    const r = await checkWorking(api, chain({ [k]: true }).join('\n'));
    if (r.firstWrong === k) found++;
    else { wrongPlace++; check(false, 'corrupted step ' + k + ' was not found: ' + chain({ [k]: true }).join(' | '), 'firstWrong ' + r.firstWrong); }
  }
  // quadratic: roots r1 != r2
  const r1 = rng.int(-6, 6);
  let r2 = rng.int(-6, 6);
  while (r2 === r1) r2 = rng.int(-6, 6);
  const B = -(r1 + r2);
  const C = r1 * r2;
  const qpoly = `x^2 ${B < 0 ? '- ' + -B : '+ ' + B}x ${C < 0 ? '- ' + -C : '+ ' + C} = 0`;
  const qchain = (m = {}) => [qpoly, `${fac(r1)}${fac(m[2] ? r2 + 1 : r2)} = 0`, `x = ${r1} or x = ${m[3] ? r2 + 1 : r2}`];
  const qg = await checkWorking(api, qchain().join('\n'));
  chains++;
  if (qg.firstWrong !== null || qg.steps.some((s) => s.status === 'unknown')) { falseAccusations++; check(false, 'correct quadratic chain was not accepted: ' + qchain().join(' | '), JSON.stringify(qg.steps.map((s) => s.status + ' ' + s.reason))); }
  for (const k of [2, 3]) {
    const r = await checkWorking(api, qchain({ [k]: true }).join('\n'));
    if (r.firstWrong === k) found++;
    else { wrongPlace++; check(false, 'corrupted quadratic step ' + k + ' was not found: ' + qchain({ [k]: true }).join(' | '), 'firstWrong ' + r.firstWrong); }
  }
}
console.log((bad ? '' : '✓ ') + 'working: ' + T.length + ' hand-written cases; mutation test on ' + chains + ' correct chains (0 false accusations: ' + (falseAccusations === 0) + ') and ' + (found + wrongPlace) + ' corrupted steps (' + found + ' found at exactly the corrupted step)');

// ---------- 4. command line tools ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pes-teacher-'));
const run = (script, args, input) => spawnSync('node', [path.join(kit, 'bin', script), ...args], { encoding: 'utf8', input });
let c = run('worksheet.js', ['--topics', 'linear,system', '--count', '6', '--seed', '9', '--out', path.join(tmp, 'a.html')]);
check(c.status === 0 && fs.existsSync(path.join(tmp, 'a.html')) && /Answer key/.test(fs.readFileSync(path.join(tmp, 'a.html'), 'utf8')), 'cli worksheet: writes an HTML file with a key', c.stderr);
c = run('worksheet.js', ['--topics', 'all', '--count', '8', '--seed', '9', '--variants', '3', '--out', path.join(tmp, 'v.html'), '--no-key']);
check(c.status === 0 && ['A', 'B', 'C'].every((l) => fs.existsSync(path.join(tmp, 'v-' + l + '.html'))), 'cli worksheet: --variants 3 writes three files', c.stderr);
const va = fs.readFileSync(path.join(tmp, 'v-A.html'), 'utf8');
check(va !== fs.readFileSync(path.join(tmp, 'v-B.html'), 'utf8') && !/Answer key/.test(va), 'cli worksheet: variants differ; --no-key leaves out the key');
c = run('worksheet.js', ['--topics', 'derivative', '--count', '3', '--seed', '1', '--format', 'json', '--out', '-']);
check(c.status === 0 && JSON.parse(c.stdout).problems.length === 3, 'cli worksheet: --format json --out - prints JSON', c.stderr);
c = run('worksheet.js', ['--topics', 'fractions', '--count', '3', '--seed', '1', '--out', path.join(tmp, 'm.md'), '--working']);
check(c.status === 0 && /^# /.test(fs.readFileSync(path.join(tmp, 'm.md'), 'utf8')), 'cli worksheet: a .md file name gives Markdown', c.stderr);
check(run('worksheet.js', ['--list']).stdout.split('\n').filter(Boolean).length === all.length, 'cli worksheet: --list shows every topic');
check(run('worksheet.js', ['--level', '9']).status === 2 && run('worksheet.js', ['--nonsense']).status === 2, 'cli worksheet: bad options exit 2');
check(run('worksheet.js', ['--topics', 'nope', '--out', path.join(tmp, 'x.html')]).status === 1, 'cli worksheet: unknown topic exits 1');

const good = '2(x + 3) = 14\n2x + 6 = 14\n2x = 8\nx = 4\n';
const wrong = '2(x + 3) = 14\n2x + 6 = 14\n2x = 20\nx = 10\n';
check(run('check-working.js', ['-'], good).status === 0, 'cli check-working: exit 0 for correct working');
c = run('check-working.js', ['-'], wrong);
check(c.status === 1 && /Step 3 is the first line/.test(c.stdout), 'cli check-working: exit 1 and names the wrong step', c.stdout);
fs.writeFileSync(path.join(tmp, 'w.txt'), wrong);
c = run('check-working.js', ['--json', path.join(tmp, 'w.txt')]);
check(c.status === 1 && JSON.parse(c.stdout).firstWrong === 3, 'cli check-working: --json from a file');
c = run('check-working.js', ['--problem', '2(x+3) = 14', '--step', '2x + 6 = 14', '--step', '2x = 8', '--step', 'x = 4']);
check(c.status === 0, 'cli check-working: --problem and --step');
check(run('check-working.js', ['-'], 'x + 1 = 2\nx ≠ 3\n').status === 3, 'cli check-working: exit 3 when a line cannot be compared');
check(run('check-working.js', []).status === 2 && run('check-working.js', ['-'], 'x = 1\n').status === 2, 'cli check-working: usage and too-short input exit 2');
fs.rmSync(tmp, { recursive: true, force: true });
console.log((bad ? '' : '✓ ') + 'cli: worksheet.js and check-working.js (files, variants, formats, exit codes)');

process.exit(bad ? 1 : 0);
