# Accuracy report

This page is **generated** by `node dev/accuracy-report.mjs` from a full run of the test suite (`dev/run-all.sh`). The counts below are the suite's own output; nothing is typed in by hand except the one-line description of what each test compares against.

| | |
|---|---|
| Run | 2026-11-17, about 7 minutes |
| Commit | `198c52d` |
| Result | every test passed (`ALL GOOD`) |
| Node.js | v22.22.0 |
| Python oracles | numpy 2.5.5, sympy 1.14.0, scipy 1.18.1, mpmath 1.3.0, pint 0.24.4, periodictable 2.1.0, numpy-financial 1.1.0, networkx 3.7 |

## In short

The suite recorded **33,538 checks** across 53 areas, plus 34,000 random inputs in the fuzz tests (which must never crash, hang or print garbage), and none failed. **20,214** of the checks compare the solver's answer with an independent implementation (sympy, scipy, numpy, mpmath, pint, periodictable, numpy-financial, networkx, exact rational arithmetic or brute force). Most batteries run twice with different random seeds, and the totals count both runs.

A "check" is one answer compared with its oracle, or one test condition. Different batteries count differently (an expression, an equation, a phrase, a command call), so the numbers are comparable within a row, not between rows.

## Compared with independent software or exact arithmetic

| Area | Compared with | Checks | Failed | Declined or undecided |
|---|---|---:|---:|---:|
| Property tests (arithmetic, polynomials with known roots, linear systems, quadratics, trig equations) | exact rational arithmetic (Fraction), numpy | 3,847 | 0 | – |
| Symbolic core | sympy | 593 | 0 | – |
| Calculus battery: integrals, limits, sums | sympy / scipy | 270 | 0 | – |
| Discrete maths and statistics | sympy / scipy / numpy | 3,616 | 0 | – |
| Calculus applications | sympy / scipy | 384 | 0 | – |
| Multivariable calculus | sympy | 279 | 0 | – |
| Linear programming | scipy.optimize.linprog | 160 | 0 | – |
| Laplace transforms | sympy / numerical integration | 240 | 0 | – |
| Linear algebra | sympy | 1,758 | 0 | – |
| Numerical methods (ODE steppers, quadrature rules, interpolation, splines, root finders) | exact fractions / numpy / scipy | 246 | 0 | – |
| Parametric / polar / vector calculus | sympy / scipy | 296 | 0 | – |
| Extra statistics (distributions, two-sample tests, ANOVA, descriptive measures, regressions) | scipy.stats / numpy | 638 | 0 | – |
| Recurrences, continued fractions, Pell, logic, graph theory | sympy / networkx / brute force | 379 | 0 | – |
| QR, Cholesky, definiteness, pinv, least squares, SVD, matrix exponential, Jordan form | numpy / scipy / sympy | 293 | 0 | – |
| Planes, lines, skew lines, spheres and quadric surfaces | sympy.geometry / numpy | 318 | 0 | – |
| Plot extras (slope fields, fits, histograms, box plots, shaded areas, implicit curves, contours, regions): printed numbers | numpy / scipy / exact fractions | 262 | 0 | – |
| Laplace transforms and initial value problems with unit steps and impulses | quadrature / mpmath / scipy solve_ivp | 234 | 0 | – |
| Plane geometry (circles, tangents, lines, triangle centres, transformations, hulls) | sympy.geometry | 364 | 0 | – |
| Equations with an interval for the unknown (trig, exponential, polynomial) | a fine scan + brentq and polynomials with chosen roots | 102 | 0 | – |
| Equilibria and phase portraits (phase lines, Jacobian types of planar systems, linear classification) | sympy exact trace / determinant signs | 191 | 0 | – |
| Regression inference and rank / exact tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis, sign, Fisher, McNemar) | scipy.stats | 223 | 0 | – |
| Fourier series (piecewise, \|x - c\|, half-range) coefficients | adaptive quadrature | 88 | 0 | – |
| Precalculus helpers (sinusoids, independence / span, rational zeros, end behaviour, parity, coefficients, range of a function) | closed forms and sympy | 272 | 0 | – |
| Applications of multiple integrals (lamina, solid, polar / cylindrical / spherical, surface area, flux) and the theorems of Green, Gauss and Stokes | sympy / scipy and the other side of each theorem | 126 | 0 | – |
| Textbook helpers (linear approximation, MVT / Rolle / IVT, patterned series, distribution moments, probability sentences, counting phrases, radians, combined fractions) | sympy / mpmath / scipy / fractions | 457 | 0 | – |
| Algebra helpers (discriminant, completing the square, vertex, logarithm laws, sets, digits in bases up to 36, binomial terms, ratios, scientific notation, confidence intervals from summary numbers) | sympy / python sets / int(s, base) / scipy | 971 | 0 | – |
| Statistics sentences (P(a < X < b) for normal / binomial / Poisson / geometric, percentiles, t / z / proportion tests from summary numbers, ordered draws) | scipy.stats and fractions | 408 | 0 | – |
| Geometry, units, chemistry, finance, complex numbers | pint / periodictable / numpy-financial | 2,505 | 0 | – |
| Elements, electron configurations, empirical formulas, stoichiometry, acids, gases; amortization, bonds, depreciation | periodictable / mendeleev data / numpy-financial | 694 | 0 | – |

