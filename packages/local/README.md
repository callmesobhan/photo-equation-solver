# Photo Equation Solver: local-model edition

An exact, offline maths engine packaged as an agent skill for **mid-size and large local models** (for example
Gemma 4 26B / 31B, Qwen or Llama served through Ollama or LM Studio) running inside an agent harness that can
run shell commands or call MCP tools. The model reads the maths; the engine calculates it exactly.

For a model on a phone (Gemma 4 E4B in Google AI Edge Gallery), use the Gallery skill in the main repository
instead: its instructions are under 2 KB.

> **Licence:** proprietary, see `LICENSE`. The source is readable and you may try it for 30 days; use beyond that
> needs a paid licence.

## What is in the folder

| Path | What it is |
|---|---|
| `SKILL.md` | The instructions the model loads: strict rules, a command list and examples (about 1K tokens). |
| `scripts/bin/cli.js` | Command line: `node scripts/bin/cli.js "x^2 - 5x + 6 = 0"`. |
| `scripts/bin/server.js` | The same engine as an MCP server over stdio (tools `solve` and `help`). |
| `scripts/lib/` | The engine (`solver.cjs`) and the MCP protocol layer. No network access, no dependencies. |

Requires Node 18 or newer.

## Install

Put the whole `photo-equation-solver-local` folder where your agent harness loads skills, then ask a maths question.
The location depends on the harness: check its documentation.

If your harness uses MCP tools instead of skills, point it at the server:

```json
{
  "mcpServers": {
    "photo-equation-solver": {
      "command": "node",
      "args": ["/absolute/path/to/photo-equation-solver-local/scripts/bin/server.js"]
    }
  }
}
```

(The file that holds this block depends on the host.) In that case also give the model the rules from `SKILL.md`
as a system prompt, since MCP hosts do not load skills.

Graphs are optional: run `npm install` inside `scripts/` to add the `@napi-rs/canvas` package, after which the
`plot`-style commands return a PNG.

## Not tested everywhere

The engine and both entry points are covered by an automated test suite (a real stdio session for the MCP server,
and every example in `SKILL.md`). It has not been tested inside particular agent harnesses or with particular
local models: how well a model follows the rules in `SKILL.md` has to be tried with yours.
