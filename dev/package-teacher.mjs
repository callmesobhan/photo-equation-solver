// Builds the teacher kit package: teacher-kit/ plus the solver (scripts/), LICENSE, and a zip.
//   <out>/photo-equation-solver-teacher-kit/   (+ photo-equation-solver-teacher-kit.zip)
// Then tests the unzipped copy from its own folder, as a teacher would use it: a worksheet with a key, variants, the working
// checker, with nothing else installed and no reference to the repository.
// Usage: node package-teacher.mjs [outDir]      (default ../dist, which is not committed)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist'));
const NAME = 'photo-equation-solver-teacher-kit';
let bad = 0;
const fail = (m) => { bad++; console.log('✗ ' + m); };

const copyDir = (src, dst) => fs.cpSync(src, dst, { recursive: true, filter: (s) => !/node_modules|package-lock\.json|\.DS_Store/.test(s) });

fs.mkdirSync(out, { recursive: true });
const stage = path.join(out, NAME);
fs.rmSync(stage, { recursive: true, force: true });
fs.rmSync(stage + '.zip', { force: true });
copyDir(path.join(root, 'teacher-kit'), stage);
for (const d of ['bin', 'lib']) copyDir(path.join(root, 'mcp-server', d), path.join(stage, 'scripts', d));
fs.copyFileSync(path.join(root, 'mcp-server', 'package.json'), path.join(stage, 'scripts', 'package.json'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'scripts', 'LICENSE'));
// the README's picture lives in the repository's assets/ folder: put it next to the README in the package
const pic = path.join(root, 'assets', 'teacher-kit.png');
if (fs.existsSync(pic)) {
  fs.mkdirSync(path.join(stage, 'assets'), { recursive: true });
  fs.copyFileSync(pic, path.join(stage, 'assets', 'teacher-kit.png'));
  const readme = path.join(stage, 'README.md');
  fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').replace('](../assets/teacher-kit.png)', '](assets/teacher-kit.png)').replace(/\]\(\.\.\/LICENSE\)/g, '](LICENSE)').replace(/\]\(\.\.\/LICENSING\.md\)/g, '](https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md)').replace(/\]\(\.\.\/dev\/tests\/teacher-test\.mjs\)/g, '](https://github.com/callmesobhan/photo-equation-solver/blob/main/dev/tests/teacher-test.mjs)'));
}

// structure
for (const f of ['README.md', 'LICENSE', 'bin/worksheet.js', 'bin/check-working.js', 'lib/generators.js', 'lib/worksheet.js', 'lib/working.js', 'lib/engine.js', 'scripts/lib/api.js', 'scripts/lib/solver.cjs', 'scripts/package.json', 'examples/sample-worksheet.html']) {
  if (!fs.existsSync(path.join(stage, f))) fail(NAME + ': ' + f + ' is missing');
}
if (fs.existsSync(path.join(stage, 'scripts', 'node_modules'))) fail(NAME + ': node_modules must not be packaged');

// the kit must find its own copy of the solver, not the repository's: no path may climb out of the package
for (const f of ['bin/worksheet.js', 'bin/check-working.js', 'lib/engine.js']) {
  const body = fs.readFileSync(path.join(stage, f), 'utf8');
  if (/\/home\/|\\Users\\/.test(body)) fail(NAME + ': ' + f + ' contains an absolute path');
}

execFileSync('zip', ['-qr', NAME + '.zip', NAME], { cwd: out });
const zipPath = path.join(out, NAME + '.zip');

// unzip somewhere else and use it from there, with the repository out of reach (PES_ENGINE unset)
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pes-teacher-pkg-'));
execFileSync('unzip', ['-q', zipPath, '-d', scratch]);
const kit = path.join(scratch, NAME);
const env = { ...process.env };
delete env.PES_ENGINE;
const run = (script, args, input) => spawnSync('node', [path.join('bin', script), ...args], { cwd: kit, encoding: 'utf8', input, env });

let r = run('worksheet.js', ['--topics', 'all', '--count', '8', '--seed', '3', '--out', 'sheet.html', '--working']);
if (r.status !== 0) fail('unzipped kit: worksheet.js failed: ' + (r.stdout + r.stderr).slice(0, 200));
else {
  const html = fs.readFileSync(path.join(kit, 'sheet.html'), 'utf8');
  if (!/Answer key/.test(html) || (html.match(/<li>/g) || []).length < 16) fail('unzipped kit: the worksheet has no key or too few problems');
}
r = run('worksheet.js', ['--topics', 'linear,quadratic', '--count', '4', '--seed', '5', '--variants', '2', '--out', 'v.html']);
if (r.status !== 0 || !fs.existsSync(path.join(kit, 'v-A.html')) || !fs.existsSync(path.join(kit, 'v-B.html'))) fail('unzipped kit: --variants failed: ' + (r.stdout + r.stderr).slice(0, 200));
r = run('check-working.js', ['--problem', '2(x+3) = 14', '--step', '2x + 6 = 14', '--step', '2x = 20', '--step', 'x = 10']);
if (r.status !== 1 || !/Step 3 is the first line/.test(r.stdout)) fail('unzipped kit: check-working.js did not find step 3: ' + (r.stdout + r.stderr).slice(0, 200));
r = run('check-working.js', ['-'], '2x + 6 = 14\n2x = 8\nx = 4\n');
if (r.status !== 0) fail('unzipped kit: correct working was not accepted: ' + (r.stdout + r.stderr).slice(0, 200));
fs.rmSync(scratch, { recursive: true, force: true });

const files = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).split('\n').filter(Boolean).length;
console.log((bad ? '' : '✓ ') + 'teacher kit ' + NAME + '.zip: ' + files + ' files, ' + Math.round(fs.statSync(zipPath).size / 1024) + ' KB' + (bad ? '' : '; the unzipped copy makes worksheets and checks working with only its own solver'));
process.exit(bad ? 1 : 0);
