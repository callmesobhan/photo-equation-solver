# Installing the engine

The skill calls a separate program, the Photo Equation Solver engine. It runs on your own computer, needs Node.js 18 or newer (check with `node --version`), and makes no network connections when it solves something.

1. Download it. This is the only step that uses the network:

```
git clone https://github.com/callmesobhan/photo-equation-solver ~/photo-equation-solver
```

2. Check it works:

```
node ~/photo-equation-solver/mcp-server/bin/cli.js "x^2 - 5x + 6 = 0"
```

You should see `x = 2` and `x = 3`.

3. Optional, only for graphs:

```
cd ~/photo-equation-solver/mcp-server && npm install
```

## Licence of the engine

The engine is a separate program by the same author with its own licence, in the file `LICENSE` of the repository: its source is readable, it is free to evaluate for 30 days, and a paid licence from the author is needed after that. To ask for one, see https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md. This skill text is licensed to you through the marketplace you got it from.
