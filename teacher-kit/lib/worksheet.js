// Builds a worksheet and its answer key. Every answer comes from the exact solver and is accepted only when it agrees with
// the answer the generator worked out for itself (see generators.js and verify.js). A problem the two disagree on is
// dropped and another is drawn; if that keeps happening, building stops with an error rather than printing a wrong key.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const { TOPICS } = require('./generators.js');
const { makeRng } = require('./rng.js');
const { verify } = require('./verify.js');

const TITLE_FOR = { 1: 'level 1 (one or two steps)', 2: 'level 2', 3: 'level 3 (harder)' };

/**
 * @param {object} api   the solver library (mcp-server/lib/api.js)
 * @param {{topics?: string[], count?: number, level?: 1|2|3, seed?: number, title?: string}} opts
 */
async function buildWorksheet(api, opts = {}) {
  const topics = opts.topics && opts.topics.length ? opts.topics : ['linear', 'quadratic'];
  for (const t of topics) if (!TOPICS[t]) throw new Error('Unknown topic "' + t + '". Topics: ' + Object.keys(TOPICS).join(', '));
  const count = Math.max(1, Math.min(60, opts.count || 10));
  const level = [1, 2, 3].includes(opts.level) ? opts.level : 2;
  const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
  const rng = makeRng(seed);
  const seen = new Set();
  const problems = [];
  const disagreements = [];
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    let accepted = null;
    for (let attempt = 0; attempt < 40 && !accepted; attempt++) {
      const p = TOPICS[topic].make(rng, level);
      if (seen.has(p.input)) continue;
      const result = await api.solve(p.input);
      const v = await verify(api, p, result);
      if (v.ok) accepted = { p, result };
      else disagreements.push({ input: p.input, reason: v.reason });
      if (disagreements.length > 25) throw new Error('The solver and the generator keep disagreeing, so no answer key is printed. First cases:\n' + disagreements.slice(0, 5).map((d) => '  ' + d.input + ': ' + d.reason).join('\n'));
    }
    if (!accepted) throw new Error('Could not draw a new ' + topic + ' problem (all repeated).');
    seen.add(accepted.p.input);
    problems.push({
      n: i + 1,
      topic,
      level,
      prompt: accepted.p.prompt,
      lines: accepted.p.lines,
      matrix: accepted.p.matrix || null,
      input: accepted.p.input,
      answer: accepted.result.answer,
      working: accepted.result.working,
      check: accepted.result.check,
    });
  }
  return {
    title: opts.title || (topics.length === 1 ? TOPICS[topics[0]].title : 'Mixed practice') + ', ' + TITLE_FOR[level],
    seed,
    level,
    topics,
    problems,
    verified: true,
    dropped: disagreements.length,
  };
}

// ---------- output formats ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Escaped text with x^2, e^(5x) written as real superscripts. */
const math = (s) => esc(s).replace(/\^\(([^()]*)\)/g, '<sup>$1</sup>').replace(/\^(-?[0-9A-Za-z]+)/g, '<sup>$1</sup>');

const CSS = `
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { font: 15px/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #202124; margin: 0; padding: 24px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 24px; margin: 0 0 4px; color: #0a2a6b; }
  .meta { display: flex; gap: 28px; margin: 14px 0 6px; font-size: 14px; color: #5f6368; }
  .meta span { border-bottom: 1px solid #9aa0a6; min-width: 190px; display: inline-block; height: 20px; }
  .meta .short { min-width: 70px; }
  .note { font-size: 13px; color: #5f6368; margin: 6px 0 18px; }
  ol.problems { list-style: none; padding: 0; margin: 0; counter-reset: p; }
  ol.problems > li { counter-increment: p; position: relative; padding: 0 0 0 38px; margin: 0 0 8px; break-inside: avoid; border-bottom: 1px dotted #dadce0; }
  ol.problems > li::before { content: counter(p) "."; position: absolute; left: 0; top: 0; font-weight: 700; color: #0b57d0; }
  .prompt { font-size: 13px; color: #5f6368; }
  .math { font-size: 19px; margin: 4px 0; font-family: "Cambria Math", "STIX Two Math", Georgia, "Times New Roman", serif; white-space: pre-wrap; }
  .space { height: 62px; }
  .space.tall { height: 96px; }
  table.matrix { border-collapse: collapse; margin: 6px 0; font-size: 19px; font-family: "Cambria Math", Georgia, serif; }
  table.matrix td { padding: 2px 12px; text-align: right; }
  table.matrix { border-left: 2px solid #202124; border-right: 2px solid #202124; border-radius: 6px; }
  .foot { margin-top: 18px; font-size: 12px; color: #80868b; }
  .key { break-before: page; page-break-before: always; }
  .key h1 { color: #188038; }
  .key .answer { font-size: 17px; font-family: "Cambria Math", Georgia, serif; margin: 2px 0; }
  .key .work { font-size: 12.5px; color: #5f6368; margin: 2px 0 4px; padding-left: 18px; }
  .key .work li { margin: 0; }
  .ok { font-size: 13px; color: #188038; margin: 6px 0 16px; }
  @media print { body { padding: 0; } }
`;

