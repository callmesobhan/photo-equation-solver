#!/usr/bin/env node
// Photo Equation Solver as an MCP server over stdio (newline-delimited JSON-RPC). Logs go to stderr only.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const readline = require('node:readline');
const { handle } = require('../lib/mcp.js');

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

let queue = Promise.resolve();
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  queue = queue.then(async () => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    if (Array.isArray(parsed)) {
      const replies = [];
      for (const m of parsed) {
        const r = await handle(m);
        if (r) replies.push(r);
      }
      if (replies.length) write(replies);
      return;
    }
    const reply = await handle(parsed);
    if (reply) write(reply);
  });
});
