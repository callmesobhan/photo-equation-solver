// Builds the zip you can hand to someone who uses Claude Code: they give it to Claude Code and say "install this".
//   <out>/photo-equation-solver-for-claude-code/            INSTALL.md, install.mjs, LICENSE, photo-equation-solver-agent/ (the Agent edition)
//   <out>/photo-equation-solver-for-claude-code.zip
// Then tests the installer from the UNZIPPED bundle in a scratch home directory: install, reinstall, refusing to overwrite
// a different folder of the same name, a project install, uninstall.
// Usage: node package-bundle.mjs [outDir]      (default ../dist/bundle, which is not committed)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'bundle'));
const BUNDLE = 'photo-equation-solver-for-claude-code';
const SKILL = 'photo-equation-solver-agent';
let bad = 0;
const fail = (m) => { bad++; console.log('✗ ' + m); };

fs.rmSync(out, { recursive: true, force: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pes-bundle-'));
execFileSync('node', [path.join(here, 'package-skills.mjs'), path.join(tmp, 'skills')], { stdio: 'pipe' });
const stage = path.join(out, BUNDLE);
fs.mkdirSync(stage, { recursive: true });
fs.cpSync(path.join(tmp, 'skills', SKILL), path.join(stage, SKILL), { recursive: true });
for (const f of ['INSTALL.md', 'install.mjs']) fs.copyFileSync(path.join(root, 'packages', 'installer', f), path.join(stage, f));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'));
execFileSync('zip', ['-qr', BUNDLE + '.zip', BUNDLE], { cwd: out });
const listing = execFileSync('unzip', ['-Z1', path.join(out, BUNDLE + '.zip')], { encoding: 'utf8' }).trim().split('\n');
if (!listing.every((f) => f.startsWith(BUNDLE + '/')) || listing.some((f) => /node_modules|__MACOSX|\.DS_Store|\.git\//.test(f))) fail('the zip must hold the one folder and nothing stray');
for (const need of ['INSTALL.md', 'install.mjs', 'LICENSE', SKILL + '/SKILL.md', SKILL + '/scripts/bin/cli.js', SKILL + '/scripts/lib/solver.cjs']) if (!listing.includes(BUNDLE + '/' + need)) fail('the zip lacks ' + need);
const installer = fs.readFileSync(path.join(stage, 'install.mjs'), 'utf8');
for (const [rx, what] of [[/\bfetch\s*\(/, 'fetch('], [/require\(['"]https?['"]\)|from 'node:https?'/, 'a network module'], [/\beval\s*\(/, 'eval('], [/\bsudo\b/, 'sudo'], [/child_process.*\bexec\b/, 'exec']]) if (rx.test(installer)) fail('install.mjs contains ' + what);

// ---- use the unzipped bundle, in a scratch home
const x = path.join(tmp, 'unzipped');
fs.mkdirSync(x);
execFileSync('unzip', ['-q', path.join(out, BUNDLE + '.zip'), '-d', x]);
const dir = path.join(x, BUNDLE);
const home = path.join(tmp, 'home');
fs.mkdirSync(home);
const run = (args, opts = {}) => spawnSync('node', [path.join(dir, 'install.mjs'), ...args], { cwd: opts.cwd || dir, env: { ...process.env, HOME: home, USERPROFILE: home }, encoding: 'utf8' });
const target = path.join(home, '.claude', 'skills', SKILL);

let r = run([]);
if (r.status !== 0 || !/Self-test passed/.test(r.stdout) || !/Installed for you/.test(r.stdout)) fail('install failed: ' + (r.stdout + r.stderr).slice(0, 200));
for (const f of ['SKILL.md', 'reference/cheatsheet.md', 'scripts/bin/cli.js', 'scripts/bin/server.js', 'scripts/lib/solver.cjs', 'LICENSE']) if (!fs.existsSync(path.join(target, f))) fail('installed copy lacks ' + f);
// the installed copy works the way the skill says: from its own folder
const solved = spawnSync('node', ['scripts/bin/cli.js', '--for', 't', 'v = u + a*t'], { cwd: target, encoding: 'utf8' });
if (!/t = \(v - u\)\/a/.test(solved.stdout)) fail('the installed engine did not solve for t');

r = run([]);
if (r.status !== 0 || !/Replacing/.test(r.stdout)) fail('a second install should replace the first: ' + (r.stdout + r.stderr).slice(0, 160));

// a different folder with the same name is never touched
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, 'SKILL.md'), '---\nname: something-else\ndescription: not ours\n---\n');
r = run([]);
if (r.status !== 1 || !/left alone/.test(r.stderr) || !/something-else/.test(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'))) fail('the installer must refuse to overwrite a different skill of the same name');
r = run(['--uninstall']);
if (r.status !== 1 || !fs.existsSync(path.join(target, 'SKILL.md'))) fail('uninstall must refuse to remove a different skill');
fs.rmSync(target, { recursive: true, force: true });

// project install and uninstall
const proj = path.join(tmp, 'myproject');
fs.mkdirSync(proj);
r = run(['--project', proj]);
if (r.status !== 0 || !fs.existsSync(path.join(proj, '.claude', 'skills', SKILL, 'SKILL.md')) || fs.existsSync(target)) fail('the project install should land in the project and not in the home directory: ' + (r.stdout + r.stderr).slice(0, 160));
r = run(['--uninstall', '--project', proj]);
if (r.status !== 0 || fs.existsSync(path.join(proj, '.claude', 'skills', SKILL))) fail('project uninstall failed');
r = run(['--uninstall']);
if (r.status !== 0 || !/Nothing to remove/.test(r.stdout)) fail('uninstalling what is not installed should say so');

fs.rmSync(tmp, { recursive: true, force: true });
console.log((bad ? '' : '✓ ') + 'bundle ' + BUNDLE + '.zip: ' + listing.filter((f) => !f.endsWith('/')).length + ' files, ' + (fs.statSync(path.join(out, BUNDLE + '.zip')).size / 1024).toFixed(0) + ' KB');
process.exit(bad ? 1 : 0);
