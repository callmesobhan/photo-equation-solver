// The embedding library (mcp-server/lib/api.js), tested the way a program that embeds it uses it:
//  1. every hand-written case parses into fields with nothing left over, and the fields print back to exactly the text
//     the solver printed (so no information is lost and none is invented);
//  2. the shapes: one problem, several problems with one failing, a refused input, help text, solve_for, bad arguments
//     (it never throws), concurrent calls;
//  3. the command line's --json output carries the same fields as the library;
//  4. the TypeScript declarations compile against a sample program (skipped when no `tsc` is found: set TSC=/path/to/tsc);
//  5. the example program runs and prints what its comments say.
// Usage: node api-test.mjs
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const server = path.join(here, '..', '..', 'mcp-server');
const require = createRequire(import.meta.url);
const api = require(path.join(server, 'lib', 'api.js'));
let bad = 0;
const check = (ok, name, detail = '') => {
  if (!ok) { bad++; console.log('✗ ' + name + (detail ? '  ' + detail : '')); }
};

// ---- the exact inverse of the parser: the solver's own printing rule (renderResult in dev/src/05-solve.js) ----
function block(p) {
  const lines = ['Read as: ' + p.readAs];
  if (p.error !== null) {
    lines.push('Error: ' + p.error);
    return lines.join('\n');
  }
  if (p.answer.length === 1) lines.push('Answer: ' + p.answer[0]);
  else {
    lines.push('Answer:');
    p.answer.forEach((a) => lines.push('  ' + a));
  }
  if (p.working.length) {
    lines.push('Working:');
    p.working.forEach((w) => lines.push('- ' + w));
  }
  if (p.check !== null) lines.push('Check: ' + p.check);
  p.notes.forEach((n) => lines.push('Note: ' + n));
  return lines.join('\n');
}
function print(r) {
  if (r.kind === 'multiple') return r.problems.map((p) => 'Problem ' + p.index + '\n' + block(p)).join('\n\n');
  if (r.kind === 'error' && r.readAs === null) return r.error;
  if (r.kind === 'text') return r.text;
  return block(r);
}

// 1. every hand-written case
let n = 0;
let kinds = { solution: 0, multiple: 0, error: 0, text: 0 };
for (const [input, , opts = {}] of CASES) {
  if (opts.skip) continue;
  const r = await api.solve(input, opts.solve_for ? { solveFor: opts.solve_for } : undefined);
  n++;
  kinds[r.kind]++;
  const label = JSON.stringify(input).slice(0, 70);
  const unparsed = r.kind === 'multiple' ? r.problems.flatMap((p) => p.unparsed) : r.unparsed;
  check(unparsed.length === 0, 'nothing left over: ' + label, JSON.stringify(unparsed).slice(0, 120));
  check(print(r) === r.text, 'prints back to the same text: ' + label, '\n' + print(r).slice(0, 200) + '\n--- vs ---\n' + r.text.slice(0, 200));
  check(r.ok === (r.kind === 'solution' || r.kind === 'text' || (r.kind === 'multiple' && r.problems.every((p) => p.ok))), 'ok matches kind: ' + label);
  if (r.kind === 'solution') check(r.readAs !== null && r.answer.length > 0 && r.error === null, 'a solution has readAs and an answer: ' + label);
  if (r.kind === 'error') check(typeof r.error === 'string' && r.error.length > 0 && r.answer.length === 0, 'an error has a message and no answer: ' + label);
}
console.log((bad ? '' : '✓ ') + 'parse: ' + n + ' cases (' + Object.entries(kinds).map(([k, v]) => v + ' ' + k).join(', ') + ') split into fields with nothing left over and print back to the exact text');

