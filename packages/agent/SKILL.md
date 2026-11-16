---
name: photo-equation-solver-agent
description: Exact, offline maths engine (Node, no network). Use whenever a maths answer must be exactly right - solving equations and systems, integrals, derivatives, limits, series, matrices, probability and statistics, finance, geometry, unit conversion, chemistry - when checking a student's working, or when reading maths from an image.
---

# Photo Equation Solver (agent edition)

An exact maths engine that runs locally. It returns exact answers (fractions, radicals, symbolic results) with the working and a check. Use it instead of calculating in your head whenever the result matters: it also catches your own arithmetic slips.

## Calling it

Run from this skill's folder (Node 18 or newer):

```
node scripts/bin/cli.js "x^2 - 5x + 6 = 0"
node scripts/bin/cli.js --for t "v = u + a*t"
node scripts/bin/cli.js --json "det([[1,2],[3,4]])"
node scripts/bin/cli.js help finance
```

`help` alone lists the areas; `help <area>` gives the exact syntax of every command there. If your host exposes the MCP tools `solve` and `help` (see README.md), call those instead: same engine, same text. Exit code 1 means it could not solve; the message says why and names a help area.

## Workflow

1. **Write the problem the way the engine reads it.** Ordinary notation: `x^2`, `sqrt(x)`, `pi`, `abs(x)`, `e^x`. A fraction bar needs brackets round the WHOLE top and the WHOLE bottom: `(x+1)/(x-1)`. Commands look like `integrate(x*e^x, x, 0, 1)`, `limit(sin(x)/x, x, 0)`, `bond(1000, 5%, 6%, 10, 2)`; short plain-English questions work too. One problem per call; the equations of one system are separated by `;`. Do not simplify or solve first.
2. **Run it and read "Read as:" first.** It shows how the input was understood. A `Note: Check the picture` line means the input was probably misread (for example `x/x`, or a 1000-year bond): fix the input and run it again.
3. **Report the Answer lines exactly.** Never change a digit. Give the Working lines when the user wants steps: they come from the engine, not from you.
4. **Checking someone's work:** solve the problem with the engine, compare, find the first step that diverges and say which. Do not mark a step wrong that you have not verified with it.
5. **Pictures:** transcribe carefully (stacked fractions, exponents, minus signs, `1`/`7`, `0`/`O`, integral limits) and show the "Read as" line so the user can confirm. If the picture is unclear, ask for a clearer one; never guess a digit.
6. **Money, statistics, chemistry, units, geometry:** do not write your own formulas or sums. Run `help <area>` and use the command it shows.

More commands: `reference/cheatsheet.md` (every command in it is tested).
