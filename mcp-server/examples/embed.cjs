// Example: using the solver inside your own program (Node 18+, no other packages).
//   node examples/embed.cjs
// In your own project: const { solve } = require('photo-equation-solver-mcp');   (see ../README.md, "As a library")
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { solve } = require('../lib/api.js');

const problems = [
  '2x^2 - 5x + 3 = 0',
  'integrate(x^3*sin(x), x, 0, pi)',
  'foo bar baz', // not maths: shows how a failure comes back
  'x/x + 1 = 3', // reads without a fraction bar: the solver doubts it, and says so
];

(async () => {
  for (const input of problems) {
    const r = await solve(input); // never throws: a failure is a result with ok === false
    console.log('Input:    ' + input);
    if (!r.ok) {
      console.log('          could not be solved: ' + r.error.split('. ')[0]);
      continue;
    }
    console.log('Read as:  ' + r.readAs); // show this to the user: a misread shows up here
    for (const line of r.answer) console.log('Answer:   ' + line);
    if (r.check) console.log('Check:    ' + r.check);
    if (r.needsReview) console.log('REVIEW:   the solver doubts how this was read: ' + r.notes[0].split('.')[0]);
  }
})();
