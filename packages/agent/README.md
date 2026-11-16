# Photo Equation Solver: agent edition

An exact, offline maths engine packaged as an agent skill for **capable agents**: Claude Code, Cursor, GitHub
Copilot, Gemini CLI, Codex CLI, Antigravity and other agents that load a `SKILL.md` folder or speak MCP.
The agent reads the maths; the engine calculates it exactly, so results do not depend on the model's arithmetic.

> **Licence:** proprietary, see `LICENSE`. The source is readable and you may try it for 30 days; use beyond that
> needs a paid licence.

## What is in the folder

| Path | What it is |
|---|---|
| `SKILL.md` | The instructions the agent loads (about 700 tokens): how to call the engine, the workflow, checking a student's work. |
| `reference/cheatsheet.md` | Every command family with an example, loaded on demand. All of it is tested. |
| `scripts/bin/cli.js` | Command line: `node scripts/bin/cli.js "x^2 - 5x + 6 = 0"`. |
| `scripts/bin/server.js` | The same engine as an MCP server over stdio (tools `solve` and `help`). |
| `scripts/lib/` | The engine (`solver.cjs`) and the MCP protocol layer. No network access, no dependencies. |

Requires Node 18 or newer.

## Install

Agents that read the `SKILL.md` format load a folder placed in their skills directory. For Claude Code that is
`~/.claude/skills/` (for all projects) or `.claude/skills/` in a project; for Antigravity, Google's codelab uses
`.agents/skills/` in a project. For other agents see their documentation, because locations differ between tools
and versions.

For agents that use MCP rather than skills, or in addition to them:

```
claude mcp add photo-equation-solver -- node /absolute/path/to/photo-equation-solver-agent/scripts/bin/server.js
```

Most other hosts take the same server as a block in their `mcpServers` settings:

```json
{
  "mcpServers": {
    "photo-equation-solver": {
      "command": "node",
      "args": ["/absolute/path/to/photo-equation-solver-agent/scripts/bin/server.js"]
    }
  }
}
```

Graphs are optional: run `npm install` inside `scripts/` to add the `@napi-rs/canvas` package; the graph commands
then return a PNG (MCP image content, or a file with `--png`).

## Not tested everywhere

The engine and both entry points are covered by an automated test suite (a real stdio session for the MCP server,
and every command line in `SKILL.md` and the cheat sheet). It has not been run inside each of the agents named
above: if something does not load, the likely cause is the skills directory or the MCP settings file of your
particular tool.
