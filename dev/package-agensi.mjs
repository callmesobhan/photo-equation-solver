// Builds the text-only skill for a marketplace that delivers text files only (Agensi): packages/agensi ->
//   <out>/photo-equation-solver/            the folder (SKILL.md and reference/*.md, no scripts)
//   <out>/photo-equation-solver-agensi.zip  the zip to upload
//   <out>/LISTING.md                        the copy for the upload form (not in the zip)
// The engine is NOT in the package: the skill tells the buyer's agent to use a separately installed copy.
// Checks the structure and what a security scan or a reviewer looks for, then installs the engine into a scratch
// home directory exactly as the skill's install steps say and runs the skill's own first-use check and commands.
// Usage: node package-agensi.mjs [outDir]      (default ../dist/agensi, which is not committed)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'agensi'));
const NAME = 'photo-equation-solver';
const REPO_URL = 'https://github.com/callmesobhan/photo-equation-solver';
let bad = 0;
const fail = (m) => { bad++; console.log('✗ ' + m); };

const stage = path.join(out, NAME);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.cpSync(path.join(root, 'packages', 'agensi'), stage, { recursive: true, filter: (s) => path.basename(s) !== 'LISTING.md' });
fs.copyFileSync(path.join(root, 'packages', 'agensi', 'LISTING.md'), path.join(out, 'LISTING.md'));

// ---- structure
function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])); }
const files = walk(stage).map((f) => path.relative(stage, f));
for (const f of files) if (!(f === 'SKILL.md' || /^reference\/[\w.-]+\.md$/.test(f))) fail('unexpected file in the package: ' + f + ' (text-only: SKILL.md and reference/*.md)');
if (files.length > 200) fail('more than 200 files');
const md = fs.readFileSync(path.join(stage, 'SKILL.md'), 'utf8');
const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(md);
if (!m) { fail('SKILL.md has no front matter'); process.exit(1); }
const fm = {};
let listKey = null;
for (const line of m[1].split('\n')) {
  const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
  const item = /^\s+-\s+(.+)$/.exec(line);
  if (kv) { fm[kv[1]] = kv[2] === '' ? [] : kv[2]; listKey = kv[2] === '' ? kv[1] : null; } else if (item && listKey) fm[listKey].push(item[1]);
}
const body = m[2];
if (fm.name !== NAME) fail('front matter name "' + fm.name + '" must be ' + NAME + ' (the folder name)');
if (!fm.name || fm.name.length > 60) fail('name missing or longer than 60 characters');
if (!/^[a-z0-9-]+$/.test(fm.name || '')) fail('name must be lowercase letters, numbers and hyphens');
if (!fm.description || fm.description.length > 600) fail('description missing or over 600 characters');
if (!fm.summary || fm.summary.length > 300) fail('summary missing or over 300 characters (' + (fm.summary || '').length + ')');
if (!/^\d+\.\d+\.\d+$/.test(fm.version || '')) fail('version must look like 1.0.0');
if (fm.docs_url !== REPO_URL) fail('docs_url must be the repository address');
for (const k of ['tags', 'keywords', 'use_cases']) if (!Array.isArray(fm[k]) || !fm[k].length) fail(k + ' must be a non-empty list');
if (!/^Requires:/m.test(body)) fail('the body needs a "Requires:" line (the buyer\'s agent tells the user about missing requirements)');
if (md.length > 4500) fail('SKILL.md is ' + md.length + ' bytes (keep it under 4500)');
for (const r of md.matchAll(/`(reference\/[A-Za-z0-9_./-]+)`/g)) if (!fs.existsSync(path.join(stage, r[1]))) fail('SKILL.md mentions ' + r[1] + ', which is not in the package');

