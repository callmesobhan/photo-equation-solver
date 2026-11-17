// The MCP server and the Node module, tested the way a host uses them:
//  1. protocol: a real stdio session (initialize, tools/list, tools/call, errors), with and without a canvas;
//     stdout must hold JSON lines only and stderr must stay empty;
//  2. parity: every hand-written case gives the same answer through the Node module as through the Gallery page.
// Usage: node mcp-test.mjs <index.html>
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.mjs';
import { load } from './harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverJs = path.join(here, '..', '..', 'mcp-server', 'bin', 'server.js');
const solverCjs = path.join(here, '..', '..', 'mcp-server', 'lib', 'solver.cjs');
let bad = 0;
const check = (ok, name, detail = '') => {
  if (!ok) { bad++; console.log('✗ ' + name + (detail ? '  ' + detail : '')); }
};

function session(messages, env = {}) {
  return new Promise((resolve) => {
    const p = spawn('node', [serverJs], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', () => resolve({ out, err }));
    messages.forEach((m) => p.stdin.write((typeof m === 'string' ? m : JSON.stringify(m)) + '\n'));
    p.stdin.end();
  });
}
const rpc = (id, method, params) => ({ jsonrpc: '2.0', id, method, params });
const call = (id, name, args) => rpc(id, 'tools/call', { name, arguments: args });
const textOf = (r) => (r && r.content ? r.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n') : '');

async function protocol(label, env, expectCanvas) {
  const { out, err } = await session([
    rpc(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } }),
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    rpc(2, 'tools/list'),
    call(3, 'solve', { equation: 'x^2 - 5x + 6 = 0' }),
    call(4, 'solve', { equation: '2x +' }),
    call(5, 'help', { topic: 'finance' }),
    call(6, 'solve', { equation: 'plot(x^2, x, -3, 3)' }),
    call(7, 'nope', {}),
    call(8, 'solve', {}),
    call(9, 'solve', { equation: 'v = u + a*t', solve_for: 't' }),
    call(10, 'solve', { equation: 'Bond price: FV=1000 and sum_{t=1}^{20} C' }),
    rpc(11, 'ping'),
    rpc(12, 'resources/list'),
    'this is not json',
    rpc(13, 'initialize', { protocolVersion: '1999-01-01' }),
  ], env);
  const lines = out.split('\n').filter(Boolean);
  const msgs = [];
  lines.forEach((l, i) => {
    try { msgs.push(JSON.parse(l)); } catch (e) { check(false, label + ': stdout line ' + (i + 1) + ' is not JSON', l.slice(0, 60)); }
  });
  check(err === '', label + ': stderr is empty', err.slice(0, 120));
  const by = new Map(msgs.map((m) => [m.id, m]));
  check(msgs.length === 14, label + ': 14 replies (the notification gets none)', 'got ' + msgs.length);
  const init = by.get(1)?.result;
  check(init && init.protocolVersion === '2025-06-18' && init.serverInfo.name === 'photo-equation-solver' && init.capabilities.tools && typeof init.instructions === 'string', label + ': initialize');
  check(by.get(13)?.result?.protocolVersion === '2025-06-18', label + ': an unknown protocol version gets the latest one');
  const tools = by.get(2)?.result?.tools || [];
  check(tools.map((t) => t.name).join() === 'solve,help', label + ': tools/list names');
  check(tools.every((t) => t.description.length > 40 && t.inputSchema.type === 'object' && t.annotations.readOnlyHint === true), label + ': tool schemas');
  check(JSON.stringify(tools[0].inputSchema.required) === '["equation"]' && !JSON.stringify(tools).includes('anyOf'), label + ': solve schema is flat (equation required, no anyOf)');
  const s = by.get(3)?.result;
  check(s && !s.isError && /x = 2[\s\S]*x = 3/.test(textOf(s)) && s.content.length === 1, label + ': solve a quadratic (text only, no answer card)');
  const e = by.get(4)?.result;
  check(e && e.isError === true && /Could not solve/.test(textOf(e)) && /help/.test(textOf(e)), label + ': a failed solve is a tool error that points to help');
  const h = by.get(5)?.result;
  check(h && !h.isError && /bond\(1000, 5%, 6%, 10, 2\)/.test(textOf(h)), label + ': help finance lists bond()');
  const g = by.get(6)?.result;
  const img = g && g.content.find((c) => c.type === 'image');
  if (expectCanvas) check(img && img.mimeType === 'image/png' && Buffer.from(img.data, 'base64').subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && /picture is attached/.test(textOf(g)), label + ': a graph comes back as a PNG image');
  else check(!img && /no canvas/.test(textOf(g)), label + ': without a canvas a graph says so in words');
  check(by.get(7)?.error?.code === -32602, label + ': unknown tool is -32602');
  check(by.get(8)?.result?.isError === true && /No equation/.test(textOf(by.get(8).result)), label + ': a missing equation is a tool error');
  check(/t = \(v - u\)\/a/.test(textOf(by.get(9)?.result)), label + ': solve_for');
  check(by.get(10)?.result?.isError === true && /help finance/.test(textOf(by.get(10).result)), label + ': the error names the finance help page');
  check(JSON.stringify(by.get(11)?.result) === '{}', label + ': ping');
  check(by.get(12)?.error?.code === -32601, label + ': unknown method is -32601');
  check(msgs.some((m) => m.id === null && m.error?.code === -32700), label + ': invalid JSON is -32700');
  console.log((bad ? '' : '✓ ') + 'protocol (' + label + '): ' + msgs.length + ' replies checked');
}

const req = createRequire(import.meta.url);
let hasNaprsCanvas = false;
try { req('@napi-rs/canvas'); hasNaprsCanvas = true; } catch {}

if (hasNaprsCanvas) {
  await protocol('with canvas', {}, true);
} else {
  console.log('✓ protocol (with canvas): skipped (@napi-rs/canvas optional dependency not installed)');
}
await protocol('without canvas', { PES_NO_CANVAS: '1' }, false);

// 2. the Node module equals the Gallery page on every hand-written case
const page = load(process.argv[2]);
const node = createRequire(import.meta.url)(solverCjs)(undefined);
const nodeCall = async (payload) => JSON.parse(await node['ai_edge_gallery_get_result'](JSON.stringify(payload)));
let compared = 0;
for (const [input, , opts = {}] of CASES) {
  if (opts.skip) continue;
  const payload = opts.solve_for ? { equation: input, solve_for: opts.solve_for } : { equation: input };
  const a = await page(payload);
  const b = await nodeCall(payload);
  compared++;
  check((a.result ?? a.error) === (b.result ?? b.error), 'parity: ' + JSON.stringify(input).slice(0, 70));
}
console.log((bad ? '' : '✓ ') + 'parity: ' + compared + ' cases give the same text through the Node module and the Gallery page');
process.exit(bad ? 1 : 0);
