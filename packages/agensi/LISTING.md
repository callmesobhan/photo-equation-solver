# Copy for the Agensi listing form (not part of the zip)

Version 1.0.0 of this listing is live. This file holds the copy for **version 1.1.0, which adds the teacher kit**.
"Updating the live listing" at the end says what to do on the website. Nothing in this file has been changed on
Agensi yet.

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

Exact, offline maths for your agent. Equations, calculus, matrices, statistics, finance, geometry, units and chemistry are calculated by a local engine, not guessed by the model. Includes a teacher kit: worksheets with answer keys, and a student-working checker.

## Description (Markdown)

Language models are good at explaining maths and unreliable at calculating it. This skill sends the calculating to an exact engine that runs on your own computer, and keeps the model for reading the problem and explaining the result.

**What you get, and what you don't**

This listing is free. You get the skill itself: instructions that teach your agent how to use the maths engine (how
to write a problem, how to read the result, when to ask for syntax help), a command cheat sheet, the install steps,
and instructions for the teacher kit. These are four text files.

You do **not** get the engine or the teacher kit. They are separate programs, which you download once, together, from
the author's GitHub repository (the install steps show how; it needs Node.js 18 or newer). They have their own
licence: free to read and to evaluate for 30 days, paid after that. **Using the teacher kit for teaching, assessment
or grading needs a paid licence even during the 30 days.** To ask for a licence, see the licensing page, which has a
short request form: https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md

**What it does**

- Solves equations, systems and inequalities, with exact answers: fractions, radicals, symbolic forms.
- Integrals, derivatives, limits, series, differential equations, Laplace transforms.
- Matrices and vectors: determinants, inverses, eigenvalues, linear systems.
- Probability and statistics: distributions, t, chi-square and other tests, confidence intervals, regression.
- Finance (loans, bonds, interest), geometry, unit conversion, chemistry (molar mass, balancing), physics formulas.
- Teacher kit: makes worksheets with answer keys (eight topics, three levels, the same seed gives the same sheet), and checks a student's working line by line, naming the first wrong step.
- Reads maths from a photo (your agent reads the picture; the engine solves what it read and echoes how it was read).

**The teacher kit**

- *Worksheets.* Choose topics (linear and quadratic equations, systems, inequalities, derivatives, definite integrals, fractions, determinants), a level and a number of problems. It writes a printable page with an answer key on its own page. Every answer comes from the exact engine and is kept only if it agrees with an answer the generator worked out independently when it built the problem. `--variants` gives each group its own version, and the seed makes any sheet reproducible.
- *Checking working.* Give it a problem and a student's steps. It marks each line `ok` or `WRONG`: a line in one unknown is right when it has the same solutions as the line above, an expression when it equals the line above. A step that adds a solution (squaring both sides) is marked `extra`, not wrong, and a line it cannot compare is marked `unknown`, never right or wrong.

**How it works**