// ---- what a security scan or a reviewer looks for
const banned = [[/\beval\s*\(/, 'eval('], [/new Function\s*\(/, 'new Function('], [/child_process/, 'child_process'], [/\b(curl|wget)\b/, 'curl/wget'], [/\|\s*(ba)?sh\b/, 'a pipe to a shell'], [/\bsudo\b/, 'sudo'], [/rm\s+-rf/, 'rm -rf'], [/base64\s+(-d|--decode)/, 'base64 decoding'], [/process\.env/, 'process.env'], [/\bfetch\s*\(/, 'fetch('],
  [/ignore (all )?(previous|prior) /i, 'an "ignore previous instructions" phrase'], [/do not (tell|inform) the user/i, 'a hide-from-the-user phrase'], [/hide .{0,30} from the user/i, 'a hide-from-the-user phrase'], [/suppress (the )?output/i, 'a suppress-output phrase'], [/exfiltrat/i, 'exfiltrat'], [/\\u[0-9a-fA-F]{4}/, 'a \\uXXXX escape']];
for (const f of files) {
  const text = fs.readFileSync(path.join(stage, f), 'utf8');
  for (const [rx, what] of banned) if (rx.test(text)) fail(f + ' contains ' + what);
  for (const u of text.match(/https?:\/\/[^\s)'"`<>]+/g) || []) if (!u.startsWith(REPO_URL)) fail(f + ' links to ' + u + ' (only the repository is allowed)');
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text)) fail(f + ' has control characters');
}

// ---- zip
execFileSync('zip', ['-qr', path.join(out, NAME + '-agensi.zip'), NAME], { cwd: out });
const listing = execFileSync('unzip', ['-Z1', path.join(out, NAME + '-agensi.zip')], { encoding: 'utf8' }).trim().split('\n');
if (!listing.every((f) => f.startsWith(NAME + '/')) || listing.some((f) => /\.(js|cjs|mjs|sh|py|exe|so|bin)$/.test(f) || /node_modules|\.DS_Store|__MACOSX/.test(f))) fail('the zip must hold only the text files in one folder');

// ---- act as a buyer: install the engine as install.md says (from this checkout, not the network), then run the skill's own commands
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pes-home-'));
fs.mkdirSync(path.join(home, 'photo-equation-solver'), { recursive: true });
fs.cpSync(path.join(root, 'mcp-server'), path.join(home, 'photo-equation-solver', 'mcp-server'), { recursive: true, filter: (s) => !/node_modules/.test(s) });
const sh = (cmd) => spawnSync('bash', ['-c', cmd], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
const check = /```\n(test -f [^\n]+)\n```/.exec(md);
if (!check) fail('SKILL.md lost its first-use check command');
else {
  const r = sh(check[1]);
  if (!/found/.test(r.stdout)) fail('the first-use check does not find the engine installed as install.md says');
  const gone = spawnSync('bash', ['-c', check[1]], { env: { ...process.env, HOME: path.join(home, 'nowhere') }, encoding: 'utf8' });
  if (/found/.test(gone.stdout)) fail('the first-use check says "found" when the engine is missing');
}
const solve = sh('node ~/photo-equation-solver/mcp-server/bin/cli.js "x^2 - 5x + 6 = 0"');
if (!/x = 2[\s\S]*x = 3/.test(solve.stdout)) fail('the engine installed as described did not solve a quadratic: ' + (solve.stdout + solve.stderr).slice(0, 100));
const fin = sh('node ~/photo-equation-solver/mcp-server/bin/cli.js help finance');
if (!/bond\(1000, 5%, 6%, 10, 2\)/.test(fin.stdout)) fail('help finance did not list bond()');
fs.rmSync(home, { recursive: true, force: true });

console.log((bad ? '' : '✓ ') + 'Agensi text-only package: ' + listing.filter((f) => !f.endsWith('/')).length + ' files (' + files.join(', ') + '), SKILL.md ' + md.length + ' bytes (about ' + Math.round(md.length / 4) + ' tokens by chars/4), zip ' + (fs.statSync(path.join(out, NAME + '-agensi.zip')).size / 1024).toFixed(1) + ' KB, summary ' + (fm.summary || '').length + '/300 chars');
process.exit(bad ? 1 : 0);
