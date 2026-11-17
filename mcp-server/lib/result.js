// Turns the solver's printed text into fields. The printed format is fixed (see renderResult in dev/src/05-solve.js):
//
//   Read as: <what was understood>
//   Answer: <one answer>            or   Answer:  followed by lines indented by two spaces
//   Working:                        followed by lines starting with "- "
//   Check: <how the answer was checked>
//   Note: <something to be aware of>      (zero or more)
//
// Several problems at once are printed as blocks headed "Problem 1", "Problem 2", ... separated by a blank line.
// A block that failed has "Error: <message>" instead of the Answer.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

/** Parses ONE problem's lines. Lines that fit no field are returned in `unparsed` (the tests keep it empty). */
function parseBlock(lines) {
  const r = { readAs: null, answer: [], working: [], check: null, notes: [], error: null, unparsed: [] };
  let state = ''; // which field a continuation line belongs to
  const last = (arr) => arr.length - 1;
  for (const line of lines) {
    let m;
    if ((m = /^Read as: ?(.*)$/.exec(line)) && r.readAs === null) {
      r.readAs = m[1];
      state = 'readAs';
    } else if ((m = /^Answer:(?: (.*))?$/.exec(line))) {
      state = 'answer';
      r.answerForm = m[1] !== undefined ? 'inline' : 'block';
      if (m[1] !== undefined) r.answer.push(m[1]);
    } else if (/^Working:$/.test(line)) {
      state = 'working';
    } else if ((m = /^Check: ?(.*)$/.exec(line))) {
      r.check = m[1];
      state = 'check';
    } else if ((m = /^Note: ?(.*)$/.exec(line))) {
      r.notes.push(m[1]);
      state = 'note';
    } else if ((m = /^Error: ?(.*)$/.exec(line))) {
      r.error = m[1];
      state = 'error';
    } else if (state === 'answer' && r.answerForm === 'block' && /^ {2}/.test(line)) {
      r.answer.push(line.slice(2));
    } else if (state === 'working' && (m = /^- (.*)$/.exec(line))) {
      r.working.push(m[1]);
    } else if (state === 'answer' && r.answer.length) {
      r.answer[last(r.answer)] += '\n' + line; // an answer item that itself spans lines
    } else if (state === 'working' && r.working.length) {
      r.working[last(r.working)] += '\n' + line;
    } else if (state === 'note' && r.notes.length) {
      r.notes[last(r.notes)] += '\n' + line;
    } else if (state === 'check' && r.check !== null) {
      r.check += '\n' + line;
    } else if (state === 'error' && r.error !== null) {
      r.error += '\n' + line;
    } else if (state === 'readAs' && r.readAs !== null) {
      r.readAs += '\n' + line;
    } else {
      r.unparsed.push(line);
    }
  }
  return r;
}

const NEEDS_REVIEW = /^Check the picture/;

function fromBlock(b, input, text) {
  const ok = b.error === null && b.readAs !== null;
  return {
    ok,
    kind: ok ? 'solution' : 'error',
    input,
    readAs: b.readAs,
    answer: b.answer,
    working: b.working,
    check: b.check,
    notes: b.notes,
    needsReview: b.notes.some((n) => NEEDS_REVIEW.test(n)),
    error: b.error,
    problems: null,
    text,
    picture: null,
    unparsed: b.unparsed,
  };
}

/**
 * @param {string} text   what the solver printed
 * @param {boolean} ok    false when the solver refused the whole input (the text is then the message)
 * @param {string} input  the maths that was sent
 */
function parseResult(text, ok, input) {
  const empty = { readAs: null, answer: [], working: [], check: null, notes: [], needsReview: false, error: null, problems: null, text, picture: null, unparsed: [] };
  if (!ok) return { ok: false, kind: 'error', input, ...empty, error: text };
  if (/^Problem \d+\n/.test(text)) {
    const blocks = text.split(/\n\n(?=Problem \d+\n)/);
    const problems = blocks.map((blk) => {
      const lines = blk.split('\n');
      const n = Number(/^Problem (\d+)$/.exec(lines[0])[1]);
      const r = fromBlock(parseBlock(lines.slice(1)), null, blk);
      r.index = n;
      return r;
    });
    return {
      ok: problems.every((p) => p.ok),
      kind: 'multiple',
      input,
      ...empty,
      needsReview: problems.some((p) => p.needsReview),
      problems,
      unparsed: problems.flatMap((p) => p.unparsed),
    };
  }
  if (/^Read as:/.test(text)) return fromBlock(parseBlock(text.split('\n')), input, text);
  // help pages and other plain text
  return { ok: true, kind: 'text', input, ...empty };
}

module.exports = { parseResult, parseBlock };
