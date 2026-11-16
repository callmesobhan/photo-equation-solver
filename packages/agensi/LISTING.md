# Copy for the Agensi upload form (not part of the zip)

Fill the form at agensi.io/dashboard/submit with the fields below. Nothing here has been submitted. Read the
"Before you submit" list at the end first.

Status: Agensi (Joeri Brons, by email) will not accept a paid listing for a skill that needs a separately installed,
separately licensed engine. A free text-only listing that points to the repository IS acceptable, if it has the
"Requires" line and states plainly in the description that the engine has its own licence: free to evaluate for 30
days, paid after that. This copy follows that.

Update: Joeri then confirmed that links to your GitHub, your site or a commercial licence page are fine in the
description, and so is a licence note saying how to get in touch with you. The listing must still be clear about what
the buyer gets. This copy now has a "What you get" section and links the repository's LICENSING.md.

## Name (up to 60 characters, unique on Agensi)

Photo Equation Solver: exact maths for your agent

## Summary (up to 300 characters)

Exact, offline maths for your agent. Equations, calculus, matrices, statistics, finance, geometry, units and chemistry are calculated by a local engine, not guessed by the model.

## Description (Markdown)

Language models are good at explaining maths and unreliable at calculating it. This skill sends the calculating to an exact engine that runs on your own computer, and keeps the model for reading the problem and explaining the result.

**What you get, and what you don't**

This listing is free. You get the skill itself: instructions that teach your agent how to use the maths engine (how
to write a problem, how to read the result, when to ask for syntax help), a command cheat sheet, and the install
steps. These are three text files.

You do **not** get the engine. It is a separate program, which you download once from the author's GitHub repository
(the install steps show how; it needs Node.js 18 or newer). The engine has its own licence: it is free to evaluate for
30 days and paid after that. To ask for a licence, see the licensing page, which has a short request form:
https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md

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

- The engine is a separate program with its own licence. Its source is readable; it is free to evaluate for 30 days and paid after that. The licence is in the repository, and it stays between you and its author. To ask for one, see https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md.
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
- **Do I pay for the engine?** It is free to evaluate for 30 days and paid after that, under its own licence. This listing is free. To ask for a licence, use the request form described at https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md.

## Docs link

https://github.com/callmesobhan/photo-equation-solver

(The licensing page is https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md, and may be mentioned in the description.)

## Price

Free. (Agensi declined a paid listing for a skill that depends on a separately licensed engine.)

## Before you submit

1. Decide whether you want a free listing at all. It is a way to be found; it earns nothing on Agensi, and the
   engine's licence is sold by you, directly.
2. The route for asking for a licence now exists (LICENSING.md and the issue form are in the repository), and Agensi
   confirmed that linking it and a contact note are fine. Still: no checkout links and no licence keys in the listing.
3. Try the zip in a second agent (the form's own advice) and name in the listing only the agents you have tried. So far:
   Claude Code. (Antigravity is planned.)
4. A free listing needs no payout setup and no identity check.
5. Taking a listing down once people have it means emailing info@agensi.io (the docs say skills that someone has
   bought can't be deleted from Creator Studio).
6. The name `photo-equation-solver` must be unique on Agensi; the form will tell you.
