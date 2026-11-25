// OCR-ambiguity branching solver and handwriting-slip detector for Photo Equation Solver.
//
// When a vision model reads a photo of handwritten maths, common visual confusions
// (5<->S, 2<->z, 1<->l<->I, 0<->O, 6<->b, 9<->g, x<->*, fraction-bar grouping like a+b/c vs (a+b)/c,
// or explicit VLM uncertainty brackets like "2x + [5|S] = 14") silently corrupt a single-pass solve or
// cause false "WRONG" accusations on student working.
//
// This module explores bounded, mathematically plausible OCR variants with the exact offline CAS:
//   - solveAmbiguous(api, input, opts): solves every plausible reading, checks consensus, and builds a
//     one-line disambiguating question when branches yield different exact answers.
//   - generateOcrVariants(text, opts): generates single-edit visual-OCR / grouping candidates (never
//     flipping + <-> -, which is a genuine algebraic error, not an OCR glyph slip).
//   - findOcrRepair(api, lineText, opts): checks whether a single plausible OCR slip explains a
//     broken or seemingly non-equivalent student step.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { clean } = require('./verify.js');

// Visual glyph confusions observed in handwritten maths OCR (intentionally excludes + <-> -).
const GLYPH_CONFUSIONS = [
  // Letter misread as digit or digit misread as letter
  { from: 'l', to: '1', label: 'l -> 1', kind: 'glyph', weight: 0.92 },
  { from: 'I', to: '1', label: 'I -> 1', kind: 'glyph', weight: 0.90 },
  { from: 'O', to: '0', label: 'O -> 0', kind: 'glyph', weight: 0.92 },
  { from: 'o', to: '0', label: 'o -> 0', kind: 'glyph', weight: 0.85 },
  { from: 'S', to: '5', label: 'S -> 5', kind: 'glyph', weight: 0.88 },
  { from: 's', to: '5', label: 's -> 5', kind: 'glyph', weight: 0.78 },
  { from: 'Z', to: '2', label: 'Z -> 2', kind: 'glyph', weight: 0.85 },
  { from: 'z', to: '2', label: 'z -> 2', kind: 'glyph', weight: 0.82 },
  { from: 'b', to: '6', label: 'b -> 6', kind: 'glyph', weight: 0.75 },
  { from: 'g', to: '9', label: 'g -> 9', kind: 'glyph', weight: 0.75 },
  { from: 'q', to: '9', label: 'q -> 9', kind: 'glyph', weight: 0.72 },
  { from: 'B', to: '8', label: 'B -> 8', kind: 'glyph', weight: 0.82 },
  { from: '×', to: 'x', label: '× -> x', kind: 'glyph', weight: 0.88 },
  { from: '×', to: '*', label: '× -> *', kind: 'glyph', weight: 0.88 },
  // Digit-to-digit handwriting confusions (lower prior weight; only used when context permits)
  { from: '1', to: '7', label: '1 -> 7', kind: 'digit', weight: 0.62 },
  { from: '7', to: '1', label: '7 -> 1', kind: 'digit', weight: 0.62 },
  { from: '5', to: '6', label: '5 -> 6', kind: 'digit', weight: 0.58 },
  { from: '6', to: '5', label: '6 -> 5', kind: 'digit', weight: 0.58 },
  { from: '3', to: '8', label: '3 -> 8', kind: 'digit', weight: 0.58 },
  { from: '8', to: '3', label: '8 -> 3', kind: 'digit', weight: 0.58 },
  { from: '4', to: '9', label: '4 -> 9', kind: 'digit', weight: 0.56 },
  { from: '9', to: '4', label: '9 -> 4', kind: 'digit', weight: 0.56 },
];

// Protect known function names (sin, cos, log, ln, sqrt, exp, abs, tan, etc.) from glyph edits.
const FN_RE = /\b(?:arcsin|arccos|arctan|asin|acos|atan|sinh|cosh|tanh|log10|log2|sqrt|cbrt|sin|cos|tan|sec|csc|cot|exp|abs|ln|log|pi|solve|simplify|integrate|derivative)\b/gi;

function protectedMask(text) {
  const mask = new Uint8Array(text.length);
  for (const m of text.matchAll(FN_RE)) {
    for (let i = m.index; i < m.index + m[0].length; i++) mask[i] = 1;
  }
  return mask;
}

/**
 * Expands explicit VLM ambiguity brackets such as "2x + [5|S] = 14" or "[x+1/2 | (x+1)/2] = 3".
 * Returns null if no ambiguity brackets are present.
 */
function expandExplicitBrackets(text, maxBranches = 16) {
  const re = /\[([^\[\]|]+(?:\|[^\[\]|]+)+)\]/g;
  const matches = [...String(text).matchAll(re)];
  if (!matches.length) return null;

  let combos = [{ text: String(text), choices: [] }];
  // Process from right to left so indices stay valid
  for (let idx = matches.length - 1; idx >= 0; idx--) {
    const m = matches[idx];
    const start = m.index;
    const end = start + m[0].length;
    const opts = m[1].split('|').map((s) => s.trim()).filter(Boolean);
    const next = [];
    for (const c of combos) {
      for (const opt of opts) {
        next.push({
          text: c.text.slice(0, start) + opt + c.text.slice(end),
          choices: [opt, ...c.choices],
        });
        if (next.length >= maxBranches) break;
      }
      if (next.length >= maxBranches) break;
    }
    combos = next;
  }

  return combos.map((c, i) => ({
    text: c.text,
    kind: 'explicit_bracket',
    edit: 'VLM branch [' + c.choices.join(', ') + ']',
    weight: Math.round((1.0 - i * 0.04) * 100) / 100,
  }));
}

