# Teacher kit: worksheets, answer keys, and checking a student's working

The teacher kit is part of the same download as the engine, in the folder `~/photo-equation-solver/teacher-kit`. It needs Node.js 18+ and nothing else, and makes no network connections.

## Licence: say this before using it for a class

Using the kit for teaching, assessment or grading needs a paid licence from its author, even during the 30-day trial (the trial is only for deciding whether to buy). If the user wants it for a class, a school or a tutoring business, tell them so first and point them to https://github.com/callmesobhan/photo-equation-solver/blob/main/LICENSING.md. Trying it on their own computer to decide whether to buy is fine.

## First use

```
test -f ~/photo-equation-solver/teacher-kit/bin/worksheet.js && echo found
```

If it does not print `found`, the user's copy of the engine is older than the kit. Do not update it yourself: tell the user, and show them `git -C ~/photo-equation-solver pull`.

## Making a worksheet

```
node ~/photo-equation-solver/teacher-kit/bin/worksheet.js --topics linear,quadratic --level 2 --count 10 --seed 7 --out sheet.html
node ~/photo-equation-solver/teacher-kit/bin/worksheet.js --list
```

- Topics: `linear`, `quadratic`, `system`, `inequality`, `derivative`, `integral`, `fractions`, `determinant` (`all` for every topic). Levels 1 to 3.
- The same `--seed` makes the same worksheet again. `--variants 3` makes versions A, B and C. `--no-key` leaves out the answer key, `--working` adds the engine's working steps to it, `--format md` or `json` changes the format.
- The file is HTML: the user opens it in a browser and prints it to PDF. The answer key starts on its own page.
- Every answer comes from the engine and is kept only if it agrees with the answer the generator worked out itself. Copy answers exactly; never recompute them.

## Checking a student's working

```
node ~/photo-equation-solver/teacher-kit/bin/check-working.js --problem "2(x + 3) = 14" --step "2x + 6 = 14" --step "2x = 20" --step "x = 10"
```

Or put the problem on the first line of a text file and one step per line, then `node ~/photo-equation-solver/teacher-kit/bin/check-working.js working.txt`. A line starting with `=` continues an expression.

Each line is marked `ok`, `WRONG`, `extra` or `unknown`. A line in one unknown is judged by whether it has the same solutions as the line above; an expression, by whether it equals the line above. Exit code 0: every step valid. 1: a wrong step. 3: some line could not be compared.

- Report the first `WRONG` line and quote the reason the kit gives. Do not add your own verdict on lines it marked `ok` or `unknown`.
- `extra` means the step added a solution (squaring both sides can do that): tell the student to check each solution in the original problem.
- `unknown` means it could not compare the line: say so, do not guess.
- It judges whether steps are equivalent, not the method used, and it cannot read words, pictures or handwriting. For a photographed working, transcribe it line by line and show the lines back to the user before checking.
