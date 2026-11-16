// The documentation of the tier 2 and tier 3 packages must not lie: every command line in packages/**/SKILL.md and in
// the cheat sheet runs without an error in the engine that ships with them.
//   - lines in a fenced block under "## Commands" (local SKILL.md) or anywhere in cheatsheet.md: one call each
//     (`  # comment` stripped; a leading `--for x` sets the unknown to solve for)
//   - `node scripts/bin/cli.js ... "..."` anywhere in SKILL.md files and READMEs: the quoted text, with --for if given
//   - `node scripts/bin/cli.js help <area>`: the help topic
// Usage: node packages-test.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const solver = createRequire(import.meta.url)(path.join(root, 'mcp-server', 'lib', 'solver.cjs'))(undefined)['ai_edge_gallery_get_result'];
const run = async (equation, solveFor) => JSON.parse(await solver(JSON.stringify(solveFor ? { equation, solve_for: solveFor } : { equation })));

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const mds = files(path.join(root, 'packages')).filter((f) => f.endsWith('.md'));

function fences(text) {
  const out = [];
  let heading = '';
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^```/.test(line)) {
      if (cur) { out.push(cur); cur = null; } else cur = { heading, lines: [] };
    } else if (cur) cur.lines.push(line);
    else if (/^#{1,6} /.test(line)) heading = line.replace(/^#+ /, '').trim();
  }
  return out;
}

const jobs = [];
for (const f of mds) {
  const rel = path.relative(root, f);
  const text = fs.readFileSync(f, 'utf8');
  const isCheat = /cheatsheet\.md$/.test(f);
  const isSkill = /SKILL\.md$/.test(f);
  if (isCheat || isSkill) {
    for (const fence of fences(text)) {
      if (!(isCheat || /^Commands$/i.test(fence.heading))) continue;
      for (const raw of fence.lines) {
        const line = raw.replace(/\s{2,}#.*$/, '').trim();
        if (!line) continue;
        const m = /^--for (\w+) (.+)$/.exec(line);
        jobs.push({ where: rel, equation: m ? m[2] : line, solveFor: m ? m[1] : '' });
      }
    }
  }
  for (const m of text.matchAll(/node scripts\/bin\/cli\.js((?: --\w+(?: \w+)?)*) "([^"]+)"/g)) {
    const forM = /--for (\w+)/.exec(m[1]);
    jobs.push({ where: rel, equation: m[2], solveFor: forM ? forM[1] : '' });
  }
  for (const m of text.matchAll(/node scripts\/bin\/cli\.js help(?: (\w+))?/g)) jobs.push({ where: rel, equation: m[1] ? 'help ' + m[1] : 'help', solveFor: '' });
}

let bad = 0;
const seen = new Set();
for (const j of jobs) {
  if (/^<[^>]*>$/.test(j.equation)) continue; // a placeholder such as "<the maths>"
  const key = j.solveFor + '|' + j.equation;
  if (seen.has(key)) continue;
  seen.add(key);
  const r = await run(j.equation, j.solveFor);
  if (r.error !== undefined) { bad++; console.log('✗ ' + j.where + ': ' + j.equation + '\n    ' + r.error.slice(0, 160)); }
}
console.log((bad ? '' : '✓ ') + seen.size + ' distinct command lines in ' + mds.length + ' package documents ' + (bad ? 'with ' + bad + ' failing' : 'all run without an error'));
process.exit(bad || seen.size < 80 ? 1 : 0);
