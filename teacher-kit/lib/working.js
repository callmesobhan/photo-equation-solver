// Checks a student's working, line by line, with the exact solver.
//
// The working is a list of lines: the problem first, then each step. Two kinds of line are understood:
//   equations and inequalities in one unknown   a step is right when it has the same solutions as the line above it
//   expressions (no =, <, >)                     a step is right when it is equal to the line above it
// The first line that is not equivalent to the line before it is the first wrong step. A line the solver cannot
// compare (two unknowns, a form it does not read) is reported as "could not be compared", never as right or wrong.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { equivalent, variablesOf } = require('./equiv.js');
const { clean } = require('./verify.js');

const RELATION = /<=|>=|≤|≥|≠|<|>|=/;

function stripLabel(line) {
  return line
    .replace(/^\s*(?:step\s*\d+\s*[:.)\-–]?\s*|\(?\d+[.)]\s+)/i, '')
    .replace(/^\s*(?:⇒|⟹|=>|→|->|∴)\s*/, '')
    .trim();
}

/** @returns {{text: string, kind: 'equation'|'inequality'|'expression'|'continued'}[]} */
function parseLines(text) {
  const out = [];
  String(text).split(/\r?\n/).forEach((raw) => {
    let t = stripLabel(raw);
    if (!t) return;
    if (out.length === 0) t = t.replace(/^(?:solve|simplify|evaluate|expand|factori[sz]e|factor|compute|calculate)(?:\s+for\s+[a-z])?\s*[:.]?\s+/i, '');
    if (/^=(?!=)/.test(t)) {
      out.push({ text: t.replace(/^=\s*/, ''), kind: 'continued' }); // "= 5x": the expression above equals this
      return;
    }
    if (/≠/.test(t)) out.push({ text: t, kind: 'unsupported' });
    else if (/<=|>=|≤|≥|<|>/.test(t)) out.push({ text: t, kind: 'inequality' });
    else if (/=/.test(t)) out.push({ text: t, kind: 'equation' });
    else out.push({ text: t, kind: 'expression' });
  });
  return out;
}

/** Splits "x = 2 or x = 3", "x = 2 and x = 3", "x = 2; x = 3", "x = 2, x = 3" at the top level; null when it is one relation. */
function alternatives(text) {
  const parts = [];
  let depth = 0;
  let cur = '';
  const t = String(text);
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth--;
    const rest = t.slice(i);
    let m;
    if (depth === 0 && (m = /^\s+(?:or|and)\s+/i.exec(rest) || /^\s*;\s*/.exec(rest) || /^\s*,\s*(?=[A-Za-z]\s*(?:=|<|>|≤|≥))/.exec(rest))) {
      parts.push(cur);
      cur = '';
      i += m[0].length - 1;
      continue;
    }
    cur += c;
  }
  parts.push(cur);
  const ok = parts.length > 1 && parts.every((p) => RELATION.test(p));
  return ok ? parts.map((p) => p.trim()) : null;
}

/** What the solver says the solutions of ONE relation are: { lines, sig, shown }, or { sig: null, error }. */
async function solveOne(api, text) {
  const r = await api.solve(text);
  if (!r.ok) return { sig: null, error: (r.error || '').split(/\. (?=Re-read|If you)/)[0].replace(/^Could not solve: /, '') };
  const lines = r.answer.filter((l) => !/∈|interval notation/.test(l)).map((l) => clean(l));
  if (lines.length === 1 && /^true for every/.test(lines[0])) return { lines: ['every value'], sig: 'every value', shown: 'every value of the unknown' };
  return { lines, sig: lines.slice().sort().join(' | '), shown: lines.join(', ') };
}

