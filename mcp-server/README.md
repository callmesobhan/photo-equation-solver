# Photo Equation Solver as an MCP server

The same exact, offline maths engine that runs inside the Google AI Edge Gallery skill, for agents and
editors that speak the Model Context Protocol (MCP), plus a command line tool for agents that run shell
commands. No network access, no API key, no dependencies (graphs use one optional package).

> **Licence:** proprietary, see [`LICENSE`](LICENSE). The source is readable; use beyond a 30-day
> evaluation needs a paid licence.

## What it offers

| Tool | What it does |
|---|---|
| `solve` | `equation` (required) and optional `solve_for`. Exact answers with working and a check: equations, systems, inequalities, calculus (integrals, derivatives, limits, series, differential equations, Laplace), matrices, number theory and counting, probability and statistics, geometry, units, finance, chemistry, physics formulas, graphs. |
| `help` | Optional `topic`. Lists the commands of an area (`finance`, `stats`, `calculus`, `matrix`, ...) with an example of each. |

A failed `solve` is a tool error whose text names the help topic to read, so a model can recover on its own.
A result that says `Note: Check the picture` means the input was probably misread (for example `x/x`, or a
bond running for 1000 years): the model should recheck what it sent.

## Run it

Node 18 or newer. From a copy of this folder:

```
npm install        # optional: only needed for graphs (installs @napi-rs/canvas)
node bin/server.js # speaks MCP over stdin/stdout
```

Add it to a host. Claude Code:

```
claude mcp add photo-equation-solver -- node /absolute/path/to/mcp-server/bin/server.js
```

Most other hosts (Claude Desktop, Cursor, Gemini CLI, LM Studio, Antigravity and others) read the same `mcpServers`
block from a JSON settings file; where that file lives depends on the host, so check its documentation:

```json
{
  "mcpServers": {
    "photo-equation-solver": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/bin/server.js"]
    }
  }
}
```

## Command line

```
node bin/cli.js "x^2 - 5x + 6 = 0"
node bin/cli.js --for t "v = u + a*t"
node bin/cli.js --png graph.png "plot(x^2, x, -3, 3)"
node bin/cli.js --json "det([[1,2],[3,4]])"
node bin/cli.js help finance
```

Exit code 1 means the solver could not solve the input (or, for several numbered problems, one of them); the text says why.
`--json` prints the fields described under "As a library" below, as one JSON object.

## As a library

For programs that embed the solver (an app, a grader, a worksheet tool), `require('photo-equation-solver-mcp')`
gives structured results instead of printed text. Node 18 or newer, no other packages, no network.

```js
const { solve } = require('photo-equation-solver-mcp');

const r = await solve('2x^2 - 5x + 3 = 0');
r.ok;          // true
r.readAs;      // "2x² - 5x + 3 = 0"   how it was understood: show this to the user
r.answer;      // ["x = 1", "x = 3/2 (= 1.5)"]
r.working;     // ["Type: quadratic equation", ...]
r.check;       // "substituting each solution back into the original equation gives equal sides"
r.notes;       // things to be aware of
r.needsReview; // true when the solver doubts how the input was read
r.text;        // everything, exactly as the command line prints it
```

| Call | Returns |
|---|---|
| `solve(input, { solveFor })` | one `Result`. `input` may be an equation, an expression, a command such as `integrate(x^2, x, 0, 3)`, a short English question, or several problems numbered `1)` `2)`, one per line (then `r.kind === 'multiple'` and `r.problems` holds one result each). Never throws: a failure is a result with `ok: false` and the reason in `error`. |
| `solveMany([...], { solveFor })` | an array of `Result`, one per input, in order |
| `help(topic)` | `{ ok, topic, text }`: the syntax help for an area, or the list of areas |

Types are in [`lib/api.d.ts`](lib/api.d.ts) (`Result`, `SolveOptions`); [`examples/embed.cjs`](examples/embed.cjs) and
[`examples/typed.ts`](examples/typed.ts) are small programs that use them. The solver runs on the calling thread, so a
hard problem blocks the event loop until it finishes: use a worker thread or a child process if your program must stay
responsive. Putting the library into a product you distribute, or behind a service others use, is not covered by the
evaluation terms: see [`LICENSING.md`](../LICENSING.md).

## Graphs

With the optional package `@napi-rs/canvas` installed, `plot`, `contour`, `scatter`, `histogram` and the other
graph commands return a PNG image (as MCP image content, or a file with `--png`). Without it they say that no
picture was drawn. Set `PES_NO_CANVAS=1` to turn the canvas off.

## Notes for small local models

The `solve` tool description is about 350 tokens and is sent with every request. A model with a very small
context window (for example Gemma 4 E4B on a phone) is better served by the Gallery skill in this repository,
whose `SKILL.md` is under 2 KB.

## How it is built and tested

`lib/solver.cjs` is generated from `dev/src` by `dev/build-node.mjs`: the same source as the Gallery page,
without the page. `dev/tests/mcp-test.mjs` runs a real stdio session (initialise, list, call, errors; stdout
must be JSON lines only and stderr empty) with and without a canvas, and checks that every hand-written case gives
the same text through this module as through the Gallery page.
`dev/tests/api-test.mjs` tests the library: every hand-written case must split into fields with nothing left over and
print back to exactly the text the solver printed; it also covers the shapes (several problems, refusals, help,
`solveFor`, bad arguments), the `--json` output, the TypeScript declarations (compiled under `--strict`, and a wrong use
must be rejected) and the example program.
