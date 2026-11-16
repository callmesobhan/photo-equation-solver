# Copy for the Agensi upload form (not part of the zip)

Fill the form at agensi.io/dashboard/submit with the fields below. Nothing here has been submitted. Read the
"Before you submit" list at the end first.

## Name (up to 60 characters, unique on Agensi)

Photo Equation Solver: exact maths for your agent

## Summary (up to 300 characters)

Exact, offline maths for your agent. Equations, calculus, matrices, statistics, finance, geometry, units and chemistry are calculated by a local engine, not guessed by the model.

## Description (Markdown)

Language models are good at explaining maths and unreliable at calculating it. This skill sends the calculating to an exact engine that runs on your own computer, and keeps the model for reading the problem and explaining the result.

**What it does**

- Solves equations, systems and inequalities, with exact answers: fractions, radicals, symbolic forms.
- Integrals, derivatives, limits, series, differential equations, Laplace transforms.
- Matrices and vectors: determinants, inverses, eigenvalues, linear systems.
- Probability and statistics: distributions, t, chi-square and other tests, confidence intervals, regression.
- Finance (loans, bonds, interest), geometry, unit conversion, chemistry (molar mass, balancing), physics formulas.
- Checks a student's working: it solves the problem and finds the first step that differs.
- Reads maths from a photo (your agent reads the picture; the engine solves what it read and echoes how it was read).

**How it works**

The skill gives your agent the rules for using the engine: how to write a problem, how to read the result, and when to ask for syntax help. The engine itself is a separate program that you install once (three short commands, in the skill's install steps). It needs Node.js 18 or newer. It runs offline: it makes no network connection when it solves something.

**Where it stops**

- The engine is a separate program with its own licence: its source is readable, it is free to try for 30 days, and using it beyond that needs a paid licence from the author.
- It does not replace understanding: an agent can still misread a photo. The result always starts with a "Read as" line so you can check what was understood.
- Graphs need one optional package.
- Tested with the engine's own automated checks and with Claude Code. Not yet tried in other agents.

## See it in action (a real request and the full result)

Request: "I need exact answers: (1) the definite integral of x^3*sin(x) from 0 to pi, (2) the eigenvalues of [[4,1,0],[1,3,1],[0,1,2]], (3) the Welch two-sample t-test for [5,6,7,8,9] and [3,4,5,6,9]."

Result:

```
Read as: ∫ from 0 to π x³ sin(x) dx
Answer: π³ - 6π (≈ 12.156721)
Working:
- Definite integral of x³ sin(x) from 0 to π
- Antiderivative: -x³ cos(x) + 3x² sin(x) + 6x cos(x) - 6 sin(x)
Check: a numerical integration gives 12.156721, which agrees

Read as: eigen([[4, 1, 0], [1, 3, 1], [0, 1, 2]])
Answer:
  λ = 3 - √3 (≈ 1.2679492):  [0.26794919, -0.73205081, 1]
  λ = 3:  [1, -1, -1]
  λ = 3 + √3 (≈ 4.7320508):  [3.7320508, 2.7320508, 1]
Working:
- Characteristic polynomial: λ³ - 9λ² + 24λ - 18 = 0

Read as: ttest2([5, 6, 7, 8, 9], [3, 4, 5, 6, 9])
Answer:
  t = 1.2810252
  p-value: two-tailed 0.24050972,  left-tailed 0.87974514,  right-tailed 0.12025486
Working:
- Welch t test (unequal variances): x̄₁ − x̄₂ = 1.6,  SE = 1.2489996,  df = 7.0867793
```

(Output of the engine, checked against sympy and scipy.)

## Compatibility note

Requires Node.js 18+ and the Photo Equation Solver engine (installed separately; see the install steps in the skill).

## Categories (up to 3; the first decides the category page)

1. Education & Learning
2. Research & Analysis
3. Finance & Accounting

## Tags and use cases

Already in the SKILL.md front matter, which the form reads: tags, keywords and use cases. Edit them in the form if you like.

## Limitations and FAQ

- **Does it need internet?** Only once, to download the engine. Solving is offline.
- **Which agents?** Any agent that can run a shell command with Node.js. Tried so far in Claude Code only.
- **Is the answer always right?** The engine's arithmetic is exact and checked against independent libraries. A model can still misread a photo or mistype a problem, which is why the "Read as" line comes first.
- **Do I pay for the engine?** It is free to try for 30 days; after that its licence applies (see the install steps).

## Docs link

https://github.com/callmesobhan/photo-equation-solver

## Price

Your decision. The minimum for a paid skill is $1.

## Before you submit

1. Wait for Joeri's answer on whether a listing that depends on a separately licensed engine is allowed.
   Agensi's rules ban links to paid versions sold elsewhere and licence keys delivered outside Agensi, and the
   skill's install steps mention that the engine needs a paid licence after 30 days.
2. Try the zip in your own agent (the form's own advice); name in the listing only the agents you have tried.
3. Connect a payout method and finish the identity check: a paid listing cannot go live without them.
4. The name `photo-equation-solver` must be unique on Agensi; the form will tell you.