## Checked against itself, by construction, or by numerical scans

| Area | Compared with | Checks | Failed | Declined or undecided |
|---|---|---:|---:|---:|
| Hand-written cases | answers written by hand beforehand | 1,013 | 0 | – |
| Documentation | the skill's own examples, and the built-in help for every command | 169 | 0 | – |
| Fuzz: random garbage input | no oracle: it must never crash, hang or print garbage | 4,000 | 0 | – |
| Fuzz: every command with random arguments | no oracle: it must never crash, hang or print garbage | 30,000 | 0 | – |
| Differential equations | substituting every answer back into its equation | 889 | 0 | 77 |
| Series convergence and radius of convergence | known theory for the standard families | 502 | 0 | 21 |
| Plain-English phrasings | the command each phrase stands for (must give exactly the same answer) | 4,414 | 0 | – |
| Exact surds and trigonometry | exact values, and equivalence at random points | 957 | 0 | – |
| Worksheet noise (labels, bullets, trailing instructions) | the clean answer of the same case (must not change) | 957 | 0 | – |
| Random limits, Taylor polynomials, definite integrals and sums | numerical evaluation | 709 | 0 | 14 |
| Random equations and inequalities | a numerical scan of the original equation | 316 | 0 | – |
| Random rational functions (partial fractions, integrals, inverse Laplace) | numerical evaluation at random points | 572 | 0 | – |

## The packages and interfaces

| Area | Compared with | Checks | Failed | Declined or undecided |
|---|---|---:|---:|---:|
| The Google AI Edge Gallery page | real Chromium, offline, called the way the app calls it (graphs and answer cards included) | 38 | 0 | – |
| Photo kit (typed form of ten handwritten test items) | the expected answers | 10 | 0 | – |
| MCP server | a real stdio session, and the Gallery page (every hand-written case must give the same text) | 1,041 | 0 | – |
| Embedding library | every hand-written case must split into fields and print back to the same text; TypeScript declarations compiled | 1,013 | 0 | – |
| Teacher kit | a second method (substitution, finite differences, quadrature) and a mutation test of the working checker | 619 | 0 | – |
| Gallery skill folder and zip | the structure the app needs | 1 | 0 | – |
| Package documentation | every command line in the package documents must run | 98 | 0 | – |
| Local and Agent skill packages | structure, size, security-scan hygiene and smoke tests of the assembled copies | 2 | 0 | – |
| Text-only marketplace package | structure, scan hygiene, and a simulated buyer install | 1 | 0 | – |
| Claude Code bundle | the installer run in a scratch home (install, reinstall, refuse a foreign folder, uninstall) | 1 | 0 | – |
| Teacher kit package | the unzipped copy run from its own folder | 1 | 0 | – |
| Licence copies | the LICENSE at the root (must be identical) | 1 | 0 | – |

"Declined or undecided" counts inputs where the solver (or the checker) gave no verdict rather than guess: a refusal is not counted as an error, and it is not counted as agreement either. Random garbage input in the fuzz tests is expected to be refused, so those rows show a dash.

## What this does not show

- **It is not a proof.** Random testing samples the space of inputs; it does not cover it. Two programs that agree on thousands of inputs can still both be wrong on one the tests did not reach.
- **The oracles are other people's software.** sympy, scipy and the rest have bugs too. Agreement between two independent implementations is strong evidence, not certainty. Where there is no second implementation, the table says what the answer was checked against (substitution, a numerical scan, known theory).
- **Reading a photograph is not tested here.** A model reads the picture and writes the maths as text; the solver then echoes how it understood that text ("Read as:") so a misreading is easy to see. How well a model reads your handwriting is a property of the model and the picture. The repository has been tried on an iPhone with Gemma 4 E4B in Google AI Edge Gallery, with typed problems and simulated handwriting; see the Status section of the [README](../README.md).
- **Agents and hosts.** The Local and Agent packages and the MCP server are covered by automated tests (a real stdio session, every documented command line). They have not been run inside every agent product or with every local model.
- **Decimals are approximate.** Exact answers (fractions, radicals, symbolic forms) are exact. Decimal values are printed to about 8 significant digits, and the numerical batteries compare within a stated tolerance.
- **Counts are per commit.** This report describes the commit named above. Run the suite again after any change.

## Reproduce it

```
pip install -r dev/tests/requirements.txt      # the Python oracles (optional: those batteries are skipped without them)
cd dev && ./run-all.sh                          # builds, then runs every test (about 8 minutes)
node dev/accuracy-report.mjs                    # runs the suite and writes this page (refuses if anything failed)
```