/**
 * Generates grouping variants for handwritten fraction-bar ambiguity:
 *   - "a + b / c" -> "(a + b) / c"
 *   - "a / b + c" -> "a / (b + c)"
 *   - "1/2x"      -> "(1/2)*x" and "1/(2*x)"
 */
function groupingVariants(text) {
  const out = [];
  const s = String(text).trim();

  // Case 1: unparenthesized sum/difference before "/" on either side of "="
  // e.g. "x + 1 / 2 = 3" or "x + 1/2 = 3" -> "(x + 1)/2 = 3"
  const numRe = /(^|[=<>≤≥]\s*)([A-Za-z0-9^()*\s]+[+-][A-Za-z0-9^()*\s]+?)\s*\/\s*([A-Za-z0-9^()]+)/g;
  for (const m of s.matchAll(numRe)) {
    const lhs = m[2].trim();
    const den = m[3].trim();
    if (!lhs.startsWith('(') || !lhs.endsWith(')')) {
      const repl = `${m[1]}(${lhs})/${den}`;
      const cand = s.slice(0, m.index) + repl + s.slice(m.index + m[0].length);
      if (cand !== s) {
        out.push({
          text: cand,
          kind: 'fraction_grouping',
          edit: `group numerator (${lhs})/${den}`,
          weight: 0.86,
        });
      }
    }
  }

  // Case 2: unparenthesized sum/difference after "/" e.g. "6 / x + 1 = 2" -> "6 / (x + 1) = 2"
  const denRe = /([A-Za-z0-9^()]+)\s*\/\s*([A-Za-z0-9^*]+\s*[+-]\s*[A-Za-z0-9^*]+)(?=$|\s*[=<>≤≥])/g;
  for (const m of s.matchAll(denRe)) {
    const num = m[1].trim();
    const rhs = m[2].trim();
    const repl = `${num}/(${rhs})`;
    const cand = s.slice(0, m.index) + repl + s.slice(m.index + m[0].length);
    if (cand !== s) {
      out.push({
        text: cand,
        kind: 'fraction_grouping',
        edit: `group denominator ${num}/(${rhs})`,
        weight: 0.84,
      });
    }
  }

  // Case 3: implicit multiplication after division: "1/2x" -> "1/(2x)" and "(1/2)x"
  const impRe = /(\d+)\s*\/\s*(\d+)([A-Za-z])/g;
  for (const m of s.matchAll(impRe)) {
    const a = m[1];
    const b = m[2];
    const v = m[3];
    const c1 = s.slice(0, m.index) + `${a}/(${b}${v})` + s.slice(m.index + m[0].length);
    const c2 = s.slice(0, m.index) + `(${a}/${b})${v}` + s.slice(m.index + m[0].length);
    out.push({ text: c1, kind: 'fraction_grouping', edit: `denominator ${a}/(${b}${v})`, weight: 0.85 });
    out.push({ text: c2, kind: 'fraction_grouping', edit: `coefficient (${a}/${b})${v}`, weight: 0.85 });
  }

  return out;
}

/**
 * Generates bounded, deduplicated, ranked single-edit OCR-confusion variants for a maths line.
 * @param {string} text
 * @param {{ maxVariants?: number, includeDigitSwaps?: boolean, expectedVars?: string[] }} [options]
 */