// 2. shapes
const one = await api.solve('2x^2 - 5x + 3 = 0');
check(one.ok && one.kind === 'solution' && one.readAs === '2x² - 5x + 3 = 0', 'one: readAs');
check(JSON.stringify(one.answer) === JSON.stringify(['x = 1', 'x = 3/2 (= 1.5)']), 'one: answer lines', JSON.stringify(one.answer));
check(one.working.length >= 2 && !one.working.some((w) => w.startsWith('- ')), 'one: working steps have no bullet');
check(/equal sides/.test(one.check || ''), 'one: check');
check(one.input === '2x^2 - 5x + 3 = 0' && one.picture === null && one.needsReview === false, 'one: input, picture, needsReview');

const many = await api.solve('1) 2x + 3 = 11\n2) 3x = 9\n3) sqrt(');
check(many.kind === 'multiple' && many.problems.length === 3 && !many.ok, 'several: kind, count, ok false when one fails');
check(many.problems[0].ok && many.problems[0].answer[0] === 'x = 4' && many.problems[0].index === 1, 'several: first problem');
check(!many.problems[2].ok && /ends too early/.test(many.problems[2].error) && many.problems[2].index === 3, 'several: failing problem carries its error');

const refused = await api.solve('foo bar baz');
check(!refused.ok && refused.kind === 'error' && /several unknowns/.test(refused.error) && refused.readAs === null, 'refused: kind and message');

const sf = await api.solve('3x + 2y = 12', { solveFor: 'y' });
check(sf.ok && /y = /.test(sf.answer.join(' ')), 'solveFor: solves for y', JSON.stringify(sf.answer));

const flag = await api.solve('x/x + 1 = 3');
check(flag.ok && flag.needsReview === true && flag.notes.length > 0, 'needsReview: set when the solver doubts the reading', JSON.stringify(flag.notes));

const h = await api.help('finance');
check(h.ok && h.topic === 'finance' && /bond/.test(h.text), 'help: a topic');
const topics = await api.help();
check(topics.ok && topics.topic === null && /help topics/.test(topics.text), 'help: the topic list');
const helpViaSolve = await api.solve('help finance');
check(helpViaSolve.kind === 'text' && helpViaSolve.ok && helpViaSolve.answer.length === 0, 'help text through solve() has kind text');

for (const [label, input] of [['empty', ''], ['spaces', '   '], ['number', 42], ['null', null], ['undefined', undefined], ['object', {}], ['too long', 'x+'.repeat(3000)], ['garbage', '\u0000￿))((']]) {
  let r;
  try { r = await api.solve(input); } catch (e) { r = null; }
  check(r !== null && typeof r.ok === 'boolean' && typeof r.text === 'string' && Array.isArray(r.answer), 'never throws: ' + label);
  if (r && label !== 'garbage') check(r.ok === false && r.kind === 'error', 'bad input is an error result: ' + label);
}
const batch = await api.solveMany(['1+1', 'foo bar baz', '2x=6']);
check(batch.length === 3 && batch[0].answer[0] === '2' && !batch[1].ok && batch[2].answer[0] === 'x = 3', 'solveMany: order kept, one failure does not stop the rest');
check((await api.solveMany('not an array')).length === 0, 'solveMany: not an array gives an empty list');
const par = await Promise.all(['1+1', '2+2', '3+3', '4+4'].map((q) => api.solve(q)));
check(par.map((r) => r.answer[0]).join() === '2,4,6,8', 'concurrent calls keep their own results');
check(typeof api.version === 'string' && api.hasCanvas === !!api.hasCanvas, 'version and hasCanvas are exported');
console.log((bad ? '' : '✓ ') + 'shapes: single, several, refused, help, solveFor, needsReview, bad arguments, batches');

// without a canvas a graph request still succeeds, with no picture (the text says so)
const noCanvas = spawnSync('node', ['-e', "require(process.argv[1]).solve('plot(x^2, x, -3, 3)').then(r=>console.log(JSON.stringify({ok:r.ok,pic:r.picture,t:r.text.includes('no picture was drawn')})))", path.join(server, 'lib', 'api.js')], { env: { ...process.env, PES_NO_CANVAS: '1' }, encoding: 'utf8' });
const nc = JSON.parse(noCanvas.stdout || '{}');
check(nc.ok === true && nc.pic === null && nc.t === true, 'no canvas: a graph request succeeds without a picture and says so', noCanvas.stdout + noCanvas.stderr);

