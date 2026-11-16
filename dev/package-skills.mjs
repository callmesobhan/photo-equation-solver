// Assembles the tier 2 (local models) and tier 3 (agent) skill packages from packages/ and mcp-server/:
//   <out>/photo-equation-solver-local/  and  <out>/photo-equation-solver-agent/   (+ a .zip of each)
// Each folder holds SKILL.md (+ README, reference/), scripts/ (the CLI, the MCP server and the engine) and LICENSE.
// Checks the structure, then smoke-tests the assembled copy the way an agent uses it.
// Usage: node package-skills.mjs [outDir]      (default ../dist, which is not committed)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist'));
const TIERS = [
  { dir: 'local', name: 'photo-equation-solver-local', tier: 2, maxSkill: 3500 },
  { dir: 'agent', name: 'photo-equation-solver-agent', tier: 3, maxSkill: 3200 },
];
let bad = 0;
const fail = (m) => { bad++; console.log('✗ ' + m); };

function copyDir(src, dst) {
  fs.cpSync(src, dst, { recursive: true, filter: (s) => !/node_modules|package-lock\.json|\.DS_Store/.test(s) });
}

fs.mkdirSync(out, { recursive: true });
for (const t of TIERS) {
  const stage = path.join(out, t.name);
  fs.rmSync(stage, { recursive: true, force: true });
  fs.rmSync(stage + '.zip', { force: true });
  copyDir(path.join(root, 'packages', t.dir), stage);
  for (const d of ['bin', 'lib']) copyDir(path.join(root, 'mcp-server', d), path.join(stage, 'scripts', d));
  fs.copyFileSync(path.join(root, 'mcp-server', 'package.json'), path.join(stage, 'scripts', 'package.json'));
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'));
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(stage, 'scripts', 'LICENSE'));

  // structure
  const md = fs.readFileSync(path.join(stage, 'SKILL.md'), 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(md);
  const name = fm && /^name:\s*(.+)$/m.exec(fm[1]);
  const desc = fm && /^description:\s*(.+)$/m.exec(fm[1]);
  if (!fm || !name || !desc) fail(t.name + ': SKILL.md needs front matter with name and description');
  if (name && name[1].trim() !== t.name) fail(t.name + ': front matter name "' + name[1].trim() + '" differs from the folder name');
  if (desc && desc[1].length > 600) fail(t.name + ': description is ' + desc[1].length + ' characters (keep it under 600)');
  if (md.length > t.maxSkill) fail(t.name + ': SKILL.md is ' + md.length + ' bytes (limit ' + t.maxSkill + ')');
  for (const m of md.matchAll(/`((?:reference|scripts)\/[A-Za-z0-9_./-]+)`/g)) if (!fs.existsSync(path.join(stage, m[1]))) fail(t.name + ': SKILL.md mentions ' + m[1] + ', which is not in the package');
  for (const f of ['README.md', 'LICENSE', 'scripts/bin/cli.js', 'scripts/bin/server.js', 'scripts/lib/mcp.js', 'scripts/lib/solver.cjs', 'scripts/package.json']) if (!fs.existsSync(path.join(stage, f))) fail(t.name + ': ' + f + ' is missing');
  if (fs.existsSync(path.join(stage, 'scripts', 'node_modules'))) fail(t.name + ': node_modules must not be packaged');

  // smoke tests of the assembled copy, run from its own folder as an agent would
  const cli = (...args) => spawnSync('node', ['scripts/bin/cli.js', ...args], { cwd: stage, encoding: 'utf8', input: '' });
  const a = cli('x^2 - 5x + 6 = 0');
  if (a.status !== 0 || !/x = 2[\s\S]*x = 3/.test(a.stdout)) fail(t.name + ': the CLI did not solve a quadratic: ' + (a.stdout + a.stderr).slice(0, 100));
  const b = cli('--for', 't', 'v = u + a*t');
  if (!/t = \(v - u\)\/a/.test(b.stdout)) fail(t.name + ': --for did not work');
  const h = cli('help', 'finance');
  if (!/bond\(1000, 5%, 6%, 10, 2\)/.test(h.stdout)) fail(t.name + ': help finance did not list bond()');
  const e = cli('2x +');
  if (e.status !== 1 || !/help/.test(e.stdout)) fail(t.name + ': a failing input should exit 1 and name help');
  const srv = spawnSync('node', ['scripts/bin/server.js'], {
    cwd: stage, encoding: 'utf8',
    input: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }) + '\n' + JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'solve', arguments: { equation: 'det([[1,2],[3,4]])' } } }) + '\n',
  });
  const replies = srv.stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (replies.length !== 2 || !/-2/.test(JSON.stringify(replies[1].result)) || srv.stderr) fail(t.name + ': the MCP server did not answer a real session cleanly');

  execFileSync('zip', ['-qr', t.name + '.zip', t.name], { cwd: out });
  const listing = execFileSync('unzip', ['-Z1', path.join(out, t.name + '.zip')], { encoding: 'utf8' }).trim().split('\n');
  if (listing.some((f) => /node_modules|\.DS_Store/.test(f)) || !listing.every((f) => f.startsWith(t.name + '/'))) fail(t.name + ': the zip must hold the one folder and nothing else');
  console.log((bad ? '' : '✓ ') + 'tier ' + t.tier + ' ' + t.name + '.zip: ' + listing.filter((f) => !f.endsWith('/')).length + ' files, SKILL.md ' + md.length + ' bytes (about ' + Math.round(md.length / 4) + ' tokens by chars/4), zip ' + Math.round(fs.statSync(path.join(out, t.name + '.zip')).size / 1024) + ' KB');
}
process.exit(bad ? 1 : 0);
