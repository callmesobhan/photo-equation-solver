---
name: photo-equation-solver-local
description: Exact, offline maths engine. Use for any request to solve, calculate, simplify, differentiate, integrate, convert or check maths (equations, calculus, matrices, statistics, finance, geometry, units, chemistry), or to read maths from an image. Do not calculate yourself: run the tool.
---

# Exact maths engine

You READ the maths and the tool CALCULATES it. Never solve, check or estimate it yourself, not even to double-check.

## Run it

From this skill's folder: `node scripts/bin/cli.js "<the maths>"`. If you have the MCP tools `solve` and `help`, call those with the same text instead.

- Exit code 1 means it could not solve. Read the message, fix the input, try once more. After two failures, tell the user what you tried.
- Unsure how to write something? `node scripts/bin/cli.js help` lists the areas and `node scripts/bin/cli.js help finance` gives the exact syntax for one.

## Rules

1. One problem per call. The equations of one system are separated by `;`.
2. Ordinary notation: `x^2`, `sqrt(x)`, `pi`, `abs(x)`, `e^x`. Write `2*x` if unsure. A fraction needs brackets round the WHOLE top and the WHOLE bottom: `(x+1)/(x-1)`.
3. Do not simplify or solve first. Do not add words like "solve".
4. Money, statistics, chemistry, units, geometry: do NOT write your own formulas or sums. Run `help` for that area first and use the command it shows.
5. Your reply is the tool's "Read as" line and "Answer" lines, copied exactly. Never change a digit. Show "Working" only if asked.
6. A line `Note: Check the picture` means the input was probably misread: recheck it and run again.
7. Unclear picture: ask for a clearer one. Never guess a digit.

## Commands

```
integrate(x*e^x, x, 0, 1)               # oo = infinity
diff(x^3*sin(x), x)
limit(sin(x)/x, x, 0)
taylor(e^x, x, 0, 5)
sum(1/k^2, k, 1, oo)
critical(x^3 - 3x, x)
analyze(x^3 - 3x, x)
y'' - 3y' + 2y = 0, y(0) = 1, y'(0) = 0
laplace(sin(2t), t)
factor(x^4-1)
expand((x+1)^5)
simplify(sin(2x)/sin(x))
discriminant(x^2 - 4x + 7)
2x^2 - 5x + 3 = 0
x + y = 10; x - y = 2
cos(x) = 0.5, 0 <= x <= 2pi
--for t v = u + a*t
det([[1,2],[3,4]])
inv([[1,2],[3,4]])
eigen([[2,1],[1,2]])
linsolve([[2,1],[1,3]], [3,5])
isprime(97)
ncr(10,3)
mean(2,4,4,5)
binompdf(10,0.5,3)
normalcdf(-1, 1, 0, 1)
tinterval(52,4,25,0.95)
triangle(a=3, b=4, C=60)
molarmass(Ca(OH)2)
compound(1000, 5%, 10)
loan(200000, 6.5, 30)
bond(1000, 5%, 6%, 10, 2)
convert 5 km to miles
```

## Examples

- 2x² − 5x + 3 = 0 → `node scripts/bin/cli.js "2x^2 - 5x + 3 = 0"`
- ∫₀¹ x eˣ dx → `node scripts/bin/cli.js "integrate(x*e^x, x, 0, 1)"`
- x + 1 over x − 1, equals 3 → `node scripts/bin/cli.js "(x+1)/(x-1) = 3"`
- 3x + 2y = 12, solve for y → `node scripts/bin/cli.js --for y "3x + 2y = 12"`
- A bond: face value 1000, 5% coupon twice a year, 10 years, yield 6% → `node scripts/bin/cli.js help finance`, then `node scripts/bin/cli.js "bond(1000, 5%, 6%, 10, 2)"`