// 3. the command line's --json carries the same fields
for (const q of ['x^2 - 5x + 6 = 0', '1) 2x=4\n2) 3x=', 'foo bar baz', 'integrate(x^3*sin(x), x, 0, pi)']) {
  const lib = await api.solve(q);
  const c = spawnSync('node', [path.join(server, 'bin', 'cli.js'), '--json', q], { encoding: 'utf8' });
  let j = null;
  try { j = JSON.parse(c.stdout); } catch (e) { /* reported below */ }
  const same = j && j.ok === lib.ok && j.kind === lib.kind && j.readAs === lib.readAs && JSON.stringify(j.answer) === JSON.stringify(lib.answer) && j.text === lib.text && JSON.stringify(j.problems) === JSON.stringify(lib.problems && lib.problems.map((p) => ({ ...p, picture: null })));
  check(!!same, 'cli --json equals the library: ' + JSON.stringify(q).slice(0, 50), (c.stdout || c.stderr).slice(0, 200));
  check(c.status === (lib.ok ? 0 : 1), 'cli exit code follows ok: ' + JSON.stringify(q).slice(0, 50), 'exit ' + c.status);
}
console.log((bad ? '' : '✓ ') + 'cli: --json has the library fields and the exit code follows ok');

// 4. the declarations compile
const tsc = process.env.TSC || (() => { try { return execFileSync('sh', ['-c', 'command -v tsc'], { encoding: 'utf8' }).trim(); } catch (e) { return ''; } })();
if (!tsc) console.log('- types: skipped (no tsc found; set TSC=/path/to/tsc)');
else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pes-ts-'));
  fs.copyFileSync(path.join(server, 'examples', 'typed.ts'), path.join(tmp, 'typed.ts'));
  fs.copyFileSync(path.join(server, 'lib', 'api.d.ts'), path.join(tmp, 'api.d.ts'));
  const src = fs.readFileSync(path.join(tmp, 'typed.ts'), 'utf8').replace("from 'photo-equation-solver-mcp'", "from './api'");
  fs.writeFileSync(path.join(tmp, 'typed.ts'), src);
  const t = spawnSync(tsc, ['--noEmit', '--strict', '--target', 'es2020', '--module', 'commonjs', '--lib', 'es2020,dom', path.join(tmp, 'typed.ts')], { encoding: 'utf8' });
  check(t.status === 0, 'types: examples/typed.ts compiles under --strict', t.stdout + t.stderr);
  // and a wrong use must be rejected, or the declarations prove nothing
  fs.writeFileSync(path.join(tmp, 'wrong.ts'), "import { solve } from './api';\nsolve(42);\nsolve('x').then((r) => { const n: number = r.answer; return n; });\n");
  const w = spawnSync(tsc, ['--noEmit', '--strict', '--target', 'es2020', '--module', 'commonjs', '--lib', 'es2020,dom', path.join(tmp, 'wrong.ts')], { encoding: 'utf8' });
  check(w.status !== 0 && /2345|2322/.test(w.stdout), 'types: wrong uses are rejected', w.stdout);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log((bad ? '' : '✓ ') + 'types: the declarations compile under --strict and reject wrong use (' + tsc.split('/').pop() + ')');
}

// 5. the example program
const ex = spawnSync('node', [path.join(server, 'examples', 'embed.cjs')], { encoding: 'utf8' });
check(ex.status === 0, 'example: exits 0', ex.stdout + ex.stderr);
check(/x = 1/.test(ex.stdout) && /π³ - 6π/.test(ex.stdout) && /could not be solved/.test(ex.stdout), 'example: prints the answers and reports the failure', ex.stdout);
console.log((bad ? '' : '✓ ') + 'example: examples/embed.cjs runs');

process.exit(bad ? 1 : 0);