The skill gives your agent the rules for using the engine: how to write a problem, how to read the result, and when to ask for syntax help. The engine itself is a separate program that you install once (three short commands, in the skill's install steps). It needs Node.js 18 or newer. It runs offline: it makes no network connection when it solves something.

**Where it stops**

- The engine is a separate program with its own licence. Its source is readable; it is free to evaluate for 30 days and paid after that. The licence is in the repository, and it stays between you and its author. To ask for one, see https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md.
- It does not replace understanding: an agent can still misread a photo. The result always starts with a "Read as" line so you can check what was understood.
- Graphs need one optional package.
- The teacher kit judges whether steps are equivalent, not the method a student used, and cannot read words or handwriting. It has eight worksheet topics. It has automated tests, including a test that corrupts steps on purpose and checks each is found, but it has not yet been tried in a real classroom.
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

Request: "Make me a worksheet with two quadratics and two systems, with an answer key."

The agent runs the teacher kit (`worksheet.js --topics quadratic,system --level 2 --count 4 --seed 7`), which writes a printable page. The questions and the key it printed:

```
1. Solve for x.                                  2x² + 6x − 36 = 0
2. Solve the system of equations for x and y.    −3x − 4y = 18   and   3x − 3y = 3
3. Solve for x.                                  −x² + 2x + 15 = 0
4. Solve the system of equations for x and y.    −3x − 4y = −15  and   −4x − 2y = −10

Answer key
1. x = -6  ·  x = 3
2. x = -2, y = -3
3. x = -3  ·  x = 5
4. x = 1, y = 3
```

Request: "A student solved x² − 5x + 6 = 0 like this: (x − 2)(x − 3) = 0, then x = 2. Where did it go wrong?"

```
Problem: x^2 - 5x + 6 = 0
The solver's answer to the problem: x = 2, x = 3

 1. x^2 - 5x + 6 = 0     start   the problem
 2. (x - 2)(x - 3) = 0   ok      same solutions as the line above
 3. x = 2                WRONG   it loses x = 3 that the line above has

Step 3 is the first line that is not equivalent to the line before it.
The last line is missing x = 3, which solves the problem.
```

(Output of the teacher kit.)

## Compatibility note

Requires Node.js 18+ and the Photo Equation Solver engine, which includes the teacher kit (installed separately, in one download; see the install steps in the skill). Nothing else is needed.

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
- **Can I use the teacher kit in my class?** Teaching, assessment and grading need a paid licence, even during the 30-day trial; the trial is only for deciding whether to buy, on your own computer. Ask through the licensing page above.
- **Can the checker tell me whether a student used the right method?** No. It judges whether each line is mathematically equivalent to the line before it. It cannot read words ("add 3 to both sides"), pictures or handwriting: a photographed working has to be transcribed line by line first.
- **Can the worksheet answers be wrong?** Each is computed by the exact engine and kept only if it agrees with an answer the generator worked out independently; if the two ever disagreed, that problem would be dropped. Whether a problem suits your class is for you to judge.

## Docs link

https://github.com/callmesobhan/photo-equation-solver

(The licensing page is https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md, and may be mentioned in the description.)

## Price

Free. (Agensi declined a paid listing for a skill that depends on a separately licensed engine.)

## Updating the live listing

Agensi's rules (docs.agensi.io pages "Update your skill" and "Review and approval"): a new ZIP is a new version; it gets
the same security scan; if there are no failed checks, the AI review approves and no red flags show, it is approved
automatically, otherwise a person looks at it. The live version keeps serving buyers until the update is approved. Text
edits to the listing need no new version and go live at once.

1. Sign in, then Creator Studio -> Skills, open the listing, and open its edit page.
2. Upload the new ZIP, `photo-equation-solver-agensi.zip` (four text files, version 1.1.0 in its `SKILL.md`). The form
   fills in the next version number; it must be higher than 1.0.0, and it cannot be changed once uploaded.
3. Paste the changelog below (up to 2,000 characters).
4. Replace the listing text with the sections above (summary, description, see it in action, compatibility note,
   limitations and FAQ). Check the tags: `teaching` and `worksheets` were added.
5. Save. The update shows as pending; the text edits are live straight away, the new ZIP once approved.
6. Check the live page afterwards: it should show the changelog once there are two versions.

Changelog for version 1.1.0:

```
Adds the teacher kit. The skill now has instructions for making worksheets with answer keys (eight topics, three
levels, reproducible from a seed) and for checking a student's working line by line, naming the first wrong step.
The kit comes in the same download as the engine, so installing the engine as before is enough; owners of an older
copy update with git pull. Teaching use needs a licence from the author: the skill tells the agent to say so first.
New file: reference/teacher-kit.md. Changed: SKILL.md (description, tags, step 4), reference/install.md.
```

Before you press Save:

- No checkout links and no licence keys in the listing. Links to the repository and its licensing page are fine
  (confirmed by Agensi by email).
- The listing still names only the agent you have tried: Claude Code.
- The teacher kit has not been tried in a classroom; the limitations section says so. Keep it.
- Taking a listing down once people have it means emailing info@agensi.io.
