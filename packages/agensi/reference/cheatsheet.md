# Cheat sheet

Each line is one call: `node ~/photo-equation-solver/mcp-server/bin/cli.js "<line>"`. A leading `--for x` goes before the quotes. The part after `  #` is a comment.
Every line in this file is run by the test suite. For anything not here: `help <area>`.

## Calculus

```
integrate(x^2, x)                       # antiderivative, checked by differentiating
integrate(x*e^x, x, 0, 1)               # definite integral, exact
integrate(1/(1+x^2), x, 0, oo)          # improper (oo = infinity)
diff(x^3*sin(x), x)                     # derivative
diff(x^4, x, 2)                         # second derivative
limit(sin(x)/x, x, 0)
limit((1+1/x)^x, x, oo)
taylor(e^x, x, 0, 5)
sum(1/k^2, k, 1, oo)
tangent(x^2, x, 3)
critical(x^3 - 3x, x)                   # extrema
analyze(x^3 - 3x, x)                    # domain, intercepts, asymptotes, monotonicity, concavity
areabetween(x, x^2, x)
volumerev(x^2, x, 0, 1)
arclength(x^2, x, 0, 1)
newton(x^2 - 2, x, 1)
```

## Differential equations and series

```
y' + 2y = e^x
y'' - 3y' + 2y = 0, y(0) = 1, y'(0) = 0
x' = 3x + y; y' = x + 3y
laplace(sin(2t), t)
ilaplace(1/(s^2+1), s)
convergence(n^2/2^n, n)
fourier(x^2, x, -pi, pi)
```

## Several variables

```
grad(x^2*y, x, y)
critical(x^3 - 3*x*y + y^3, x, y)
integrate(integrate(x*y, y, 0, x), x, 0, 2)
```

## Algebra

```
factor(x^4-1)
expand((x+1)^5)
simplify(sin(2x)/sin(x))
apart(1/(x^2-1))
gcd(12, 18)
rationalize(1/(sqrt(3)+1))
trigexpand(cos(3x))
discriminant(x^2 - 4x + 7)
completesquare(x^2 + 6x + 2)
vertex(2x^2 - 8x + 5)
(3+4i)(1-2i)
ratroots(2x^3 - 3x^2 - 8x - 3)
```

## Equations and inequalities

```
2x^2 - 5x + 3 = 0
x + y = 10; x - y = 2
x^2 - 5x + 6 >= 0
cos(x) = 0.5, 0 <= x <= 2pi
--for t v = u + a*t
maximize 3x + 2y subject to x + y <= 4, x, y >= 0
x^2/4 + y^2/9 = 1
```

## Matrices and vectors

```
det([[1,2],[3,4]])
inv([[1,2],[3,4]])
eigen([[2,1],[1,2]])
rref([[1,2],[3,4]])
linsolve([[2,1],[1,3]], [3,5])
dot([1,2,3],[4,5,6])
cross([1,0,0],[0,1,0])
```

## Numbers, counting, sets, logic

```
isprime(97)
factor(360)
17 mod 5
3x ≡ 4 (mod 7)
ncr(10,3)
factorial(8)
sequence(2,6,12,20)
union([1,2,3],[2,3,4])
truth table of p and (q or not r)
```

## Statistics and probability

```
mean(2,4,4,5)
stdev(2,4,4,5)
linreg([1,2,3],[2,4,7])
binompdf(10,0.5,3)
normalcdf(-1, 1, 0, 1)
invnorm(0.975)
tinterval(52,4,25,0.95)
ttest(52, 4, 25, 50)                    # sample mean, s, n, hypothesised mean
chisqtest([[10,20],[30,40]])
ttest2([5,6,7,8,9],[3,4,5,6,9])
bayes(0.3, 0.8, 0.1)
```

## Geometry

```
circle(5)
cone(3,4)
triangle(a=3, b=4, C=60)
distance([1,2],[4,6])
linecircle(y = x + 1, x^2 + y^2 = 25)
```

## Chemistry, finance, units, physics

```
molarmass(Ca(OH)2)
balance H2 + O2 -> H2O
compound(1000, 5%, 10)
loan(200000, 6.5, 30)
bond(1000, 5%, 6%, 10, 2)
convert 5 km to miles
suvat(u=0, a=9.8, t=3)
```

## Graphs (need the optional canvas package: see install.md)

```
plot(x^2, x, -5, 5)
histogram([2,3,3,4,5,7,8,9], 2)
scatter([1,2,3,4],[2,4,5,8])
```

## Plain English

```
find the derivative of x^3 + 2x
integrate x^2 from 0 to 1
area of a circle with radius 3
mean of 2, 4, 6, 8
1 + 2 + 3 + ... + 100
X is normal with mean 100 and sd 15, find P(85 < X < 115)
```
