---
name: photo-equation-solver
description: Exact, offline maths for AI agents. Use whenever a maths answer must be exactly right - solving equations and systems, integrals, derivatives, limits, series, matrices, probability and statistics, finance, geometry, unit conversion, chemistry - when making a worksheet with an answer key, when checking a student's working, or when reading maths from an image. Runs a separately installed local engine (Node.js).
summary: Exact, offline maths for your agent. Equations, calculus, matrices, statistics, finance, geometry, units and chemistry are calculated by a local engine, not guessed by the model. Includes a teacher kit: worksheets with answer keys, and a student-working checker.
version: 1.1.0
tags:
  - maths
  - calculus
  - algebra
  - statistics
  - equation-solver
  - education
  - teaching
  - worksheets
keywords:
  - exact arithmetic
  - symbolic maths
  - integrals
  - matrices
  - homework check
  - answer key
  - offline
use_cases:
  - Solve an equation or a system exactly
  - Make a worksheet with an answer key
  - Check a student's working and find the first wrong step
  - Compute an integral, limit or series in exact form
  - Run a statistics test or build a confidence interval
  - Price a bond or work out a loan payment
  - Read maths from a photo and solve it
docs_url: https://github.com/callmesobhan/photo-equation-solver
---

# Photo Equation Solver

Requires: Node.js 18+ and the Photo Equation Solver engine, installed separately by the user (see "First use").

This skill teaches you to use an exact maths engine on the user's own computer. It returns exact answers (fractions, radicals, symbolic results) with the working and a check. Use it instead of calculating in your head whenever the result matters.

## First use: check the engine

Before the first call, check that the engine is installed:

```
test -f ~/photo-equation-solver/mcp-server/bin/cli.js && echo found
```

If it prints `found`, go on. If not, do not install anything yourself: tell the user the engine is missing, show them the steps in `reference/install.md`, and wait until they say it is installed. The engine is a separate program with its own licence, which the install steps explain. If the user installed it somewhere else, use their path in the commands below.

## Calling it

```
node ~/photo-equation-solver/mcp-server/bin/cli.js "x^2 - 5x + 6 = 0"
node ~/photo-equation-solver/mcp-server/bin/cli.js --for t "v = u + a*t"
node ~/photo-equation-solver/mcp-server/bin/cli.js --json "det([[1,2],[3,4]])"
node ~/photo-equation-solver/mcp-server/bin/cli.js help finance
```

`help` alone lists the areas; `help <area>` gives the exact syntax of every command there. Exit code 1 means it could not solve; the message says why and names a help area. If the shell says `node: command not found` (exit code 127), Node is not on this shell's PATH: find it (`command -v node`, or look in `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.nvm`) and run the same command with its full path.

## Workflow

1. **Write the problem the way the engine reads it.** Ordinary notation: `x^2`, `sqrt(x)`, `pi`, `abs(x)`, `e^x`. A fraction bar needs brackets round the WHOLE top and the WHOLE bottom: `(x+1)/(x-1)`. Commands look like `integrate(x*e^x, x, 0, 1)`, `limit(sin(x)/x, x, 0)`, `bond(1000, 5%, 6%, 10, 2)`; short plain-English questions work too. One problem per call; the equations of one system are separated by `;`. Do not simplify or solve first.
2. **Run it and read "Read as:" first.** It shows how the input was understood. A `Note: Check the picture` line means the input was probably misread (for example `x/x`, or a 1000-year bond): fix the input and run it again.
3. **Report the Answer lines exactly.** Never change a digit. Give the Working lines when the user wants steps: they come from the engine, not from you.
4. **Worksheets, and checking someone's work:** read `reference/teacher-kit.md` first (teaching use needs a licence). Do not mark a step wrong that the kit has not marked.
5. **Pictures:** transcribe carefully (stacked fractions, exponents, minus signs, `1`/`7`, `0`/`O`, integral limits) and show the "Read as" line so the user can confirm. If the picture is unclear, ask for a clearer one; never guess a digit.
6. **Money, statistics, chemistry, units, geometry:** do not write your own formulas or sums. Run `help <area>` and use the command it shows.

More commands: `reference/cheatsheet.md` (every command in it is tested against the engine).
