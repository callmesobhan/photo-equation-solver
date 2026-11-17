// Finds the solver library: next to this kit in the repository (../../mcp-server), inside a packaged copy
// (../scripts), or wherever PES_ENGINE points (the path of lib/api.js).
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadEngine() {
  const candidates = [
    process.env.PES_ENGINE,
    path.join(__dirname, '..', '..', 'mcp-server', 'lib', 'api.js'),
    path.join(__dirname, '..', 'scripts', 'lib', 'api.js'),
    path.join(__dirname, '..', '..', 'scripts', 'lib', 'api.js'),
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return require(c);
  throw new Error('The solver library was not found. Looked for:\n  ' + candidates.join('\n  ') + '\nSet PES_ENGINE to the path of mcp-server/lib/api.js.');
}

module.exports = { loadEngine };