function generateOcrVariants(text, options = {}) {
  const maxVariants = options.maxVariants || 14;
  const includeDigitSwaps = options.includeDigitSwaps !== false;
  const expectedVars = new Set((options.expectedVars || []).map((v) => String(v)));
  const raw = String(text).trim();

  // If caller provided explicit VLM uncertainty brackets [a|b], expand those directly first
  const explicit = expandExplicitBrackets(raw, maxVariants);
  if (explicit) return explicit;

  const seen = new Set([raw.replace(/\s+/g, '')]);
  const out = [];
  const push = (v) => {
    const key = v.text.replace(/\s+/g, '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };

  // 1. Fraction-bar grouping variants (very high prior in handwritten photos)
  for (const g of groupingVariants(raw)) push(g);

  // 2. Single-character visual glyph confusions
  const mask = protectedMask(raw);
  for (let i = 0; i < raw.length; i++) {
    if (mask[i]) continue;
    const ch = raw[i];
    for (const rule of GLYPH_CONFUSIONS) {
      if (ch !== rule.from) continue;
      if (rule.kind === 'digit' && !includeDigitSwaps) continue;
      // Do not turn an expected problem variable (e.g. 'b' or 's' or 'z' when it's the unknown!) into a digit
      if (rule.kind === 'glyph' && expectedVars.has(ch) && /\d/.test(rule.to)) continue;
      // Only turn lowercase letter into digit if it's NOT part of a longer alphabetic identifier (unless adjacent to digit)
      if (/[a-zA-Z]/.test(ch) && /\d/.test(rule.to)) {
        const prevCh = i > 0 ? raw[i - 1] : ' ';
        const nextCh = i + 1 < raw.length ? raw[i + 1] : ' ';
        const touchesLetter = /[a-zA-Z]/.test(prevCh) || /[a-zA-Z]/.test(nextCh);
        const touchesDigit = /\d/.test(prevCh) || /\d/.test(nextCh);
        // "l4" -> "14" or "2O" -> "20" touches digit; isolated "S" or "l" is fine; skip letters inside multi-letter words
        if (touchesLetter && !touchesDigit) continue;
      }
      const cand = raw.slice(0, i) + rule.to + raw.slice(i + 1);
      push({
        text: cand,
        kind: rule.kind,
        edit: `${rule.label} at pos ${i + 1}`,
        weight: rule.weight,
      });
    }
  }

  out.sort((a, b) => b.weight - a.weight);
  return out.slice(0, maxVariants);
}

function answerSignature(res) {
  if (!res || !res.ok || !Array.isArray(res.answer) || !res.answer.length) return null;
  const lines = res.answer.filter((l) => !/∈|interval notation/.test(l)).map((l) => clean(l));
  return lines.slice().sort().join(' | ');
}

/**
 * Solves a potentially OCR-ambiguous equation or expression across its primary reading and
 * plausible visual-OCR / grouping branches.
 *
 * @param {object} api
 * @param {string} input
 * @param {{ maxVariants?: number, includeDigitSwaps?: boolean, solveFor?: string }} [options]
 */
async function solveAmbiguous(api, input, options = {}) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Input must be a non-empty equation or expression.');

  const hasBrackets = /\[[^\[\]|]+(?:\|[^\[\]|]+)+\]/.test(raw);
  const candidates = hasBrackets
    ? generateOcrVariants(raw, options)
    : [
        { text: raw, kind: 'primary', edit: 'as written', weight: 1.0 },
        ...generateOcrVariants(raw, {
          maxVariants: options.maxVariants || 10,
          includeDigitSwaps: options.includeDigitSwaps === true, // off by default for single-shot solve to avoid digit noise
        }),
      ];

  const solvedBranches = [];
  const byAnswer = new Map();

  for (const cand of candidates) {
    const r = await api.solve(cand.text, options.solveFor ? { solveFor: options.solveFor } : undefined);
    if (!r.ok) continue;
    const sig = answerSignature(r);
    if (!sig) continue;
    const shown = r.answer.filter((l) => !/∈|interval notation/.test(l)).map((l) => clean(l)).join(', ');
    const entry = {
      input: cand.text,
      kind: cand.kind,
      edit: cand.edit,
      weight: cand.weight,
      readAs: r.readAs || cand.text,
      answer: r.answer,
      shown,
      signature: sig,
    };
    solvedBranches.push(entry);
    if (!byAnswer.has(sig)) byAnswer.set(sig, entry);
  }

  const distinctBranches = [...byAnswer.values()];
  const consensus = distinctBranches.length === 1;
  const primary = solvedBranches.find((b) => b.kind === 'primary') || solvedBranches[0] || null;

  let disambiguatingQuestion = null;
  if (distinctBranches.length > 1) {
    const topTwo = distinctBranches.slice(0, 3);
    const optsText = topTwo.map((b) => `'${b.input}' (→ ${b.shown})`).join(' or ');
    disambiguatingQuestion = `Ambiguous reading detected — did you mean ${optsText}?`;
  }

  return {
    input: raw,
    ok: distinctBranches.length > 0,
    hasExplicitBrackets: hasBrackets,
    consensus,
    primary,
    distinctAnswerCount: distinctBranches.length,
    branches: distinctBranches,
    allSolvedCount: solvedBranches.length,
    disambiguatingQuestion,
  };
}

/**
 * Plain-text formatter for solveAmbiguous().
 */
function formatAmbiguousReport(r) {
  const out = [];
  out.push('Input: ' + r.input);
  if (!r.ok) {
    out.push('No mathematically solvable reading was found.');
    return out.join('\n');
  }
  out.push(
    r.consensus
      ? 'Consensus: all ' + r.allSolvedCount + ' solvable reading(s) agree → ' + r.branches[0].shown
      : 'Ambiguity: ' + r.distinctAnswerCount + ' distinct answers across plausible readings:'
  );
  for (let i = 0; i < r.branches.length; i++) {
    const b = r.branches[i];
    out.push(`  [${i + 1}] ${b.input}  (${b.edit})  →  ${b.shown}`);
  }
  if (r.disambiguatingQuestion) {
    out.push('');
    out.push(r.disambiguatingQuestion);
  }
  return out.join('\n');
}

module.exports = {
  generateOcrVariants,
  expandExplicitBrackets,
  groupingVariants,
  solveAmbiguous,
  formatAmbiguousReport,
};
