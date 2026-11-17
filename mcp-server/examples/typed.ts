// Example: the same library from TypeScript. The declarations are in ../lib/api.d.ts.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
import { solve, solveMany, help, Result, SolveOptions } from 'photo-equation-solver-mcp';

/** One line per answer, or the reason it failed. */
function summary(r: Result): string {
  if (r.kind === 'multiple' && r.problems) return r.problems.map((p) => `${p.index}: ${summary(p)}`).join('\n');
  if (!r.ok) return `could not solve: ${r.error ?? 'unknown'}`;
  return r.answer.join('; ') + (r.needsReview ? '  (please check the picture)' : '');
}

async function main(): Promise<void> {
  const options: SolveOptions = { solveFor: 'y' };
  const r: Result = await solve('3x + 2y = 12', options);
  const lines: string[] = r.answer;
  console.log(summary(r), lines.length, r.working.length, r.picture === null);

  const batch: Result[] = await solveMany(['1+1', '2x = 6']);
  console.log(batch.map(summary).join('\n'));

  const h = await help('finance');
  console.log(h.topic, h.text.length);
}

main();