/** The solutions of a line, which may list several ("x = 2 or x = 3"). */
async function solutionsOf(api, text) {
  const alts = alternatives(text);
  if (!alts) return solveOne(api, text);
  const lines = new Set();
  for (const a of alts) {
    const s = await solveOne(api, a);
    if (s.sig === null) return s;
    s.lines.forEach((l) => lines.add(l));
  }
  const all = [...lines];
  return { lines: all, sig: all.slice().sort().join(' | '), shown: all.join(', ') };
}

const isPoint = (l) => /^[A-Za-z] = /.test(l);
/** How a new set of solutions relates to the old one, when both are lists of "x = value". */
function relate(oldLines, newLines) {
  if (![...oldLines, ...newLines].every(isPoint)) return { kind: 'differs', added: [], lost: [] };
  const lost = oldLines.filter((l) => !newLines.includes(l));
  const added = newLines.filter((l) => !oldLines.includes(l));
  return { kind: added.length && !lost.length ? 'adds' : lost.length && !added.length ? 'loses' : 'differs', added, lost };
}

const FINISHED = /^\s*[A-Za-z]\s*(?:=|<=|>=|≤|≥|<|>)\s*-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?\s*$|^\s*-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?\s*(?:=|<=|>=|≤|≥|<|>)\s*[A-Za-z]\s*$/;

/**
 * @param {object} api    the solver library
 * @param {string} text   the working: the problem on the first line, one step per following line
 */
