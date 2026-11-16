# Install: Photo Equation Solver, a skill for Claude Code

This zip adds one skill to Claude Code: an exact, offline maths engine (equations, calculus, matrices, statistics,
finance, geometry, units, chemistry). The installer copies a single folder and runs a self-test. It makes no
network connections and changes nothing else.

## Steps (for you, or for Claude Code when you ask it to install this)

1. Check Node.js 18 or newer: `node --version`. If it is missing or older, stop and install Node.js from
   https://nodejs.org first. Do not install it silently.
2. Unzip the archive if it is still zipped. Then, from the folder that contains this file, run:

   ```
   node install.mjs
   ```

   (Same command in macOS, Linux and Windows terminals.) It copies the skill to `~/.claude/skills/photo-equation-solver-agent`
   (on Windows: `%USERPROFILE%\.claude\skills\...`), replaces an older copy of itself if there is one, and refuses to touch
   a different folder that happens to have the same name.
3. The output should end with `Self-test passed` and `Installed`.
4. Start a new Claude Code session, or restart it, so the skill loads. Then try:

   > I need exact answers, no rounding: the definite integral of x^3*sin(x) from 0 to pi, and the eigenvalues of the matrix [[4,1,0],[1,3,1],[0,1,2]].

   Expected: π³ − 6π, and eigenvalues 3 − √3, 3 and 3 + √3. You can also call the skill by name:
   `/photo-equation-solver-agent`.

## Options

- Only for one project: `node install.mjs --project` (installs into `./.claude/skills` of the current folder).
- Remove it again: `node install.mjs --uninstall` (add `--project` if you installed it that way).
- By hand, if the script cannot run: copy the folder `photo-equation-solver-agent` into `~/.claude/skills/` so that
  `~/.claude/skills/photo-equation-solver-agent/SKILL.md` exists.

## Good to know

- Claude Code decides when to use a skill. For easy sums it may just calculate; ask for "exact answers" or call the
  skill by name to make sure the engine is used.
- Graphs are optional: run `npm install` inside the installed skill's `scripts` folder to add them.
- Licence: the source is readable and you may try it for 30 days; using it beyond that needs a paid licence from the
  author. See `LICENSE`.
