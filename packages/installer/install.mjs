#!/usr/bin/env node
// Installs the Photo Equation Solver skill into Claude Code's skills folder, then runs a self-test.
// It only copies one folder (and, with --uninstall, removes that same folder). No network access.
//
//   node install.mjs                  install for you (all projects):  ~/.claude/skills/photo-equation-solver-agent
//   node install.mjs --project [dir]  install for one project only:    <dir or current folder>/.claude/skills/...
//   node install.mjs --uninstall      remove it again (add --project [dir] for a project install)
//
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE (free to evaluate for 30 days).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NAME = 'photo-equation-solver-agent';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, NAME);
const args = process.argv.slice(2);
const uninstall = args.includes('--uninstall');
const pi = args.indexOf('--project');
const project = pi >= 0;
const projectDir = project ? path.resolve(args[pi + 1] && !args[pi + 1].startsWith('--') ? args[pi + 1] : process.cwd()) : '';

const say = (m) => console.log(m);
const stop = (m) => { console.error('Stopped: ' + m); process.exit(1); };

const major = Number(process.versions.node.split('.')[0]);
if (major < 18) stop('Node.js 18 or newer is needed (this is ' + process.versions.node + '). Install it from https://nodejs.org and run this again.');

const skillsDir = project ? path.join(projectDir, '.claude', 'skills') : path.join(os.homedir(), '.claude', 'skills');
const target = path.join(skillsDir, NAME);
const isOurs = (dir) => {
  try { return new RegExp('^name:\\s*' + NAME + '\\s*$', 'm').test(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')); } catch (e) { return false; }
};

if (uninstall) {
  if (!fs.existsSync(target)) { say('Nothing to remove: ' + target + ' does not exist.'); process.exit(0); }
  if (!isOurs(target)) stop(target + ' exists but is not this skill, so it was left alone.');
  fs.rmSync(target, { recursive: true, force: true });
  say('Removed ' + target);
  process.exit(0);
}

if (!isOurs(source)) stop('the skill folder "' + NAME + '" is missing next to install.mjs. Unzip the whole archive and run this from the folder that contains it.');
if (fs.existsSync(target)) {
  if (!isOurs(target)) stop(target + ' already exists and is not this skill, so it was left alone. Move or rename it and run this again.');
  fs.rmSync(target, { recursive: true, force: true });
  say('Replacing the version already installed at ' + target);
}
fs.mkdirSync(skillsDir, { recursive: true });
fs.cpSync(source, target, { recursive: true });
say('Copied the skill to ' + target);

// self-test: run the engine the way the skill does
const test = spawnSync(process.execPath, [path.join(target, 'scripts', 'bin', 'cli.js'), 'x^2 - 5x + 6 = 0'], { encoding: 'utf8' });
if (test.status !== 0 || !/x = 2[\s\S]*x = 3/.test(test.stdout)) {
  stop('the self-test failed (' + (test.stdout + test.stderr).trim().slice(0, 200) + '). The files were copied, but the engine did not run.');
}
say('Self-test passed: x^2 - 5x + 6 = 0 gives x = 2 and x = 3.');
say('');
say('Installed' + (project ? ' for the project in ' + projectDir : ' for you (all projects)') + '.');
say('Start a new Claude Code session (or restart it) so the skill loads. Then ask for exact maths, or type /' + NAME + '.');
say('To remove it later: node install.mjs --uninstall' + (project ? ' --project ' + JSON.stringify(projectDir) : ''));