async function checkWorking(api, text) {
  const lines = parseLines(text);
  if (lines.length < 2) throw new Error('Give at least two lines: the problem, then the first step.');
  const steps = [];
  let prev = null; // the previous comparable line
  let reference = null;
  const firstKind = lines[0].kind;

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const step = { n: i + 1, text: L.text, kind: L.kind, status: 'ok', reason: '' };
    steps.push(step);
    if (L.kind === 'unsupported') {
      step.status = 'unknown';
      step.reason = 'this kind of line (≠) is not compared';
      continue;
    }
    if (L.kind === 'continued') {
      // "= expression" continues an expression chain
      if (!prev || prev.kind !== 'expression') {
        step.status = 'unknown';
        step.reason = 'a line starting with "=" can only follow an expression';
        continue;
      }
      step.kind = 'expression';
    }
    const kind = step.kind;
    if (i === 0) {
      step.status = 'start';
      step.reason = 'the problem';
      if (kind !== 'expression') {
        const s = await solutionsOf(api, L.text);
        if (s.sig === null) { step.status = 'unknown'; step.reason = 'the solver could not read the problem: ' + s.error; } else {
          step.solutions = s.sig;
          step.lines = s.lines;
          step.shown = s.shown;
          reference = s;
        }
      }
      prev = { ...step };
      continue;
    }
    if (!prev) {
      step.status = 'unknown';
      step.reason = 'there is no earlier line to compare with';
      continue;
    }
    if (kind === 'expression' && prev.kind === 'expression') {
      const q = await equivalent(api, prev.text, step.text);
      if (q.equal === true) { step.status = 'ok'; step.reason = 'equal to the line above (' + q.how + ')'; }
      else if (q.equal === false) { step.status = 'wrong'; step.reason = 'not equal to the line above (' + q.how + ')'; }
      else { step.status = 'unknown'; step.reason = 'the solver could not decide whether it equals the line above'; }
    } else if (kind !== 'expression' && prev.kind !== 'expression') {
      const s = await solutionsOf(api, step.text);
      if (s.sig === null || prev.solutions === undefined) {
        // two unknowns or a form the solver does not solve: identical text is the only thing we can say
        if (step.text.replace(/\s+/g, '') === prev.text.replace(/\s+/g, '')) { step.status = 'ok'; step.reason = 'the same as the line above'; }
        else { step.status = 'unknown'; step.reason = s.sig === null ? 'the solver could not solve this line: ' + s.error : 'the line above could not be solved'; }
      } else {
        step.solutions = s.sig;
        step.lines = s.lines;
        step.shown = s.shown;
        if (s.sig === prev.solutions) { step.status = 'ok'; step.reason = 'same solutions as the line above'; }
        else {
          const rel = relate(prev.lines, s.lines);
          if (rel.kind === 'adds') {
            step.status = 'extra';
            step.reason = 'it adds ' + rel.added.join(', ') + ' to the line above. Squaring both sides or multiplying by an expression can do this: check every solution in the original problem';
          } else if (rel.kind === 'loses') {
            step.status = 'wrong';
            step.reason = 'it loses ' + rel.lost.join(', ') + ' that the line above has';
          } else {
            step.status = 'wrong';
            step.reason = 'its solution is ' + s.shown + ', the line above has ' + prev.shown;
          }
        }
      }
    } else {
      step.status = 'unknown';
      step.reason = 'an equation and an expression cannot be compared';
    }
    prev = { ...step };
  }

  const firstWrong = steps.find((s) => s.status === 'wrong');
  const firstExtra = steps.find((s) => s.status === 'extra');
  const firstUnknown = steps.find((s) => s.status === 'unknown');
  const last = steps[steps.length - 1];
  const solving = firstKind !== 'expression';
  const unknowns = variablesOf(lines[0].text).length;
  // "finished" only makes sense for one unknown; with two or more, "solved for y" is as far as a step can go
  const finished = solving && unknowns <= 1 ? (alternatives(last.text) || [last.text]).every((part) => FINISHED.test(part)) : null;
  const finalMatches = solving && reference && last.solutions !== undefined ? last.solutions === reference.sig : null;

  let verdict;
  if (firstWrong) verdict = 'Step ' + firstWrong.n + ' is the first line that is not equivalent to the line before it.';
  else if (firstUnknown) verdict = 'No wrong step was found, but step ' + firstUnknown.n + ' could not be compared (' + firstUnknown.reason + ').';
  else if (firstExtra) verdict = 'No wrong step, but step ' + firstExtra.n + ' adds solutions (squaring or multiplying by an expression can do this): every solution has to be checked in the original problem.';
  else if (solving && finished === false) verdict = 'Every step is valid, but the problem is not finished: the last line is not a solution such as x = 4.';
  else verdict = 'Every step is valid.';
  let finalNote = null;
  if (solving && reference && finalMatches === true) finalNote = 'The last line has the same solutions as the problem.';
  else if (solving && reference && finalMatches === false && last.lines) {
    const rel = relate(reference.lines, last.lines);
    if (rel.kind === 'adds') finalNote = 'The last line has solutions the problem does not have: ' + rel.added.join(', ') + '.';
    else if (rel.kind === 'loses') finalNote = 'The last line is missing ' + rel.lost.join(', ') + ', which solves the problem.';
    else finalNote = "The last line's solutions differ from the problem's.";
  }

  return {
    problem: lines[0].text,
    kind: firstKind,
    reference: reference ? reference.shown : null,
    steps,
    firstWrong: firstWrong ? firstWrong.n : null,
    firstExtra: firstExtra ? firstExtra.n : null,
    firstUnknown: firstUnknown ? firstUnknown.n : null,
    finished,
    finalMatches,
    verdict,
    finalNote,
  };
}

/** A plain-text report. */
function formatReport(r) {
  const out = [];
  out.push('Problem: ' + r.problem);
  if (r.reference) out.push("The solver's answer to the problem: " + r.reference);
  out.push('');
  const width = Math.min(46, Math.max(...r.steps.map((s) => s.text.length)) + 2);
  for (const s of r.steps) {
    const mark = { ok: 'ok     ', wrong: 'WRONG  ', extra: 'extra  ', unknown: 'unknown', start: 'start  ' }[s.status];
    out.push(String(s.n).padStart(2) + '. ' + s.text.padEnd(width) + ' ' + mark + ' ' + s.reason);
  }
  out.push('');
  out.push(r.verdict);
  if (r.finalNote) out.push(r.finalNote);
  return out.join('\n');
}

module.exports = { checkWorking, formatReport, parseLines };
