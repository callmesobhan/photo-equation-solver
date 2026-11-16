// Concatenates src/*.js into one self-contained index.html (no external resources).
// All non-ASCII characters are written as \uXXXX escapes so the file is pure ASCII and
// renders identically no matter which charset the host assumes.
// Usage: node build.mjs [output index.html] [--expose]
// Default output: ../photo-equation-solver/scripts/index.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSources } from './lib-body.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(here, '..', 'photo-equation-solver', 'scripts', 'index.html');
const expose = process.argv.includes('--expose');

const { body, names } = readSources();

// For the tests only (--expose): export every top-level function / class / const of the page.
const testHook = expose ? '\nwindow.__test = { ' + [...new Set(names)].join(', ') + ' };' : '';

const html = `<!--
  Photo Equation Solver - AI Edge Gallery skill script.
  Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE in the repository.
  Fully self-contained: no network access, no external libraries.
  The model reads the equation from the photo; this page does the maths exactly.
-->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photo Equation Solver</title>
  </head>
  <body>
    <script>
(function () {
'use strict';
${body}${testHook}
})();
    </script>
  </body>
</html>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB');