function problemHtml(p, withSpace) {
  const tall = p.topic === 'system' || p.topic === 'integral' || p.topic === 'determinant' || p.topic === 'quadratic';
  const body = p.matrix
    ? '<table class="matrix">' + p.matrix.map((r) => '<tr>' + r.map((v) => '<td>' + esc(String(v).replace('-', '−')) + '</td>').join('') + '</tr>').join('') + '</table>'
    : p.lines.map((l) => '<div class="math">' + math(l) + '</div>').join('');
  return '<li><div class="prompt">' + math(p.prompt) + '</div>' + body + (withSpace ? '<div class="space' + (tall ? ' tall' : '') + '"></div>' : '') + '</li>';
}

/** One self-contained HTML page: the worksheet, and (key: true) the answer key on a page of its own. Print it to PDF from a browser. */
function renderHtml(ws, o = {}) {
  const key = o.key !== false;
  const sheet =
    '<h1>' + esc(ws.title) + '</h1>' +
    '<div class="meta"><div>Name <span></span></div><div>Date <span class="short"></span></div><div>Score <span class="short"></span> / ' + ws.problems.length + '</div></div>' +
    '<ol class="problems">' + ws.problems.map((p) => problemHtml(p, true)).join('') + '</ol>' +
    '<div class="foot">Worksheet ' + esc(o.label || '') + 'seed ' + ws.seed + ', level ' + ws.level + '. Made with Photo Equation Solver (teacher kit).</div>';
  const keyHtml = key
    ? '<div class="key"><h1>Answer key: ' + esc(ws.title) + '</h1>' +
      '<div class="ok">Every answer was computed by the exact solver, and agrees with an independent calculation made when the problem was built.</div>' +
      '<ol class="problems">' +
      ws.problems.map((p) => {
        const ans = p.answer.map((a) => '<div class="answer">' + math(a) + '</div>').join('');
        const work = o.working && p.working.length ? '<ul class="work">' + p.working.map((w) => '<li>' + math(w) + '</li>').join('') + '</ul>' : '';
        const q = p.matrix ? 'determinant of the matrix with rows ' + p.lines.map((l) => l.replace(/\|/g, '').trim().replace(/\s+/g, ' ')).join('; ') : p.lines.join('  ;  ');
        return '<li><div class="prompt">' + math(q) + '</div>' + ans + work + '</li>';
      }).join('') +
      '</ol><div class="foot">Seed ' + ws.seed + ', level ' + ws.level + '.</div></div>'
    : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(ws.title) + '</title><style>' + CSS + '</style></head><body>' + sheet + keyHtml + '</body></html>\n';
}

function renderMarkdown(ws, o = {}) {
  const out = ['# ' + ws.title, '', 'Name: ______________________   Date: ____________   Score: ____ / ' + ws.problems.length, ''];
  for (const p of ws.problems) {
    out.push(p.n + '. ' + p.prompt, '');
    out.push(...(p.matrix ? ['```', ...p.lines, '```'] : p.lines.map((l) => '   `' + l + '`')), '', '');
  }
  out.push('Worksheet seed ' + ws.seed + ', level ' + ws.level + '. Made with Photo Equation Solver (teacher kit).', '');
  if (o.key !== false) {
    out.push('---', '', '## Answer key: ' + ws.title, '', 'Every answer was computed by the exact solver, and agrees with an independent calculation made when the problem was built.', '');
    for (const p of ws.problems) {
      out.push(p.n + '. ' + p.answer.join('  ·  '));
      if (o.working && p.working.length) p.working.forEach((w) => out.push('   - ' + w));
    }
    out.push('');
  }
  return out.join('\n');
}

const renderJson = (ws) => JSON.stringify(ws, null, 2) + '\n';

module.exports = { buildWorksheet, renderHtml, renderMarkdown, renderJson };
