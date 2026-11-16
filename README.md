# Photo Equation Solver

Exact, offline maths for AI models. The model *reads* the maths, from a photo or from text; a self-contained
solver does all the *calculating* with exact fractions and symbolic expressions, and echoes how the input was
read so a misread digit is easy to spot. No internet, no cloud, no API key.

It started as a skill for **Gemma 4 E4B** on a phone (Google AI Edge Gallery) and now comes in three editions
(see [Editions](#editions)): one for phones, one for local models, one for capable agents.

It covers equations, systems and inequalities, calculus (integrals, derivatives, limits,
series, tangent lines, curve study, areas and volumes), several-variable calculus, linear
programming, differential equations (first order of the usual textbook types, linear of any
order, Euler equations, systems) and Laplace transforms, parametric / polar / vector calculus,
numerical methods (Euler, Runge-Kutta, Simpson, bisection, interpolation), matrices, complex numbers, number
theory and counting, logic and graph algorithms, recurrences, statistics and probability, geometry (triangles, conic sections), unit
conversion, finance, chemistry (molar mass, balancing equations), physics formulas and graphs.

| | |
|---|---|
| Skill folder | [`photo-equation-solver/`](photo-equation-solver) - `SKILL.md`, `scripts/index.html`, `README.md` |
| Full docs (what it can do, install, notation, limits) | [`photo-equation-solver/README.md`](photo-equation-solver/README.md) |
| MCP server and command line tool (for agents and editors) | [`mcp-server/`](mcp-server) |
| Skill packages for local models and for agents | [`packages/local`](packages/local), [`packages/agent`](packages/agent) |
| Source, build and tests | [`dev/`](dev) |
| Licence | [`LICENSE`](LICENSE): proprietary, not free to use |

## Editions

One exact solver, packaged for three kinds of model:

| Edition | For | Instructions | How you get it |
|---|---|---|---|
| **Pocket** | Gemma 4 E4B on a phone, in Google AI Edge Gallery | `photo-equation-solver/SKILL.md`, under 2 KB, with a one-page JavaScript solver | import the folder |
| **Local** | mid-size and large local models (for example Gemma 4 26B / 31B, Qwen, Llama) in an agent harness | [`packages/local`](packages/local): strict rules, a command list, examples, plus the CLI and MCP server | `node dev/package-skills.mjs` writes `dist/photo-equation-solver-local.zip` |
| **Agent** | Claude Code, Cursor, Copilot, Gemini CLI, Codex CLI, Antigravity and other capable agents | [`packages/agent`](packages/agent): a short workflow, a tested cheat sheet, plus the CLI and MCP server | `node dev/package-skills.mjs` writes `dist/photo-equation-solver-agent.zip` |

The Local and Agent packages run the engine through `node scripts/bin/cli.js` or the MCP server (`mcp-server/`).

To hand the Agent edition to someone who uses Claude Code, `node dev/package-bundle.mjs` builds `photo-equation-solver-for-claude-code.zip`: they give it to Claude Code and say "install this" (it holds `INSTALL.md` and a small installer).

For marketplaces that deliver text files only, [`packages/agensi`](packages/agensi) is the same instructions as a text-only skill: the engine is installed separately by the user (`reference/install.md`). `node dev/package-agensi.mjs` builds its zip.

## Licence

This is **not** free software. The source is public so that you can read it and try it for up to 30 days; using it
beyond that, or sharing it, needs a paid licence. See [`LICENSE`](LICENSE) for the exact terms. The install steps
below are for evaluation or for licensed use.

## Install in AI Edge Gallery

For fully offline use, install the skill so the app copies it into its own storage
(**Import local skill**, or paste it into the in-app skill editor). Skills added with
**Load skill from URL** only remember the URL and re-download `scripts/index.html` on every run.

To use the URL route, make this repository public, enable GitHub Pages (deploy from the
`main` branch, root), and enter `https://callmesobhan.github.io/photo-equation-solver/photo-equation-solver`
in *Skills → (+) → Load skill from URL*. Check that `<that url>/SKILL.md` shows plain text.
The empty `.nojekyll` file in this repo keeps Pages from rewriting the Markdown.

## Develop

```bash
cd dev
./run-all.sh      # rebuilds photo-equation-solver/scripts/index.html and runs every test
```

Edit `dev/src/*.js`, never the generated `index.html`. See [`dev/README.md`](dev/README.md).

## Status

Tested on a desktop against independent oracles (sympy, scipy, numpy, pint, periodictable,
numpy-financial), with fuzzing, and with the page loaded in offline Chromium exactly as the
app calls it (details in the skill README).

Tried on an iPhone with Gemma-4-E4B-it in Google AI Edge Gallery (GPU), by importing the folder, with typed
problems and simulated handwritten photos.

The Local and Agent packages and the MCP server are covered by automated tests (a real stdio session with the
MCP server, every documented command line), but have not yet been run inside particular agent products or with
particular local models.
