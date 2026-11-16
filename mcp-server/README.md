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

Exit code 1 means the solver could not solve the input; the text says why.

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
