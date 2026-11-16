// Photo Equation Solver MCP server: the protocol layer, kept free of stdin/stdout so that tests and the CLI can use it.
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.
'use strict';

const createSolver = require('./solver.cjs');
const pkg = require('../package.json');

// Graphs and pictures need a canvas. The optional package @napi-rs/canvas provides one; without it everything else works.
let canvasDocument;
if (!process.env.PES_NO_CANVAS) {
  try {
    const { createCanvas } = require('@napi-rs/canvas');
    canvasDocument = {
      createElement(tag) {
        if (tag !== 'canvas') throw new Error('only canvas elements are available');
        return createCanvas(300, 150);
      },
    };
  } catch (e) {
    canvasDocument = undefined;
  }
}
const hasCanvas = canvasDocument !== undefined;
const solverEntry = createSolver(canvasDocument, { log() {}, error() {} })['ai_edge_gallery_get_result'];

const NAME = 'photo-equation-solver';
const LATEST_PROTOCOL = '2025-06-18';
const MAX_INPUT = 4000;

const INSTRUCTIONS = [
  'Exact, offline maths engine. Use the "solve" tool for every calculation instead of working it out yourself:',
  'equations, calculus, matrices, statistics, finance, geometry, units and chemistry.',
  'Copy its numbers exactly. Write fractions with brackets round the whole top and the whole bottom: (x+1)/(x-1).',
  'A result with "Note: Check the picture" means the input was probably misread: recheck it before answering.',
  'If a call fails, the error names a help topic; call the "help" tool for the exact syntax.',
].join(' ');

const TOOLS = [
  {
    name: 'solve',
    title: 'Solve maths exactly',
    description:
      'Exact, offline maths engine. Returns the exact answer (fractions, radicals, symbolic results) with the working and a check. ' +
      'Use it instead of calculating yourself for: equations, systems and inequalities; calculus (integrals, derivatives, limits, series, differential equations, Laplace); ' +
      'matrices and vectors; number theory and counting; probability and statistics (distributions, tests, intervals, regression); geometry and triangles; ' +
      'unit conversion; finance (interest, loans, bonds); chemistry (molar mass, balancing); physics formulas; graphs. ' +
      'Write "equation" in ordinary notation (x^2, sqrt(x), pi, abs(x), 30 degrees), with brackets round the WHOLE top and the WHOLE bottom of a fraction: (x+1)/(x-1). ' +
      'It may also be a command such as integrate(x*e^x, x, 0, 1), limit(sin(x)/x, x, 0), det([[1,2],[3,4]]), normalcdf(-1, 1, 0, 1) or bond(1000, 5%, 6%, 10, 2), ' +
      'or a short plain-English question such as "derivative of x^3 + 2x". Several equations: separate them with ";". ' +
      'Several separate problems: one per line, numbered 1) 2). If it fails, the error names a help topic: call the "help" tool.',
    inputSchema: {
      type: 'object',
      properties: {
        equation: { type: 'string', description: 'The maths: an equation, an expression, a command such as integrate(x^2, x, 0, 3), or a short plain-English question.' },
        solve_for: { type: 'string', description: 'Optional. The one unknown to solve for, for example "t" in v = u + a*t.' },
      },
      required: ['equation'],
    },
    annotations: { title: 'Solve maths exactly', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'help',
    title: 'Solver syntax help',
    description:
      'Syntax help for the solver. Without a topic it lists the topics; with a topic (for example finance, stats, calculus, ode, matrix, number, geometry, units, chemistry, plot, words, syntax) ' +
      'it lists every command of that area with an example of each.',
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string', description: 'Optional topic, for example "finance".' } },
    },
    annotations: { title: 'Solver syntax help', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

/** Runs the solver. Returns { ok, text, image } with image = base64 PNG or null. Never throws. */
async function solveText(equation, solveFor) {
  const eq = typeof equation === 'string' ? equation.trim() : '';
  if (!eq) return { ok: false, text: 'No equation was given: send the maths in the "equation" argument.', image: null };
  if (eq.length > MAX_INPUT) return { ok: false, text: 'The input is too long (maximum ' + MAX_INPUT + ' characters).', image: null };
  const data = { equation: eq };
  if (typeof solveFor === 'string' && solveFor.trim()) data.solve_for = solveFor.trim();
  let raw;
  try {
    raw = JSON.parse(await solverEntry(JSON.stringify(data)));
  } catch (e) {
    return { ok: false, text: 'Internal error: ' + (e && e.message ? e.message : e), image: null };
  }
  if (raw.error !== undefined) return { ok: false, text: raw.error, image: null };
  const image = raw.image && raw.image.base64 ? raw.image.base64 : null;
  let text = raw.result;
  if (image) text = text.replace(/\(the picture is shown in the chat\)/g, '(the picture is attached)');
  else text = text.replace(/\(the picture is shown in the chat\)/g, '(no picture was drawn: this server has no canvas; install the optional package @napi-rs/canvas)');
  return { ok: true, text, image };
}

function toolResult(r) {
  const content = [{ type: 'text', text: r.text }];
  if (r.image) content.push({ type: 'image', data: r.image, mimeType: 'image/png' });
  const out = { content };
  if (!r.ok) out.isError = true;
  return out;
}

async function callTool(name, args) {
  const a = args && typeof args === 'object' ? args : {};
  if (name === 'solve') return toolResult(await solveText(a.equation, a.solve_for));
  if (name === 'help') {
    const topic = typeof a.topic === 'string' ? a.topic.trim() : '';
    return toolResult(await solveText(topic ? 'help ' + topic : 'help'));
  }
  return null;
}

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

/** One JSON-RPC message in, the reply out (null for notifications). */
async function handle(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return fail(msg && typeof msg === 'object' && 'id' in msg ? msg.id : null, -32600, 'Invalid Request');
  }
  const notification = !('id' in msg);
  const id = msg.id;
  const params = msg.params && typeof msg.params === 'object' ? msg.params : {};
  try {
    switch (msg.method) {
      case 'initialize': {
        const asked = params.protocolVersion;
        const version = typeof asked === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked >= '2024-11-05' ? asked : LATEST_PROTOCOL;
        return ok(id, {
          protocolVersion: version,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: NAME, title: 'Photo Equation Solver', version: pkg.version },
          instructions: INSTRUCTIONS,
        });
      }
      case 'ping':
        return notification ? null : ok(id, {});
      case 'tools/list':
        return ok(id, { tools: TOOLS });
      case 'tools/call': {
        const result = await callTool(params.name, params.arguments);
        if (result === null) return fail(id, -32602, 'Unknown tool: ' + String(params.name));
        return ok(id, result);
      }
      default:
        if (notification) return null;
        return fail(id, -32601, 'Method not found: ' + msg.method);
    }
  } catch (e) {
    return notification ? null : fail(id, -32603, 'Internal error: ' + (e && e.message ? e.message : e));
  }
}

module.exports = { handle, solveText, TOOLS, INSTRUCTIONS, hasCanvas, NAME };
